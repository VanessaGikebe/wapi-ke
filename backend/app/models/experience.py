"""Experience model (CLAUDE.md §7)."""

from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Enum, Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.category import Category
    from app.models.user import User


class ListingStatus(str, enum.Enum):
    """Moderation state of a listing. Only `approved` shows publicly."""

    pending = "pending"
    approved = "approved"
    flagged = "flagged"
    removed = "removed"


class Experience(Base):
    __tablename__ = "experiences"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # JSONB array of image URLs.
    images: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list
    )
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    price_tier: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # Keyed by filter `key`; the values filters match against.
    attributes: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict
    )
    # Moderation + ownership.
    status: Mapped[ListingStatus] = mapped_column(
        Enum(ListingStatus, name="listing_status"),
        nullable=False,
        default=ListingStatus.approved,
        server_default=ListingStatus.approved.value,
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # The live Business this listing belongs to (assigned on approval / claim).
    # Nullable during the transition and for legacy/seed listings.
    business_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("businesses.id", ondelete="SET NULL"), nullable=True
    )

    category: Mapped[Category] = relationship(back_populates="experiences")
    owner: Mapped[User | None] = relationship()
