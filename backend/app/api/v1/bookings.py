"""Booking routes — auth-gated. v1 stub: creates a `requested` booking, no
payment processing (that's a later phase)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db import get_db
from app.models import (
    Booking,
    BookingStatus,
    Experience,
    InteractionType,
    User,
    UserInteraction,
)
from app.schemas.booking import BookingCreateRequest, BookingOut

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=BookingOut)
def create_booking(
    payload: BookingCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BookingOut:
    experience = db.scalar(
        select(Experience)
        .options(joinedload(Experience.category))
        .where(Experience.id == payload.experience_id)
    )
    if experience is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experience not found",
        )

    booking = Booking(
        user_id=current_user.id,
        experience_id=experience.id,
        status=BookingStatus.requested,
        requested_date=payload.requested_date,
    )
    db.add(booking)
    db.add(
        UserInteraction(
            user_id=current_user.id,
            interaction_type=InteractionType.booking,
            experience_id=experience.id,
            weight=12,
        )
    )
    db.commit()
    db.refresh(booking)

    # experience already loaded with its category for the response.
    booking.experience = experience
    return BookingOut.from_booking(booking)


@router.get("", response_model=list[BookingOut])
def list_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[BookingOut]:
    bookings = db.scalars(
        select(Booking)
        .options(
            joinedload(Booking.experience).joinedload(Experience.category)
        )
        .where(Booking.user_id == current_user.id)
        .order_by(Booking.created_at.desc())
    ).all()
    return [BookingOut.from_booking(b) for b in bookings]
