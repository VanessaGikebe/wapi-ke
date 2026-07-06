"""Admin review of business claims.

Approving a claim is where ownership is assigned: it creates the claimant's
Supabase auth account, a live ``Business`` (from the claimed catalog listing),
links the listing's ``owner_id``, and mints an activation magic link — mirroring
the application-approval flow.
"""

from __future__ import annotations

import logging
import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_admin
from app.config import get_settings
from app.core.security import hash_password
from app.db import get_db
from app.models import (
    AccountType,
    AuditLog,
    Business,
    BusinessClaim,
    BusinessDocument,
    BusinessOwner,
    BusinessType,
    ClaimStatus,
    Experience,
    OwnerRole,
    User,
)
from app.schemas.business import DocumentUrlResponse
from app.schemas.claim import (
    ClaimDetail,
    ClaimListItem,
    ClaimReview,
    ClaimReviewResponse,
)
from app.services import supabase_admin

logger = logging.getLogger("wapike.claims")
settings = get_settings()

router = APIRouter(
    prefix="/admin/claims",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)

_DOC_EXPIRES = 120


@router.get("", response_model=list[ClaimListItem])
def list_claims(
    status_filter: ClaimStatus | None = Query(default=None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[ClaimListItem]:
    stmt = (
        select(BusinessClaim, Experience.title)
        .outerjoin(Experience, Experience.id == BusinessClaim.experience_id)
        .order_by(desc(BusinessClaim.created_at))
    )
    if status_filter is not None:
        stmt = stmt.where(BusinessClaim.status == status_filter)
    return [
        ClaimListItem(
            id=c.id,
            claimant_name=c.claimant_name,
            claimant_email=c.claimant_email,
            listing_title=title,
            status=c.status,
            created_at=c.created_at,
        )
        for c, title in db.execute(stmt.limit(limit)).all()
    ]


@router.get("/{claim_id}", response_model=ClaimDetail)
def get_claim(claim_id: UUID, db: Session = Depends(get_db)) -> ClaimDetail:
    claim = db.scalar(
        select(BusinessClaim)
        .options(joinedload(BusinessClaim.documents))
        .where(BusinessClaim.id == claim_id)
    )
    if claim is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Claim not found")
    listing = (
        db.get(Experience, claim.experience_id) if claim.experience_id else None
    )
    return ClaimDetail(
        id=claim.id,
        experience_id=claim.experience_id,
        listing_title=listing.title if listing else None,
        listing_location=listing.location if listing else None,
        claimant_name=claim.claimant_name,
        claimant_email=claim.claimant_email,
        claimant_phone=claim.claimant_phone,
        claimant_national_id=claim.claimant_national_id,
        message=claim.message,
        status=claim.status,
        review_notes=claim.review_notes,
        reviewed_at=claim.reviewed_at,
        business_id=claim.business_id,
        created_at=claim.created_at,
        documents=list(claim.documents),
    )


@router.get(
    "/{claim_id}/documents/{document_id}/url",
    response_model=DocumentUrlResponse,
)
def claim_document_url(
    claim_id: UUID,
    document_id: UUID,
    db: Session = Depends(get_db),
) -> DocumentUrlResponse:
    doc = db.get(BusinessDocument, document_id)
    if doc is None or doc.claim_id != claim_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    if not supabase_admin.is_configured():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Document viewing is not configured on the server.",
        )
    try:
        url = supabase_admin.create_signed_download_url(
            doc.bucket, doc.storage_path, expires_in=_DOC_EXPIRES
        )
    except supabase_admin.SupabaseAdminError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))
    return DocumentUrlResponse(url=url, expires_in=_DOC_EXPIRES)


@router.patch("/{claim_id}", response_model=ClaimReviewResponse)
def review_claim(
    claim_id: UUID,
    payload: ClaimReview,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> ClaimReviewResponse:
    claim = db.get(BusinessClaim, claim_id)
    if claim is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Claim not found")
    if claim.status in (ClaimStatus.approved, ClaimStatus.rejected):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This claim has already been decided."
        )

    now = datetime.now(timezone.utc)
    claim.reviewed_by = admin.id
    claim.reviewed_at = now
    claim.review_notes = payload.notes

    if payload.action == "request_info":
        claim.status = ClaimStatus.more_info_requested
        db.commit()
        return ClaimReviewResponse(
            id=claim.id, status=claim.status,
            message="Requested more information from the claimant.",
        )
    if payload.action == "reject":
        claim.status = ClaimStatus.rejected
        _audit(db, admin, "business_claim_rejected", claim.id, None)
        db.commit()
        return ClaimReviewResponse(
            id=claim.id, status=claim.status, message="Claim rejected."
        )

    # --- approve --------------------------------------------------------
    if not supabase_admin.is_configured():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Approvals require Supabase to be configured.",
        )

    experience = (
        db.get(Experience, claim.experience_id) if claim.experience_id else None
    )
    try:
        supabase_user_id, activation_link = supabase_admin.provision_account(
            claim.claimant_email,
            name=claim.claimant_name,
            account_type="business",
            redirect_to=f"{settings.frontend_url}/business/activate",
        )
    except supabase_admin.SupabaseAdminError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))

    owner_user = _upsert_business_user(db, supabase_user_id, claim)

    business = Business(
        name=experience.title if experience else claim.claimant_name,
        business_type=BusinessType.other,
        primary_category_id=experience.category_id if experience else None,
        physical_address=experience.location if experience else None,
        lat=experience.lat if experience else None,
        lng=experience.lng if experience else None,
        is_verified=True,
    )
    db.add(business)
    db.flush()

    db.add(
        BusinessOwner(
            business_id=business.id, user_id=owner_user.id, role=OwnerRole.owner
        )
    )

    # Assign ownership of the claimed catalog listing to the new account.
    if experience is not None:
        experience.owner_id = owner_user.id

    claim.status = ClaimStatus.approved
    claim.business_id = business.id
    claim.resulting_user_id = owner_user.id

    _audit(
        db,
        admin,
        "business_claim_approved",
        claim.id,
        {
            "business_id": str(business.id),
            "user_id": str(owner_user.id),
            "experience_id": str(claim.experience_id) if claim.experience_id else None,
        },
    )
    db.commit()

    logger.info(
        "Claim approved: %s — activation link: %s",
        claim.claimant_email,
        activation_link,
    )
    return ClaimReviewResponse(
        id=claim.id,
        status=claim.status,
        business_id=business.id,
        activation_link=activation_link,
        message="Approved. Ownership assigned; activation link generated.",
    )


def _upsert_business_user(
    db: Session, supabase_user_id: str, claim: BusinessClaim
) -> User:
    uid = UUID(supabase_user_id)
    user = db.get(User, uid)
    if user is None:
        user = db.scalar(select(User).where(User.email == claim.claimant_email))
    if user is None:
        user = User(
            id=uid,
            email=claim.claimant_email,
            name=claim.claimant_name,
            password_hash=hash_password(secrets.token_urlsafe(24)),
            phone=claim.claimant_phone,
            account_type=AccountType.business,
        )
        db.add(user)
        db.flush()
    else:
        user.account_type = AccountType.business
        if claim.claimant_phone and not user.phone:
            user.phone = claim.claimant_phone
    return user


def _audit(
    db: Session, actor: User, action: str, entity_id: UUID, data: dict | None
) -> None:
    db.add(
        AuditLog(
            actor_user_id=actor.id,
            action=action,
            entity_type="business_claim",
            entity_id=entity_id,
            data=data,
        )
    )
