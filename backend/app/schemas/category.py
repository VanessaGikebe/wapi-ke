"""Pydantic v2 schemas for categories and their filter definitions."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models import FilterType


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    hero_image: str | None = None
    icon: str | None = None


class FilterDefinitionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    key: str
    label: str
    type: FilterType
    options: dict[str, Any] | None = None
