"""Pydantic v2 schemas for experiences + paginated listings."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models import Experience


class ExperienceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category_id: UUID
    category_slug: str
    title: str
    description: str | None = None
    images: list[str]
    location: str | None = None
    lat: float | None = None
    lng: float | None = None
    price_tier: int
    attributes: dict[str, Any]

    @classmethod
    def from_experience(cls, experience: Experience) -> "ExperienceOut":
        return cls(
            id=experience.id,
            category_id=experience.category_id,
            category_slug=experience.category.slug,
            title=experience.title,
            description=experience.description,
            images=experience.images,
            location=experience.location,
            lat=experience.lat,
            lng=experience.lng,
            price_tier=experience.price_tier,
            attributes=experience.attributes,
        )


class PaginatedExperiences(BaseModel):
    items: list[ExperienceOut]
    total: int
    page: int
    limit: int
    pages: int
