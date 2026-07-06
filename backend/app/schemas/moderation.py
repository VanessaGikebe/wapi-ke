"""Schemas for listing moderation (admin) + business listings + reports.

Business-claim schemas moved to the dedicated claim flow (claims now target a
live ``Business``) and are rebuilt in a later phase.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.models import (
    ListingStatus,
    ModerationActionType,
    ReportStatus,
)


# --- Listings (admin + manager views) ---------------------------------------

class ListingOut(BaseModel):
    id: UUID
    title: str
    category_slug: str
    location: str | None = None
    image_url: str | None = None
    price_tier: int
    status: ListingStatus
    owner_id: UUID | None = None
    rating: float | None = None


class ListingStatusUpdate(BaseModel):
    status: ListingStatus
    note: str | None = Field(default=None, max_length=1000)


class ListingCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    category_slug: str
    description: str | None = None
    location: str | None = Field(default=None, max_length=200)
    latitude: float | None = None
    longitude: float | None = None
    price_tier: int = Field(default=2, ge=1, le=4)
    image_url: str | None = Field(default=None, max_length=1000)
    attributes: dict[str, Any] = Field(default_factory=dict)


class ListingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    location: str | None = Field(default=None, max_length=200)
    latitude: float | None = None
    longitude: float | None = None
    price_tier: int | None = Field(default=None, ge=1, le=4)
    image_url: str | None = Field(default=None, max_length=1000)
    attributes: dict[str, Any] | None = None


# --- Reports ----------------------------------------------------------------

class ReportCreate(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)


class ReportOut(BaseModel):
    id: UUID
    experience_id: UUID
    experience_title: str | None = None
    reason: str
    reporter_email: str | None = None
    status: ReportStatus
    created_at: datetime


class ReportUpdate(BaseModel):
    status: ReportStatus


# --- Audit trail ------------------------------------------------------------

class ModerationActionOut(BaseModel):
    id: UUID
    actor_email: str | None = None
    experience_id: UUID | None = None
    experience_title: str | None = None
    action: ModerationActionType
    note: str | None = None
    created_at: datetime
