"""Schemas for the admin Businesses page (approved/live businesses)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models import BusinessStatus, BusinessType
from app.schemas.business import DocumentOut


class AdminBusinessListItem(BaseModel):
    id: UUID
    name: str
    business_type: BusinessType
    status: BusinessStatus
    is_verified: bool
    verified_at: datetime  # created_at — a business is verified when created
    owner_name: str | None = None
    owner_email: str | None = None
    owner_phone: str | None = None
    town: str | None = None
    county: str | None = None
    listing_count: int = 0


class AdminBusinessDetail(AdminBusinessListItem):
    registration_number: str | None = None
    kra_pin: str | None = None
    physical_address: str | None = None
    source: str  # "application" | "claim" | "unknown"


class BusinessAction(BaseModel):
    action: str = Field(pattern="^(suspend|archive|reopen)$")
    note: str | None = Field(default=None, max_length=1000)


class BusinessActionResponse(BaseModel):
    id: UUID
    status: BusinessStatus
    message: str


class OwnershipHistoryItem(BaseModel):
    user_name: str | None = None
    user_email: str | None = None
    role: str
    since: datetime
    source: str


class BusinessDocumentsResponse(BaseModel):
    source: str
    documents: list[DocumentOut] = []
