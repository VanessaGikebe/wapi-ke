"""Administrator moderation API (all routes require an administrator).

Listings can be approved / flagged / removed / re-queued; every change is
recorded in the audit trail. Reports (fake/suspicious flags) and business
claims are reviewed here too — approving a claim assigns listing ownership.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_admin
from app.db import get_db
from app.models import (
    Experience,
    ListingReport,
    ListingStatus,
    ModerationAction,
    ModerationActionType,
    ReportStatus,
    User,
)
from app.schemas.moderation import (
    ListingOut,
    ListingStatusUpdate,
    ModerationActionOut,
    ReportOut,
    ReportUpdate,
)

router = APIRouter(
    prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)]
)

_STATUS_ACTION = {
    ListingStatus.approved: ModerationActionType.approved,
    ListingStatus.flagged: ModerationActionType.flagged,
    ListingStatus.removed: ModerationActionType.removed,
    ListingStatus.pending: ModerationActionType.restored,
}


def _listing_out(exp: Experience) -> ListingOut:
    rating = exp.attributes.get("rating") if exp.attributes else None
    return ListingOut(
        id=exp.id,
        title=exp.title,
        category_slug=exp.category.slug,
        location=exp.location,
        image_url=(exp.images or [None])[0],
        price_tier=exp.price_tier,
        status=exp.status,
        owner_id=exp.owner_id,
        rating=float(rating) if isinstance(rating, (int, float)) else None,
    )


def _record(
    db: Session,
    actor: User,
    action: ModerationActionType,
    experience_id: UUID | None,
    note: str | None,
) -> None:
    db.add(
        ModerationAction(
            actor_id=actor.id,
            experience_id=experience_id,
            action=action,
            note=note,
        )
    )


# --- Listings ---------------------------------------------------------------

@router.get("/listings", response_model=list[ListingOut])
def list_listings(
    status_filter: ListingStatus | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[ListingOut]:
    stmt = select(Experience).options(joinedload(Experience.category))
    if status_filter is not None:
        stmt = stmt.where(Experience.status == status_filter)
    if q:
        stmt = stmt.where(Experience.title.ilike(f"%{q.strip()}%"))
    rows = db.scalars(
        stmt.order_by(Experience.title).limit(limit)
    ).all()
    return [_listing_out(e) for e in rows]


@router.patch("/listings/{listing_id}", response_model=ListingOut)
def update_listing_status(
    listing_id: UUID,
    payload: ListingStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> ListingOut:
    exp = db.scalar(
        select(Experience)
        .options(joinedload(Experience.category))
        .where(Experience.id == listing_id)
    )
    if exp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    exp.status = payload.status
    _record(db, admin, _STATUS_ACTION[payload.status], exp.id, payload.note)
    db.commit()
    db.refresh(exp)
    return _listing_out(exp)


# --- Reports ----------------------------------------------------------------

@router.get("/reports", response_model=list[ReportOut])
def list_reports(
    status_filter: ReportStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
) -> list[ReportOut]:
    stmt = (
        select(ListingReport, Experience.title, User.email)
        .join(Experience, Experience.id == ListingReport.experience_id)
        .outerjoin(User, User.id == ListingReport.reporter_id)
        .order_by(desc(ListingReport.created_at))
    )
    if status_filter is not None:
        stmt = stmt.where(ListingReport.status == status_filter)
    return [
        ReportOut(
            id=r.id,
            experience_id=r.experience_id,
            experience_title=title,
            reason=r.reason,
            reporter_email=email,
            status=r.status,
            created_at=r.created_at,
        )
        for r, title, email in db.execute(stmt).all()
    ]


@router.patch("/reports/{report_id}", response_model=ReportOut)
def update_report(
    report_id: UUID,
    payload: ReportUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> ReportOut:
    report = db.get(ListingReport, report_id)
    if report is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")
    report.status = payload.status
    action = (
        ModerationActionType.report_dismissed
        if payload.status == ReportStatus.dismissed
        else ModerationActionType.report_reviewed
    )
    _record(db, admin, action, report.experience_id, None)
    db.commit()
    exp = db.get(Experience, report.experience_id)
    reporter = db.get(User, report.reporter_id) if report.reporter_id else None
    return ReportOut(
        id=report.id,
        experience_id=report.experience_id,
        experience_title=exp.title if exp else None,
        reason=report.reason,
        reporter_email=reporter.email if reporter else None,
        status=report.status,
        created_at=report.created_at,
    )


# NOTE: Business claim review moved to the dedicated business-claim flow
# (claims now target a live ``Business``, not an ``Experience``) and is rebuilt
# in a later phase alongside business applications.


# --- Audit trail ------------------------------------------------------------

@router.get("/audit", response_model=list[ModerationActionOut])
def audit_trail(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[ModerationActionOut]:
    stmt = (
        select(ModerationAction, User.email, Experience.title)
        .outerjoin(User, User.id == ModerationAction.actor_id)
        .outerjoin(Experience, Experience.id == ModerationAction.experience_id)
        .order_by(desc(ModerationAction.created_at))
        .limit(limit)
    )
    return [
        ModerationActionOut(
            id=a.id,
            actor_email=email,
            experience_id=a.experience_id,
            experience_title=title,
            action=a.action,
            note=a.note,
            created_at=a.created_at,
        )
        for a, email, title in db.execute(stmt).all()
    ]
