"""Pydantic v2 schemas for the business onboarding pipeline.

Covers the public application submission + document upload flow and the admin
review/approval flow. The *pre-auth* application deliberately carries no
password and creates no auth account — that happens only on admin approval
(see ``app.api.v1.admin_applications``).
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import (
    ApplicationStatus,
    BusinessType,
    DocumentType,
    VerificationStatus,
)

# --- Public: submit an application ------------------------------------------


class ApplicationCreate(BaseModel):
    """A new-business application (spec: List a New Business). No account is
    created; the submission is stored as a pending application."""

    # ACCOUNT — the email the future business account will use.
    business_email: EmailStr

    # BUSINESS DETAILS
    business_name: str = Field(min_length=2, max_length=255)
    business_type: BusinessType
    registration_number: str | None = Field(default=None, max_length=100)
    kra_pin: str | None = Field(default=None, max_length=50)
    year_established: int | None = Field(default=None, ge=1800, le=2100)

    # OWNER DETAILS
    owner_full_name: str = Field(min_length=2, max_length=255)
    owner_national_id: str = Field(min_length=3, max_length=50)
    owner_phone: str = Field(min_length=7, max_length=32)
    owner_email: EmailStr

    # LOCATION
    county: str | None = Field(default=None, max_length=100)
    town: str | None = Field(default=None, max_length=100)
    physical_address: str | None = None
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)

    # TOURISM DETAILS — categories are referenced by slug (matches the public
    # categories API); resolved to ids server-side.
    primary_category_slug: str = Field(min_length=1, max_length=120)
    secondary_category_slug: str | None = Field(default=None, max_length=120)


class ApplicationSubmitResponse(BaseModel):
    """Returned right after submission so the applicant can track status and
    attach documents."""

    id: UUID
    status: ApplicationStatus
    message: str


# --- Public: document upload (pre-account, via signed URLs) -----------------


class SignedUploadRequest(BaseModel):
    doc_type: DocumentType
    filename: str = Field(min_length=1, max_length=255)
    content_type: str | None = Field(default=None, max_length=100)


class SignedUploadResponse(BaseModel):
    """Everything the browser needs to upload directly to Supabase Storage via
    ``uploadToSignedUrl`` (no auth session required — the token is the
    capability)."""

    bucket: str
    path: str
    token: str
    is_private: bool


class RecordDocumentRequest(BaseModel):
    """Confirm an upload the backend minted a token for, persisting the row."""

    doc_type: DocumentType
    bucket: str = Field(min_length=1, max_length=100)
    storage_path: str = Field(min_length=1, max_length=500)
    original_filename: str | None = Field(default=None, max_length=255)
    content_type: str | None = Field(default=None, max_length=100)


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    doc_type: DocumentType
    bucket: str
    original_filename: str | None = None
    content_type: str | None = None
    uploaded_at: datetime


# --- Public: status echo (reference-gated) ----------------------------------


class ApplicationStatusOut(BaseModel):
    """Minimal public status view for the "application received" screen."""

    id: UUID
    business_name: str
    status: ApplicationStatus
    review_notes: str | None = None
    created_at: datetime


# --- Admin: review + approval -----------------------------------------------


class VerificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    provider: str
    status: VerificationStatus
    verified_registration_number: str | None = None
    verified_business_name: str | None = None
    registration_status: str | None = None
    notes: str | None = None


class ApplicationListItem(BaseModel):
    """Row in the admin applications queue."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    business_name: str
    business_email: EmailStr
    business_type: BusinessType
    owner_full_name: str
    county: str | None = None
    town: str | None = None
    status: ApplicationStatus
    created_at: datetime


class ApplicationDetail(BaseModel):
    """Full application view for the admin review screen."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    business_email: EmailStr
    business_name: str
    business_type: BusinessType
    registration_number: str | None = None
    kra_pin: str | None = None
    year_established: int | None = None
    owner_full_name: str
    owner_national_id: str
    owner_phone: str
    owner_email: EmailStr
    county: str | None = None
    town: str | None = None
    physical_address: str | None = None
    lat: float | None = None
    lng: float | None = None
    primary_category_id: UUID | None = None
    secondary_category_id: UUID | None = None
    status: ApplicationStatus
    review_notes: str | None = None
    reviewed_at: datetime | None = None
    business_id: UUID | None = None
    created_at: datetime
    documents: list[DocumentOut] = []
    verification: VerificationOut | None = None


class DocumentUrlResponse(BaseModel):
    """Short-lived signed URL for an admin to view a private document."""

    url: str
    expires_in: int


class ApplicationReview(BaseModel):
    """Admin decision on an application."""

    action: str = Field(pattern="^(approve|reject|request_info)$")
    notes: str | None = Field(default=None, max_length=2000)


class ApplicationReviewResponse(BaseModel):
    id: UUID
    status: ApplicationStatus
    business_id: UUID | None = None
    # In development (no email provider) the activation magic link is returned
    # so an admin can copy it; in production it is emailed instead.
    activation_link: str | None = None
    message: str
