"""Admin Businesses API — the live, approved businesses on WapiKE.

Separate from applications (which are *pending*). Admins can view, suspend,
archive, or reopen a business, inspect its verification documents, and review
its ownership history.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db import get_db
from app.models import (
    AuditLog,
    Business,
    BusinessApplication,
    BusinessClaim,
    BusinessDocument,
    BusinessOwner,
    BusinessStatus,
    Experience,
    OwnerRole,
    User,
)
from app.schemas.admin_business import (
    AdminBusinessDetail,
    AdminBusinessListItem,
    BusinessAction,
    BusinessActionResponse,
    BusinessDocumentsResponse,
    OwnershipHistoryItem,
)
from app.schemas.business import DocumentOut, DocumentUrlResponse
from app.services import supabase_admin

router = APIRouter(
    prefix="/admin/businesses",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)

_DOC_EXPIRES = 120
_ACTION_STATUS = {
    "suspend": BusinessStatus.suspended,
    "archive": BusinessStatus.archived,
    "reopen": BusinessStatus.approved,
}


def _primary_owner(db: Session, business_id: UUID) -> User | None:
    return db.scalar(
        select(User)
        .join(BusinessOwner, BusinessOwner.user_id == User.id)
        .where(
            BusinessOwner.business_id == business_id,
            BusinessOwner.role == OwnerRole.owner,
        )
        .limit(1)
    )


def _listing_count(db: Session, owner: User | None) -> int:
    if owner is None:
        return 0
    return (
        db.scalar(
            select(func.count(Experience.id)).where(
                Experience.owner_id == owner.id
            )
        )
        or 0
    )


def _source(db: Session, business_id: UUID) -> str:
    if db.scalar(
        select(BusinessApplication.id).where(
            BusinessApplication.business_id == business_id
        )
    ):
        return "application"
    if db.scalar(
        select(BusinessClaim.id).where(BusinessClaim.business_id == business_id)
    ):
        return "claim"
    return "unknown"


def _list_item(db: Session, biz: Business) -> AdminBusinessListItem:
    owner = _primary_owner(db, biz.id)
    return AdminBusinessListItem(
        id=biz.id,
        name=biz.name,
        business_type=biz.business_type,
        status=biz.status,
        is_verified=biz.is_verified,
        verified_at=biz.created_at,
        owner_name=owner.name if owner else None,
        owner_email=owner.email if owner else None,
        owner_phone=owner.phone if owner else None,
        town=biz.town,
        county=biz.county,
        listing_count=_listing_count(db, owner),
    )


@router.get("", response_model=list[AdminBusinessListItem])
def list_businesses(
    status_filter: BusinessStatus | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[AdminBusinessListItem]:
    stmt = select(Business).order_by(desc(Business.created_at))
    if status_filter is not None:
        stmt = stmt.where(Business.status == status_filter)
    if q:
        stmt = stmt.where(Business.name.ilike(f"%{q.strip()}%"))
    return [_list_item(db, b) for b in db.scalars(stmt.limit(limit)).all()]


@router.get("/{business_id}", response_model=AdminBusinessDetail)
def get_business(
    business_id: UUID, db: Session = Depends(get_db)
) -> AdminBusinessDetail:
    biz = db.get(Business, business_id)
    if biz is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Business not found")
    base = _list_item(db, biz)
    return AdminBusinessDetail(
        **base.model_dump(),
        registration_number=biz.registration_number,
        kra_pin=biz.kra_pin,
        physical_address=biz.physical_address,
        source=_source(db, biz.id),
    )


@router.patch("/{business_id}", response_model=BusinessActionResponse)
def business_action(
    business_id: UUID,
    payload: BusinessAction,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> BusinessActionResponse:
    biz = db.get(Business, business_id)
    if biz is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Business not found")
    biz.status = _ACTION_STATUS[payload.action]
    db.add(
        AuditLog(
            actor_user_id=admin.id,
            action=f"business_{payload.action}",
            entity_type="business",
            entity_id=biz.id,
            note=payload.note,
        )
    )
    db.commit()
    db.refresh(biz)
    return BusinessActionResponse(
        id=biz.id, status=biz.status, message=f"Business {payload.action}d."
    )


def _business_documents(db: Session, business_id: UUID) -> tuple[str, list[BusinessDocument]]:
    """Documents from the application or claim that produced this business."""
    app_row = db.scalar(
        select(BusinessApplication).where(
            BusinessApplication.business_id == business_id
        )
    )
    if app_row is not None:
        docs = db.scalars(
            select(BusinessDocument).where(
                BusinessDocument.application_id == app_row.id
            )
        ).all()
        return "application", list(docs)
    claim = db.scalar(
        select(BusinessClaim).where(BusinessClaim.business_id == business_id)
    )
    if claim is not None:
        docs = db.scalars(
            select(BusinessDocument).where(
                BusinessDocument.claim_id == claim.id
            )
        ).all()
        return "claim", list(docs)
    return "unknown", []


@router.get("/{business_id}/documents", response_model=BusinessDocumentsResponse)
def business_documents(
    business_id: UUID, db: Session = Depends(get_db)
) -> BusinessDocumentsResponse:
    if db.get(Business, business_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Business not found")
    source, docs = _business_documents(db, business_id)
    return BusinessDocumentsResponse(
        source=source, documents=[DocumentOut.model_validate(d) for d in docs]
    )


@router.get(
    "/{business_id}/documents/{document_id}/url",
    response_model=DocumentUrlResponse,
)
def business_document_url(
    business_id: UUID, document_id: UUID, db: Session = Depends(get_db)
) -> DocumentUrlResponse:
    doc = db.get(BusinessDocument, document_id)
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    if not supabase_admin.is_configured():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Not configured."
        )
    try:
        url = supabase_admin.create_signed_download_url(
            doc.bucket, doc.storage_path, expires_in=_DOC_EXPIRES
        )
    except supabase_admin.SupabaseAdminError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))
    return DocumentUrlResponse(url=url, expires_in=_DOC_EXPIRES)


@router.get(
    "/{business_id}/ownership-history",
    response_model=list[OwnershipHistoryItem],
)
def ownership_history(
    business_id: UUID, db: Session = Depends(get_db)
) -> list[OwnershipHistoryItem]:
    if db.get(Business, business_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Business not found")
    source = _source(db, business_id)
    rows = db.execute(
        select(BusinessOwner, User)
        .join(User, User.id == BusinessOwner.user_id)
        .where(BusinessOwner.business_id == business_id)
        .order_by(BusinessOwner.created_at)
    ).all()
    return [
        OwnershipHistoryItem(
            user_name=u.name,
            user_email=u.email,
            role=o.role.value,
            since=o.created_at,
            source=source,
        )
        for o, u in rows
    ]
