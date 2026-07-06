"""Pydantic v2 schemas for the business claim flow.

A claimant asserts ownership of an existing catalog listing (``experiences``).
No auth account is created until an admin approves the claim — at which point a
live ``Business`` is created and the listing's ownership is assigned.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import ClaimStatus
from app.schemas.business import DocumentOut

# --- Public: search the catalog --------------------------------------------


class BusinessSearchItem(BaseModel):
    """A catalog listing that can be claimed."""

    id: UUID
    title: str
    location: str | None = None
    category_slug: str
    image_url: str | None = None


# --- Public: submit a claim -------------------------------------------------


class ClaimCreate(BaseModel):
    experience_id: UUID
    claimant_name: str = Field(min_length=2, max_length=255)
    claimant_email: EmailStr
    claimant_phone: str | None = Field(default=None, max_length=32)
    claimant_national_id: str | None = Field(default=None, max_length=50)
    message: str | None = Field(default=None, max_length=2000)


class ClaimSubmitResponse(BaseModel):
    id: UUID
    status: ClaimStatus
    message: str


class ClaimStatusOut(BaseModel):
    id: UUID
    listing_title: str | None = None
    status: ClaimStatus
    review_notes: str | None = None
    created_at: datetime


# --- Admin: review ----------------------------------------------------------


class ClaimListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    claimant_name: str
    claimant_email: EmailStr
    listing_title: str | None = None
    status: ClaimStatus
    created_at: datetime


class ClaimDetail(BaseModel):
    id: UUID
    experience_id: UUID | None = None
    listing_title: str | None = None
    listing_location: str | None = None
    claimant_name: str
    claimant_email: EmailStr
    claimant_phone: str | None = None
    claimant_national_id: str | None = None
    message: str | None = None
    status: ClaimStatus
    review_notes: str | None = None
    reviewed_at: datetime | None = None
    business_id: UUID | None = None
    created_at: datetime
    documents: list[DocumentOut] = []


class ClaimReview(BaseModel):
    action: str = Field(pattern="^(approve|reject|request_info)$")
    notes: str | None = Field(default=None, max_length=2000)


class ClaimReviewResponse(BaseModel):
    id: UUID
    status: ClaimStatus
    business_id: UUID | None = None
    activation_link: str | None = None
    message: str
