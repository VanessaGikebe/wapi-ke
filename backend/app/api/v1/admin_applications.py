"""Admin review of business applications (spec: Business Verification).

An administrator reviews the submitted details + uploaded documents and either
approves, rejects, or requests more information. **Approval** is the only place
a business auth account comes into existence:

    approve → create Supabase auth account → mint activation magic link
            → create live Business + owner link → mark application approved

Until then no Supabase account exists. In development the magic link is
returned (and logged) so an admin can copy it; production emails it (Resend).
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
    ApplicationStatus,
    AuditLog,
    Business,
    BusinessApplication,
    BusinessDocument,
    BusinessOwner,
    DocumentType,
    OwnerRole,
    User,
    VerificationStatus,
)
from app.schemas.business import (
    ApplicationDetail,
    ApplicationListItem,
    ApplicationReview,
    ApplicationReviewResponse,
    DocumentUrlResponse,
)
from app.services import supabase_admin

logger = logging.getLogger("wapike.applications")
settings = get_settings()

router = APIRouter(
    prefix="/admin/applications",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)

_DOC_EXPIRES = 120  # seconds for a private-document signed URL


@router.get("", response_model=list[ApplicationListItem])
def list_applications(
    status_filter: ApplicationStatus | None = Query(default=None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[BusinessApplication]:
    stmt = select(BusinessApplication).order_by(
        desc(BusinessApplication.created_at)
    )
    if status_filter is not None:
        stmt = stmt.where(BusinessApplication.status == status_filter)
    return list(db.scalars(stmt.limit(limit)).all())


@router.get("/{application_id}", response_model=ApplicationDetail)
def get_application(
    application_id: UUID,
    db: Session = Depends(get_db),
) -> BusinessApplication:
    app_row = db.scalar(
        select(BusinessApplication)
        .options(
            joinedload(BusinessApplication.documents),
            joinedload(BusinessApplication.verification),
        )
        .where(BusinessApplication.id == application_id)
    )
    if app_row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    return app_row


@router.get(
    "/{application_id}/documents/{document_id}/url",
    response_model=DocumentUrlResponse,
)
def document_url(
    application_id: UUID,
    document_id: UUID,
    db: Session = Depends(get_db),
) -> DocumentUrlResponse:
    """A short-lived signed URL for an admin to view a (private) document."""

    doc = db.get(BusinessDocument, document_id)
    if doc is None or doc.application_id != application_id:
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


@router.patch("/{application_id}", response_model=ApplicationReviewResponse)
def review_application(
    application_id: UUID,
    payload: ApplicationReview,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> ApplicationReviewResponse:
    app_row = db.scalar(
        select(BusinessApplication)
        .options(
            joinedload(BusinessApplication.documents),
            joinedload(BusinessApplication.verification),
        )
        .where(BusinessApplication.id == application_id)
    )
    if app_row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    if app_row.status in (ApplicationStatus.approved, ApplicationStatus.rejected):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This application has already been decided."
        )

    now = datetime.now(timezone.utc)
    app_row.reviewed_by = admin.id
    app_row.reviewed_at = now
    app_row.review_notes = payload.notes

    if payload.action == "request_info":
        app_row.status = ApplicationStatus.more_info_requested
        db.commit()
        return ApplicationReviewResponse(
            id=app_row.id,
            status=app_row.status,
            message="Requested more information from the applicant.",
        )

    if payload.action == "reject":
        app_row.status = ApplicationStatus.rejected
        if app_row.verification is not None:
            app_row.verification.status = VerificationStatus.failed
        _audit(db, admin, "business_application_rejected", app_row.id, None)
        db.commit()
        return ApplicationReviewResponse(
            id=app_row.id,
            status=app_row.status,
            message="Application rejected.",
        )

    # --- approve --------------------------------------------------------
    if not supabase_admin.is_configured():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Approvals require Supabase to be configured (auth account + magic "
            "link).",
        )

    try:
        supabase_user_id, activation_link = supabase_admin.provision_account(
            app_row.business_email,
            name=app_row.owner_full_name,
            account_type="business",
            redirect_to=f"{settings.frontend_url}/business/activate",
        )
    except supabase_admin.SupabaseAdminError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))

    owner_user = _upsert_business_user(db, supabase_user_id, app_row)

    business = Business(
        name=app_row.business_name,
        registration_number=app_row.registration_number,
        business_type=app_row.business_type,
        kra_pin=app_row.kra_pin,
        year_established=app_row.year_established,
        primary_category_id=app_row.primary_category_id,
        secondary_category_id=app_row.secondary_category_id,
        county=app_row.county,
        town=app_row.town,
        physical_address=app_row.physical_address,
        lat=app_row.lat,
        lng=app_row.lng,
        logo_url=_public_doc_url(app_row, DocumentType.business_logo),
        cover_image_url=_public_doc_url(app_row, DocumentType.cover_image),
        is_verified=True,
    )
    db.add(business)
    db.flush()

    db.add(
        BusinessOwner(
            business_id=business.id,
            user_id=owner_user.id,
            role=OwnerRole.owner,
        )
    )

    app_row.status = ApplicationStatus.approved
    app_row.business_id = business.id
    if app_row.verification is not None:
        app_row.verification.status = VerificationStatus.verified
        app_row.verification.reviewed_by = admin.id
        app_row.verification.reviewed_at = now

    _audit(
        db,
        admin,
        "business_application_approved",
        app_row.id,
        {"business_id": str(business.id), "user_id": str(owner_user.id)},
    )
    db.commit()

    # Dev email substitute: surface the activation link (also emailed later).
    logger.info(
        "Business approved: %s — activation link: %s",
        app_row.business_email,
        activation_link,
    )

    return ApplicationReviewResponse(
        id=app_row.id,
        status=app_row.status,
        business_id=business.id,
        activation_link=activation_link,
        message="Approved. Activation link generated for the business owner.",
    )


def _upsert_business_user(
    db: Session, supabase_user_id: str, app_row: BusinessApplication
) -> User:
    """Ensure a local ``users`` mirror exists for the new business owner,
    keyed by the Supabase user id so the auth bridge resolves it on login."""

    uid = UUID(supabase_user_id)
    user = db.get(User, uid)
    if user is None:
        user = db.scalar(
            select(User).where(User.email == app_row.business_email)
        )
    if user is None:
        user = User(
            id=uid,
            email=app_row.business_email,
            name=app_row.owner_full_name or app_row.business_name,
            password_hash=hash_password(secrets.token_urlsafe(24)),
            phone=app_row.owner_phone,
            account_type=AccountType.business,
        )
        db.add(user)
        db.flush()
    else:
        user.account_type = AccountType.business
        if app_row.owner_phone and not user.phone:
            user.phone = app_row.owner_phone
    return user


def _public_doc_url(
    app_row: BusinessApplication, doc_type: DocumentType
) -> str | None:
    for doc in app_row.documents:
        if doc.doc_type == doc_type:
            return supabase_admin.public_url(doc.bucket, doc.storage_path)
    return None


def _audit(
    db: Session,
    actor: User,
    action: str,
    entity_id: UUID,
    data: dict | None,
) -> None:
    db.add(
        AuditLog(
            actor_user_id=actor.id,
            action=action,
            entity_type="business_application",
            entity_id=entity_id,
            data=data,
        )
    )
