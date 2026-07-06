"""Event routes: public reads + admin CRUD.

Public reads automatically hide archived and expired events. "Expired" means the
event's end (or start, if no end) fell before the start of today, so an event
stays listed through the end of its day.

Admin writes (create / update / delete — which cover feature + archive) require
an authenticated administrator.
"""

from __future__ import annotations

import math
from datetime import date, datetime, time, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.api.deps import get_current_admin_account
from app.core.event_status import compute_status
from app.core.slug import slugify
from app.db import get_db
from app.models import Account, Event, EventStatus
from app.schemas.event import (
    EventCreate,
    EventOut,
    EventUpdate,
    PaginatedEvents,
)

router = APIRouter(prefix="/events", tags=["events"])


# --- query helpers ----------------------------------------------------------

def _effective_end() -> ColumnElement:
    return func.coalesce(Event.end_datetime, Event.start_datetime)


def _not_archived() -> ColumnElement[bool]:
    return Event.status != EventStatus.archived


def _not_expired() -> ColumnElement[bool]:
    # Visible through the end of the event's (end-or-start) day.
    return _effective_end() >= func.date_trunc("day", func.now())


def _search_clause(term: str) -> ColumnElement[bool]:
    like = f"%{term.strip()}%"
    return or_(
        Event.title.ilike(like),
        Event.venue.ilike(like),
        Event.county.ilike(like),
        Event.category.ilike(like),
        Event.organizer.ilike(like),
    )


def _unique_slug(db: Session, base: str, exclude_id: UUID | None = None) -> str:
    """Return `base`, or `base-2`, `base-3`, … so slugs stay unique."""
    candidate = base
    suffix = 2
    while True:
        stmt = select(Event.id).where(Event.slug == candidate)
        if exclude_id is not None:
            stmt = stmt.where(Event.id != exclude_id)
        if db.scalar(stmt) is None:
            return candidate
        candidate = f"{base}-{suffix}"
        suffix += 1


# --- public reads -----------------------------------------------------------

@router.get("", response_model=PaginatedEvents)
def list_events(
    category: str | None = Query(default=None),
    county: str | None = Query(default=None),
    date: date | None = Query(default=None),
    q: str | None = Query(default=None, description="Search across event fields"),
    featured: bool | None = Query(default=None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> PaginatedEvents:
    """Paginated events — non-archived, non-expired, with optional filters."""
    stmt = select(Event).where(_not_archived(), _not_expired())

    if category:
        stmt = stmt.where(Event.category.ilike(category))
    if county:
        stmt = stmt.where(Event.county.ilike(county))
    if featured is not None:
        stmt = stmt.where(Event.featured.is_(featured))
    if q:
        stmt = stmt.where(_search_clause(q))
    if date is not None:
        # Events active on that calendar day (UTC day bounds).
        day_start = datetime.combine(date, time.min, tzinfo=timezone.utc)
        day_end = datetime.combine(date, time.max, tzinfo=timezone.utc)
        stmt = stmt.where(
            Event.start_datetime <= day_end,
            _effective_end() >= day_start,
        )

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = list(
        db.scalars(
            stmt.order_by(Event.start_datetime, Event.id)
            .offset((page - 1) * limit)
            .limit(limit)
        ).all()
    )
    return PaginatedEvents(
        items=[EventOut.model_validate(e) for e in items],
        total=total,
        page=page,
        limit=limit,
        pages=math.ceil(total / limit) if total else 0,
    )


@router.get("/upcoming", response_model=list[EventOut])
def upcoming_events(
    limit: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
) -> list[EventOut]:
    events = db.scalars(
        select(Event)
        .where(_not_archived(), _effective_end() >= func.now())
        .order_by(Event.start_datetime, Event.id)
        .limit(limit)
    ).all()
    return [EventOut.model_validate(e) for e in events]


@router.get("/featured", response_model=list[EventOut])
def featured_events(
    limit: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
) -> list[EventOut]:
    events = db.scalars(
        select(Event)
        .where(Event.featured.is_(True), _not_archived(), _not_expired())
        .order_by(Event.start_datetime, Event.id)
        .limit(limit)
    ).all()
    return [EventOut.model_validate(e) for e in events]


@router.get("/{slug}", response_model=EventOut)
def get_event(slug: str, db: Session = Depends(get_db)) -> EventOut:
    event = db.scalar(
        select(Event).where(Event.slug == slug, _not_archived())
    )
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )
    return EventOut.model_validate(event)


# --- admin CRUD -------------------------------------------------------------

@router.post(
    "", response_model=EventOut, status_code=status.HTTP_201_CREATED
)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    _admin: Account = Depends(get_current_admin_account),
) -> EventOut:
    base_slug = slugify(payload.slug or payload.title)
    event = Event(
        title=payload.title,
        slug=_unique_slug(db, base_slug),
        description=payload.description,
        category=payload.category,
        venue=payload.venue,
        county=payload.county,
        city=payload.city,
        address=payload.address,
        latitude=payload.latitude,
        longitude=payload.longitude,
        image_url=payload.image_url,
        organizer=payload.organizer,
        contact=payload.contact,
        ticket_url=payload.ticket_url,
        ticket_price=payload.ticket_price,
        currency=payload.currency or "KES",
        start_datetime=payload.start_datetime,
        end_datetime=payload.end_datetime,
        featured=payload.featured,
        status=payload.status
        or compute_status(payload.start_datetime, payload.end_datetime),
        source="manual",
        source_uid=None,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return EventOut.model_validate(event)


@router.patch("/{event_id}", response_model=EventOut)
def update_event(
    event_id: UUID,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    _admin: Account = Depends(get_current_admin_account),
) -> EventOut:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    data = payload.model_dump(exclude_unset=True)
    if "slug" in data and data["slug"]:
        data["slug"] = _unique_slug(db, slugify(data["slug"]), event.id)
    for key, value in data.items():
        setattr(event, key, value)

    db.commit()
    db.refresh(event)
    return EventOut.model_validate(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    _admin: Account = Depends(get_current_admin_account),
) -> None:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )
    db.delete(event)
    db.commit()
