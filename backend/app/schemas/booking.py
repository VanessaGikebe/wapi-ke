"""Pydantic v2 schemas for bookings and favorites (account views)."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models import Booking, Experience, Favorite


class ExperienceSummary(BaseModel):
    """Compact experience info for account lists / booking confirmations."""

    id: UUID
    title: str
    location: str | None
    price_tier: int
    category_slug: str
    attributes: dict[str, Any]

    @classmethod
    def from_experience(cls, experience: Experience) -> "ExperienceSummary":
        return cls(
            id=experience.id,
            title=experience.title,
            location=experience.location,
            price_tier=experience.price_tier,
            category_slug=experience.category.slug,
            attributes=experience.attributes,
        )


class BookingCreateRequest(BaseModel):
    experience_id: UUID
    requested_date: date | None = None


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    requested_date: date | None
    created_at: datetime
    experience: ExperienceSummary

    @classmethod
    def from_booking(cls, booking: Booking) -> "BookingOut":
        return cls(
            id=booking.id,
            status=booking.status.value,
            requested_date=booking.requested_date,
            created_at=booking.created_at,
            experience=ExperienceSummary.from_experience(booking.experience),
        )


class FavoriteOut(BaseModel):
    created_at: datetime
    experience: ExperienceSummary

    @classmethod
    def from_favorite(cls, favorite: Favorite) -> "FavoriteOut":
        return cls(
            created_at=favorite.created_at,
            experience=ExperienceSummary.from_experience(favorite.experience),
        )
