"""Pydantic v2 schemas for events (read, admin write, paginated list)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models import EventStatus


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    slug: str
    description: str | None = None
    category: str | None = None
    venue: str | None = None
    county: str | None = None
    city: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    image_url: str | None = None
    organizer: str | None = None
    contact: str | None = None
    ticket_url: str | None = None
    ticket_price: float | None = None
    currency: str
    start_datetime: datetime
    end_datetime: datetime | None = None
    featured: bool
    status: EventStatus
    created_at: datetime
    updated_at: datetime


class PaginatedEvents(BaseModel):
    items: list[EventOut]
    total: int
    page: int
    limit: int
    pages: int


class EventCreate(BaseModel):
    """Admin create payload. Only title + start_datetime are required."""

    title: str = Field(min_length=1, max_length=300)
    start_datetime: datetime
    slug: str | None = Field(default=None, max_length=320)
    description: str | None = None
    category: str | None = Field(default=None, max_length=100)
    venue: str | None = Field(default=None, max_length=255)
    county: str | None = Field(default=None, max_length=120)
    city: str | None = Field(default=None, max_length=120)
    address: str | None = Field(default=None, max_length=500)
    latitude: float | None = None
    longitude: float | None = None
    image_url: str | None = Field(default=None, max_length=1000)
    organizer: str | None = Field(default=None, max_length=255)
    contact: str | None = Field(default=None, max_length=255)
    ticket_url: str | None = Field(default=None, max_length=1000)
    ticket_price: float | None = Field(default=None, ge=0)
    currency: str = Field(default="KES", max_length=3)
    end_datetime: datetime | None = None
    featured: bool = False
    status: EventStatus | None = None


class EventUpdate(BaseModel):
    """Admin partial update — every field optional."""

    title: str | None = Field(default=None, min_length=1, max_length=300)
    slug: str | None = Field(default=None, max_length=320)
    description: str | None = None
    category: str | None = Field(default=None, max_length=100)
    venue: str | None = Field(default=None, max_length=255)
    county: str | None = Field(default=None, max_length=120)
    city: str | None = Field(default=None, max_length=120)
    address: str | None = Field(default=None, max_length=500)
    latitude: float | None = None
    longitude: float | None = None
    image_url: str | None = Field(default=None, max_length=1000)
    organizer: str | None = Field(default=None, max_length=255)
    contact: str | None = Field(default=None, max_length=255)
    ticket_url: str | None = Field(default=None, max_length=1000)
    ticket_price: float | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=3)
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None
    featured: bool | None = None
    status: EventStatus | None = None
