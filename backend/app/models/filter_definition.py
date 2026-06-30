"""FilterDefinition model (CLAUDE.md §7)."""

from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.category import Category


class FilterType(str, enum.Enum):
    """How a filter is rendered + matched on the frontend."""

    enum = "enum"
    range = "range"
    boolean = "boolean"


class FilterDefinition(Base):
    __tablename__ = "filter_definitions"
    __table_args__ = (
        UniqueConstraint("category_id", "key", name="uq_filter_category_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    label: Mapped[str] = mapped_column(String(150), nullable=False)
    type: Mapped[FilterType] = mapped_column(
        Enum(FilterType, name="filter_type"), nullable=False
    )
    # For enum: {"values": [...]}. For range: {"min", "max", "step", "unit", ...}.
    options: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    category: Mapped[Category] = relationship(back_populates="filters")
