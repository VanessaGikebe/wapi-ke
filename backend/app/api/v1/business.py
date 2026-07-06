"""Business portal routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_business_account
from app.db import get_db
from app.models import (
    Account,
    BusinessAccount,
    BusinessApplication,
    BusinessClaim,
    ReviewStatus,
    VerificationDocument,
)
from app.schemas.account import (
    BusinessAccountOut,
    BusinessApplicationCreate,
    BusinessApplicationOut,
    BusinessClaimCreate,
    BusinessClaimOut,
    PortalLoginResponse,
    MagicLinkRequest,
)
from app.services import supabase_auth
from app.config import get_settings

settings = get_settings()

router = APIRouter(prefix="/business", tags=["business"])


@router.post(
    "/applications",
    response_model=BusinessApplicationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_business_application(
    payload: BusinessApplicationCreate,
    db: Session = Depends(get_db),
) -> BusinessApplication:
    application = BusinessApplication(
        business_name=payload.business_name,
        business_email=str(payload.business_email),
        business_phone=payload.business_phone,
        category=payload.category,
        county=payload.county,
        city=payload.city,
        address=payload.address,
        owner_name=payload.owner_name,
        owner_email=str(payload.owner_email),
        owner_phone=payload.owner_phone,
        notes=payload.notes,
        status=ReviewStatus.pending_verification,
    )
    db.add(application)
    db.flush()
    for doc in payload.documents:
        db.add(
            VerificationDocument(
                application_id=application.id,
                document_type=doc.document_type,
                file_name=doc.file_name,
                storage_path=doc.storage_path,
                mime_type=doc.mime_type,
            )
        )
    db.commit()
    db.refresh(application)
    return application


@router.get("/directory", response_model=list[BusinessAccountOut])
def search_businesses(
    q: str = Query(default="", max_length=120),
    limit: int = Query(default=10, ge=1, le=25),
    db: Session = Depends(get_db),
) -> list[BusinessAccount]:
    stmt = select(BusinessAccount).order_by(BusinessAccount.name).limit(limit)
    term = q.strip()
    if term:
        like = f"%{term}%"
        stmt = stmt.where(
            or_(
                BusinessAccount.name.ilike(like),
                BusinessAccount.email.ilike(like),
                BusinessAccount.city.ilike(like),
                BusinessAccount.county.ilike(like),
            )
        )
    return list(db.scalars(stmt).all())


@router.post(
    "/claims",
    response_model=BusinessClaimOut,
    status_code=status.HTTP_201_CREATED,
)
def create_business_claim(
    payload: BusinessClaimCreate,
    db: Session = Depends(get_db),
) -> BusinessClaim:
    if db.get(BusinessAccount, payload.business_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )
    claim = BusinessClaim(
        business_id=payload.business_id,
        claimant_name=payload.claimant_name,
        claimant_email=str(payload.claimant_email),
        claimant_phone=payload.claimant_phone,
        message=payload.message,
        status=ReviewStatus.pending_verification,
    )
    db.add(claim)
    db.flush()
    for doc in payload.documents:
        db.add(
            VerificationDocument(
                claim_id=claim.id,
                business_id=payload.business_id,
                document_type=doc.document_type,
                file_name=doc.file_name,
                storage_path=doc.storage_path,
                mime_type=doc.mime_type,
            )
        )
    db.commit()
    db.refresh(claim)
    return claim


@router.post("/magic-link", response_model=PortalLoginResponse)
def business_magic_link(payload: MagicLinkRequest) -> PortalLoginResponse:
    redirect = f"{settings.site_url.rstrip('/')}/auth/callback?next=/business/dashboard"
    supabase_auth.generate_magic_link(str(payload.email), redirect)
    return PortalLoginResponse(
        message="If this business account exists, an access link has been sent."
    )


@router.get("/me", response_model=BusinessAccountOut)
def get_business_me(
    account: Account = Depends(get_current_business_account),
    db: Session = Depends(get_db),
) -> BusinessAccount:
    business = db.scalar(
        select(BusinessAccount).where(BusinessAccount.account_id == account.id)
    )
    if business is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business account not found",
        )
    return business


@router.post("/onboarding/complete", response_model=BusinessAccountOut)
def complete_business_onboarding(
    account: Account = Depends(get_current_business_account),
    db: Session = Depends(get_db),
) -> BusinessAccount:
    business = db.scalar(
        select(BusinessAccount).where(BusinessAccount.account_id == account.id)
    )
    if business is None:
        raise HTTPException(status_code=404, detail="Business account not found")
    account.onboarding_completed = True
    db.commit()
    db.refresh(business)
    return business
