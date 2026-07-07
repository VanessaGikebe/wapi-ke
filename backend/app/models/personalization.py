"""Personalization profile and behavior signals for discovery."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.experience import Experience
    from app.models.user import User


class InteractionType(str, enum.Enum):
    search = "search"
    view = "view"
    save = "save"
    booking = "booking"
    review = "review"
    dwell = "dwell"
    filter = "filter"
    not_interested = "not_interested"
    # Engagement signals that only originate client-side (no dedicated backend
    # endpoint) — logged through POST /personalization/interactions.
    directions = "directions"
    share = "share"


class UserPreferenceProfile(Base):
    __tablename__ = "user_preference_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    interests: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    categories: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    budget_tiers: Mapped[list[int]] = mapped_column(JSONB, nullable=False, default=list)
    vibes: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    preferences: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict
    )
    # Behaviour-derived preference scores, recomputed from interaction_events
    # (see app.services.recommendations.update_preference_scores). Shape:
    # {"categories": {slug: float}, "vibes": {name: float}, "budgets": {tier: float}}.
    # These evolve from what the user actually does and gradually outweigh the
    # onboarding answers above as behaviour accumulates.
    behavior_scores: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default="{}"
    )
    # How many interaction_events currently fold into behavior_scores. Drives
    # how far the onboarding answers get down-weighted over time.
    behavior_events_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    scores_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_onboarding: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship()


class UserInteraction(Base):
    __tablename__ = "user_interactions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    interaction_type: Mapped[InteractionType] = mapped_column(
        Enum(InteractionType, name="interaction_type"), nullable=False
    )
    experience_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("experiences.id", ondelete="CASCADE"), nullable=True, index=True
    )
    category_slug: Mapped[str | None] = mapped_column(String(120), nullable=True)
    search_query: Mapped[str | None] = mapped_column(String(500), nullable=True)
    weight: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    context: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship()
    experience: Mapped[Experience | None] = relationship()
