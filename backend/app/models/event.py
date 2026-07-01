"""Event model + status enum.

Events are first-class, DB-backed records (not derived from experiences). They
carry their own taxonomy (`category`, `county`, …) and lifecycle (`status`).

`source` + `source_uid` give every ingested event a stable identity so the
ingestion pipeline can upsert idempotently (update-in-place, never duplicate).
Admin-created events leave `source` NULL / "manual".
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class EventStatus(str, enum.Enum):
    """Lifecycle of an event."""

    upcoming = "upcoming"
    ongoing = "ongoing"
    ended = "ended"
    archived = "archived"


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (
        # One row per (source, source_uid) — the idempotency key for ingestion.
        UniqueConstraint("source", "source_uid", name="uq_event_source_uid"),
        Index("ix_events_start_datetime", "start_datetime"),
        Index("ix_events_status", "status"),
        Index("ix_events_county", "county"),
        Index("ix_events_category", "category"),
        Index("ix_events_featured", "featured"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    slug: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    venue: Mapped[str | None] = mapped_column(String(255), nullable=True)
    county: Mapped[str | None] = mapped_column(String(120), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    organizer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ticket_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    ticket_price: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="KES", server_default="KES"
    )

    start_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    end_datetime: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    featured: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus, name="event_status"),
        nullable=False,
        default=EventStatus.upcoming,
        server_default=EventStatus.upcoming.value,
    )

    # Ingestion provenance (NULL for manual/admin events).
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source_uid: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
