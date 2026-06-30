"""Category model (CLAUDE.md §7)."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.experience import Experience
    from app.models.filter_definition import FilterDefinition


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    hero_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(100), nullable=True)

    filters: Mapped[list[FilterDefinition]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="FilterDefinition.id",
    )
    experiences: Mapped[list[Experience]] = relationship(
        back_populates="category", cascade="all, delete-orphan"
    )
