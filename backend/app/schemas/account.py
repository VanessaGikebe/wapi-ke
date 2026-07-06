"""Schemas for accounts, business portal, and admin review."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import (
    AccountRole,
    AccountStatus,
    AccountType,
    BusinessStatus,
    ReviewStatus,
    VerificationDocumentType,
)


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    auth_user_id: UUID
    email: EmailStr
    display_name: str
    account_type: AccountType
    role: AccountRole
    status: AccountStatus
    onboarding_completed: bool
    mfa_required: bool


class DocumentInput(BaseModel):
    document_type: VerificationDocumentType
    file_name: str = Field(min_length=1, max_length=255)
    storage_path: str = Field(min_length=1, max_length=1000)
    mime_type: str | None = Field(default=None, max_length=120)


class BusinessApplicationCreate(BaseModel):
    business_name: str = Field(min_length=2, max_length=255)
    business_email: EmailStr
    business_phone: str | None = Field(default=None, max_length=80)
    category: str = Field(min_length=2, max_length=120)
    county: str = Field(min_length=2, max_length=120)
    city: str | None = Field(default=None, max_length=120)
    address: str | None = Field(default=None, max_length=500)
    owner_name: str = Field(min_length=2, max_length=255)
    owner_email: EmailStr
    owner_phone: str | None = Field(default=None, max_length=80)
    notes: str | None = None
    documents: list[DocumentInput] = Field(default_factory=list)


class BusinessApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    business_name: str
    business_email: EmailStr
    business_phone: str | None
    category: str
    county: str
    city: str | None
    address: str | None
    owner_name: str
    owner_email: EmailStr
    owner_phone: str | None
    notes: str | None
    status: ReviewStatus
    review_message: str | None
    created_business_id: UUID | None
    created_at: datetime
    updated_at: datetime


class BusinessAccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_id: UUID | None
    name: str
    email: EmailStr
    phone: str | None
    category: str
    county: str
    city: str | None
    address: str | None
    status: BusinessStatus
    verification_provider: str
    verification_reference: str | None
    created_at: datetime
    updated_at: datetime


class BusinessClaimCreate(BaseModel):
    business_id: UUID
    claimant_name: str = Field(min_length=2, max_length=255)
    claimant_email: EmailStr
    claimant_phone: str | None = Field(default=None, max_length=80)
    message: str | None = None
    documents: list[DocumentInput] = Field(default_factory=list)


class BusinessClaimOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    business_id: UUID
    claimant_name: str
    claimant_email: EmailStr
    claimant_phone: str | None
    message: str | None
    status: ReviewStatus
    review_message: str | None
    created_at: datetime
    updated_at: datetime


class ReviewDecision(BaseModel):
    action: str = Field(pattern="^(approve|reject|request_more_info)$")
    message: str | None = None


class MagicLinkRequest(BaseModel):
    email: EmailStr


class PortalLoginResponse(BaseModel):
    message: str


class AdminCreateRequest(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=255)
    role: AccountRole = AccountRole.administrator


class AdminInvitationOut(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    activation_link: str | None
