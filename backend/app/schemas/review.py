"""Pydantic v2 schemas for platform reviews on experiences."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models import Review


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str | None = Field(default=None, max_length=2000)


class ReviewOut(BaseModel):
    id: UUID
    rating: int
    text: str | None
    author_name: str
    created_at: datetime

    @classmethod
    def from_review(cls, review: Review) -> "ReviewOut":
        return cls(
            id=review.id,
            rating=review.rating,
            text=review.text,
            author_name=review.user.name,
            created_at=review.created_at,
        )
