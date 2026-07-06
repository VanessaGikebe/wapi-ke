"""Schemas for discovery personalization."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.models import InteractionType
from app.schemas.event import EventOut
from app.schemas.experience import ExperienceOut


class PreferenceProfileOut(BaseModel):
    completed_onboarding: bool
    interests: list[str] = Field(default_factory=list)
    categories: list[str] = Field(default_factory=list)
    budget_tiers: list[int] = Field(default_factory=list)
    vibes: list[str] = Field(default_factory=list)
    preferences: dict[str, Any] = Field(default_factory=dict)


class PreferenceProfileIn(BaseModel):
    interests: list[str] = Field(default_factory=list, max_length=12)
    categories: list[str] = Field(default_factory=list, max_length=12)
    budget_tiers: list[int] = Field(default_factory=list, max_length=4)
    vibes: list[str] = Field(default_factory=list, max_length=8)
    preferences: dict[str, Any] = Field(default_factory=dict)


class InteractionIn(BaseModel):
    interaction_type: InteractionType
    experience_id: str | None = None
    category_slug: str | None = Field(default=None, max_length=120)
    search_query: str | None = Field(default=None, max_length=500)
    weight: int = Field(default=1, ge=1, le=20)
    context: dict[str, Any] = Field(default_factory=dict)


class RecommendationItem(BaseModel):
    kind: Literal["experience", "event"]
    reason: str
    confidence: int | None = None
    experience: ExperienceOut | None = None
    event: EventOut | None = None


class RecommendationSection(BaseModel):
    key: str
    title: str
    explanation: str
    items: list[RecommendationItem]


class RecommendationResponse(BaseModel):
    sections: list[RecommendationSection]
