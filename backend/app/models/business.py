"""Business domain models (CLAUDE.md §7).

The onboarding pipeline deliberately separates the *pre-auth* submission from
the *live* entity:

    BusinessApplication  ──(admin approves)──►  Business + auth account
    (no Supabase account)                        (magic-link activation)

* ``BusinessApplication`` — a submission stored **without** any auth account.
  It carries the business details, owner details, location, tourism categories,
  its uploaded ``BusinessDocument`` rows, and its ``BusinessVerification``.
* ``Business`` — the live, ownable, publicly-visible entity. Created only when
  an application (or claim) is approved. Carries the ✔ Verified badge.
* ``BusinessOwner`` — links a ``Business`` to the ``User`` accounts that manage
  it. Initially just the owner; future-ready for multi-staff teams.
* ``BusinessClaim`` — someone asserting ownership of a business already listed
  on WapiKE. Same approval → activation shape as an application.

Verification runs behind a service layer (``app.services.verification``) so an
official eCitizen BRS integration can replace the manual review later without
changing this schema or the onboarding flow.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.category import Category
    from app.models.user import User


# --- Enums ------------------------------------------------------------------

class BusinessType(str, enum.Enum):
    sole_proprietorship = "sole_proprietorship"
    partnership = "partnership"
    limited_company = "limited_company"
    ngo = "ngo"
    cbo = "cbo"
    cooperative = "cooperative"
    other = "other"


class ApplicationStatus(str, enum.Enum):
    """Lifecycle of a business application (spec steps 1-3)."""

    submitted = "submitted"
    pending_verification = "pending_verification"
    verified = "verified"
    verification_failed = "verification_failed"
    pending_approval = "pending_approval"
    more_info_requested = "more_info_requested"
    approved = "approved"
    rejected = "rejected"


class BusinessStatus(str, enum.Enum):
    """Lifecycle of a *live* business. Only ``approved`` businesses may publish
    listings; ``suspended`` businesses are hidden and blocked."""

    approved = "approved"
    suspended = "suspended"


class VerificationStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    failed = "failed"


class DocumentType(str, enum.Enum):
    registration_certificate = "registration_certificate"
    business_logo = "business_logo"
    cover_image = "cover_image"
    national_id = "national_id"
    business_permit = "business_permit"
    tourism_licence = "tourism_licence"
    # Generic proof-of-ownership upload used by the claim flow.
    ownership_proof = "ownership_proof"


class ClaimStatus(str, enum.Enum):
    pending = "pending"
    more_info_requested = "more_info_requested"
    approved = "approved"
    rejected = "rejected"


class OwnerRole(str, enum.Enum):
    owner = "owner"
    manager = "manager"
    staff = "staff"


# --- Application (pre-auth submission) --------------------------------------

class BusinessApplication(Base):
    __tablename__ = "business_applications"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )

    # ACCOUNT — the email the future business account will use. No password and
    # NO auth account is created until an admin approves this application.
    business_email: Mapped[str] = mapped_column(String(255), nullable=False)

    # BUSINESS DETAILS
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    registration_number: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    business_type: Mapped[BusinessType] = mapped_column(
        Enum(BusinessType, name="business_type"), nullable=False
    )
    kra_pin: Mapped[str | None] = mapped_column(String(50), nullable=True)
    year_established: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # OWNER DETAILS
    owner_full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_national_id: Mapped[str] = mapped_column(String(50), nullable=False)
    owner_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    owner_email: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_phone_verified: Mapped[bool] = mapped_column(
        nullable=False, default=False, server_default="false"
    )

    # LOCATION
    county: Mapped[str | None] = mapped_column(String(100), nullable=True)
    town: Mapped[str | None] = mapped_column(String(100), nullable=True)
    physical_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)

    # TOURISM DETAILS
    primary_category_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    secondary_category_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )

    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus, name="application_status"),
        nullable=False,
        default=ApplicationStatus.submitted,
        server_default=ApplicationStatus.submitted.value,
    )

    # Admin review outcome.
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Set once approved and a live Business is created.
    business_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("businesses.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    verification: Mapped[BusinessVerification | None] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
        uselist=False,
    )
    documents: Mapped[list[BusinessDocument]] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
        foreign_keys="BusinessDocument.application_id",
    )


# --- Verification (service-layer output; manual now, BRS later) -------------

class BusinessVerification(Base):
    __tablename__ = "business_verifications"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_applications.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    # "manual" today; e.g. "ecitizen_brs" once integrated.
    provider: Mapped[str] = mapped_column(
        String(50), nullable=False, default="manual", server_default="manual"
    )
    status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status"),
        nullable=False,
        default=VerificationStatus.pending,
        server_default=VerificationStatus.pending.value,
    )

    # Fields a real BRS lookup returns (all nullable; populated when available).
    verified_registration_number: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    verified_business_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    registration_status: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    verified_business_type: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    registration_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    director_info: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True
    )
    raw_response: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True
    )

    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    application: Mapped[BusinessApplication] = relationship(
        back_populates="verification"
    )


# --- Documents (attach to an application OR a claim) ------------------------

class BusinessDocument(Base):
    __tablename__ = "business_documents"
    __table_args__ = (
        CheckConstraint(
            "(application_id IS NOT NULL) <> (claim_id IS NOT NULL)",
            name="ck_business_documents_one_parent",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    application_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_applications.id", ondelete="CASCADE"),
        nullable=True,
    )
    claim_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_claims.id", ondelete="CASCADE"), nullable=True
    )
    doc_type: Mapped[DocumentType] = mapped_column(
        Enum(DocumentType, name="document_type"), nullable=False
    )
    # Supabase Storage location: private bucket for sensitive docs (ID, cert),
    # public bucket for logo/cover.
    bucket: Mapped[str] = mapped_column(String(100), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    content_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    application: Mapped[BusinessApplication | None] = relationship(
        back_populates="documents", foreign_keys=[application_id]
    )


# --- Live business + ownership ----------------------------------------------

class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    registration_number: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    business_type: Mapped[BusinessType] = mapped_column(
        Enum(BusinessType, name="business_type"), nullable=False
    )
    kra_pin: Mapped[str | None] = mapped_column(String(50), nullable=True)
    year_established: Mapped[int | None] = mapped_column(Integer, nullable=True)

    primary_category_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    secondary_category_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )

    county: Mapped[str | None] = mapped_column(String(100), nullable=True)
    town: Mapped[str | None] = mapped_column(String(100), nullable=True)
    physical_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)

    logo_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(
        String(1000), nullable=True
    )

    status: Mapped[BusinessStatus] = mapped_column(
        Enum(BusinessStatus, name="business_status"),
        nullable=False,
        default=BusinessStatus.approved,
        server_default=BusinessStatus.approved.value,
    )
    # The ✔ Verified Business badge. Set true when the business was approved
    # through the verification pipeline.
    is_verified: Mapped[bool] = mapped_column(
        nullable=False, default=False, server_default="false"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    owners: Mapped[list[BusinessOwner]] = relationship(
        back_populates="business", cascade="all, delete-orphan"
    )


class BusinessOwner(Base):
    __tablename__ = "business_owners"
    __table_args__ = (
        UniqueConstraint("business_id", "user_id", name="uq_business_owner"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[OwnerRole] = mapped_column(
        Enum(OwnerRole, name="owner_role"),
        nullable=False,
        default=OwnerRole.owner,
        server_default=OwnerRole.owner.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    business: Mapped[Business] = relationship(back_populates="owners")
    user: Mapped[User] = relationship(back_populates="business_memberships")


# --- Claim an existing business ---------------------------------------------

class BusinessClaim(Base):
    __tablename__ = "business_claims"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False
    )

    # Claimant contact — they may not yet have an account (that's the point of
    # claiming). An auth account is created only if the claim is approved.
    claimant_email: Mapped[str] = mapped_column(String(255), nullable=False)
    claimant_name: Mapped[str] = mapped_column(String(255), nullable=False)
    claimant_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    claimant_national_id: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[ClaimStatus] = mapped_column(
        Enum(ClaimStatus, name="claim_status"),
        nullable=False,
        default=ClaimStatus.pending,
        server_default=ClaimStatus.pending.value,
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # The user account assigned ownership on approval.
    resulting_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    documents: Mapped[list[BusinessDocument]] = relationship(
        foreign_keys="BusinessDocument.claim_id",
        cascade="all, delete-orphan",
    )
