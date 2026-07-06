"""Administrator portal routes and review workflows."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_account, get_current_super_admin_account
from app.config import get_settings
from app.db import get_db
from app.models import (
    Account,
    AccountRole,
    AccountStatus,
    AccountType,
    AdminInvitation,
    BusinessAccount,
    BusinessApplication,
    BusinessClaim,
    BusinessOwnershipHistory,
    BusinessStatus,
    ReviewStatus,
)
from app.schemas.account import (
    AccountOut,
    AdminCreateRequest,
    AdminInvitationOut,
    BusinessAccountOut,
    BusinessApplicationOut,
    BusinessClaimOut,
    MagicLinkRequest,
    PortalLoginResponse,
    ReviewDecision,
)
from app.services import supabase_auth
from app.services.audit import log_admin_action
from app.services.verification import get_verification_provider

settings = get_settings()

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/magic-link", response_model=PortalLoginResponse)
def admin_magic_link(
    payload: MagicLinkRequest,
    db: Session = Depends(get_db),
) -> PortalLoginResponse:
    account = db.scalar(
        select(Account).where(
            Account.email == str(payload.email),
            Account.account_type == AccountType.admin,
        )
    )
    if account is not None:
        redirect = f"{settings.site_url.rstrip('/')}/auth/callback?next=/admin/dashboard"
        supabase_auth.generate_magic_link(str(payload.email), redirect)
    return PortalLoginResponse(
        message="If an administrator account exists, an access link has been sent."
    )


@router.get("/me", response_model=AccountOut)
def admin_me(account: Account = Depends(get_current_admin_account)) -> Account:
    return account


@router.get("/business-applications", response_model=list[BusinessApplicationOut])
def list_business_applications(
    _admin: Account = Depends(get_current_admin_account),
    db: Session = Depends(get_db),
) -> list[BusinessApplication]:
    return list(
        db.scalars(
            select(BusinessApplication).order_by(
                BusinessApplication.created_at.desc()
            )
        ).all()
    )


@router.get("/business-claims", response_model=list[BusinessClaimOut])
def list_business_claims(
    _admin: Account = Depends(get_current_admin_account),
    db: Session = Depends(get_db),
) -> list[BusinessClaim]:
    return list(
        db.scalars(
            select(BusinessClaim).order_by(BusinessClaim.created_at.desc())
        ).all()
    )


@router.get("/businesses", response_model=list[BusinessAccountOut])
def list_admin_businesses(
    _admin: Account = Depends(get_current_admin_account),
    db: Session = Depends(get_db),
) -> list[BusinessAccount]:
    return list(
        db.scalars(select(BusinessAccount).order_by(BusinessAccount.name)).all()
    )


@router.post(
    "/business-applications/{application_id}/review",
    response_model=BusinessApplicationOut,
)
def review_business_application(
    application_id: UUID,
    payload: ReviewDecision,
    admin: Account = Depends(get_current_admin_account),
    db: Session = Depends(get_db),
) -> BusinessApplication:
    application = db.get(BusinessApplication, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.status == ReviewStatus.approved:
        raise HTTPException(status_code=409, detail="Application already approved")

    now = datetime.now(timezone.utc)
    application.reviewed_by_account_id = admin.id
    application.reviewed_at = now
    application.review_message = payload.message

    if payload.action == "reject":
        application.status = ReviewStatus.rejected
        log_admin_action(
            db,
            actor_account_id=admin.id,
            action="business_application.rejected",
            subject_type="business_application",
            subject_id=application.id,
        )
    elif payload.action == "request_more_info":
        application.status = ReviewStatus.more_info_requested
        log_admin_action(
            db,
            actor_account_id=admin.id,
            action="business_application.more_info_requested",
            subject_type="business_application",
            subject_id=application.id,
        )
    else:
        verification = get_verification_provider().verify_application(
            str(application.id)
        )
        if not verification.passed:
            raise HTTPException(status_code=422, detail=verification.notes)
        redirect = (
            f"{settings.site_url.rstrip()}/auth/callback"
            "?next=/business/dashboard"
        )
        provisioned = supabase_auth.invite_user(
            email=application.owner_email,
            redirect_to=redirect,
            metadata={
                "account_type": "business",
                "business_name": application.business_name,
            },
        )
        account = Account(
            auth_user_id=provisioned.auth_user_id,
            email=application.owner_email,
            display_name=application.owner_name,
            account_type=AccountType.business,
            role=AccountRole.business_account,
            status=AccountStatus.pending_onboarding,
            onboarding_completed=False,
        )
        db.add(account)
        db.flush()
        business = BusinessAccount(
            account_id=account.id,
            name=application.business_name,
            email=application.business_email,
            phone=application.business_phone,
            category=application.category,
            county=application.county,
            city=application.city,
            address=application.address,
            status=BusinessStatus.pending_activation,
            verification_provider=verification.provider,
            verification_reference=verification.reference,
        )
        db.add(business)
        db.flush()
        db.add(
            BusinessOwnershipHistory(
                business_id=business.id,
                account_id=account.id,
                action="created_from_application",
                performed_by_account_id=admin.id,
                notes=payload.message,
            )
        )
        application.status = ReviewStatus.approved
        application.created_business_id = business.id
        log_admin_action(
            db,
            actor_account_id=admin.id,
            action="business_application.approved",
            subject_type="business_application",
            subject_id=application.id,
            metadata={"activation_link": provisioned.activation_link},
        )

    db.commit()
    db.refresh(application)
    return application


@router.post("/business-claims/{claim_id}/review", response_model=BusinessClaimOut)
def review_business_claim(
    claim_id: UUID,
    payload: ReviewDecision,
    admin: Account = Depends(get_current_admin_account),
    db: Session = Depends(get_db),
) -> BusinessClaim:
    claim = db.get(BusinessClaim, claim_id)
    if claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")
    now = datetime.now(timezone.utc)
    claim.reviewed_by_account_id = admin.id
    claim.reviewed_at = now
    claim.review_message = payload.message
    if payload.action == "approve":
        verification = get_verification_provider().verify_claim(str(claim.id))
        if not verification.passed:
            raise HTTPException(status_code=422, detail=verification.notes)
        claim.status = ReviewStatus.approved
    elif payload.action == "reject":
        claim.status = ReviewStatus.rejected
    else:
        claim.status = ReviewStatus.more_info_requested
    log_admin_action(
        db,
        actor_account_id=admin.id,
        action=f"business_claim.{payload.action}",
        subject_type="business_claim",
        subject_id=claim.id,
    )
    db.commit()
    db.refresh(claim)
    return claim


@router.post(
    "/administrators",
    response_model=AdminInvitationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_administrator(
    payload: AdminCreateRequest,
    super_admin: Account = Depends(get_current_super_admin_account),
    db: Session = Depends(get_db),
) -> AdminInvitationOut:
    if payload.role not in {
        AccountRole.moderator,
        AccountRole.administrator,
        AccountRole.super_admin,
    }:
        raise HTTPException(status_code=422, detail="Invalid administrator role")
    redirect = f"{settings.site_url.rstrip()}/auth/callback?next=/admin/dashboard"
    provisioned = supabase_auth.invite_user(
        email=str(payload.email),
        redirect_to=redirect,
        metadata={"account_type": "admin", "role": payload.role.value},
    )
    account = Account(
        auth_user_id=provisioned.auth_user_id,
        email=str(payload.email),
        display_name=payload.display_name,
        account_type=AccountType.admin,
        role=payload.role,
        status=AccountStatus.pending_onboarding,
        onboarding_completed=False,
        mfa_required=True,
    )
    db.add(account)
    db.flush()
    invitation = AdminInvitation(
        account_id=account.id,
        email=str(payload.email),
        role=payload.role.value,
        invited_by_account_id=super_admin.id,
        activation_link=provisioned.activation_link,
    )
    db.add(invitation)
    log_admin_action(
        db,
        actor_account_id=super_admin.id,
        action="administrator.invited",
        subject_type="account",
        subject_id=account.id,
    )
    db.commit()
    db.refresh(invitation)
    return AdminInvitationOut(
        id=invitation.id,
        email=invitation.email,
        role=invitation.role,
        activation_link=invitation.activation_link,
    )


@router.post("/onboarding/complete", response_model=AccountOut)
def complete_admin_onboarding(
    admin: Account = Depends(get_current_admin_account),
    db: Session = Depends(get_db),
) -> Account:
    admin.onboarding_completed = True
    admin.status = AccountStatus.active
    db.commit()
    db.refresh(admin)
    return admin
