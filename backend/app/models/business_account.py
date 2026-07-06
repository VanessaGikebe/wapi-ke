"""Business portal models: applications, claims, documents, and ownership."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ReviewStatus(str, enum.Enum):
    pending_verification = "pending_verification"
    approved = "approved"
    rejected = "rejected"
    more_info_requested = "more_info_requested"


class BusinessStatus(str, enum.Enum):
    pending_activation = "pending_activation"
    active = "active"
    suspended = "suspended"
    closed = "closed"


class VerificationDocumentType(str, enum.Enum):
    registration = "registration"
    ownership = "ownership"
    identity = "identity"
    other = "other"


class BusinessApplication(Base):
    __tablename__ = "business_applications"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    business_email: Mapped[str] = mapped_column(String(255), nullable=False)
    business_phone: Mapped[str | None] = mapped_column(String(80))
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    county: Mapped[str] = mapped_column(String(120), nullable=False)
    city: Mapped[str | None] = mapped_column(String(120))
    address: Mapped[str | None] = mapped_column(String(500))
    owner_name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_email: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_phone: Mapped[str | None] = mapped_column(String(80))
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ReviewStatus] = mapped_column(
        Enum(ReviewStatus, name="business_review_status"),
        nullable=False,
        default=ReviewStatus.pending_verification,
        server_default=ReviewStatus.pending_verification.value,
        index=True,
    )
    reviewed_by_account_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("accounts.id", ondelete="SET NULL")
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    review_message: Mapped[str | None] = mapped_column(Text)
    created_business_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_accounts.id", ondelete="SET NULL")
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


class BusinessAccount(Base):
    __tablename__ = "business_accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("accounts.id", ondelete="SET NULL"), unique=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(80))
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    county: Mapped[str] = mapped_column(String(120), nullable=False)
    city: Mapped[str | None] = mapped_column(String(120))
    address: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[BusinessStatus] = mapped_column(
        Enum(BusinessStatus, name="business_status"),
        nullable=False,
        default=BusinessStatus.pending_activation,
        server_default=BusinessStatus.pending_activation.value,
        index=True,
    )
    verification_provider: Mapped[str] = mapped_column(
        String(80), nullable=False, default="manual", server_default="manual"
    )
    verification_reference: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class BusinessClaim(Base):
    __tablename__ = "business_claims"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_accounts.id", ondelete="CASCADE"), nullable=False
    )
    claimant_name: Mapped[str] = mapped_column(String(255), nullable=False)
    claimant_email: Mapped[str] = mapped_column(String(255), nullable=False)
    claimant_phone: Mapped[str | None] = mapped_column(String(80))
    message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ReviewStatus] = mapped_column(
        Enum(ReviewStatus, name="business_claim_status"),
        nullable=False,
        default=ReviewStatus.pending_verification,
        server_default=ReviewStatus.pending_verification.value,
        index=True,
    )
    reviewed_by_account_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("accounts.id", ondelete="SET NULL")
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    review_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class VerificationDocument(Base):
    __tablename__ = "verification_documents"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    application_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_applications.id", ondelete="CASCADE")
    )
    claim_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_claims.id", ondelete="CASCADE")
    )
    business_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_accounts.id", ondelete="CASCADE")
    )
    document_type: Mapped[VerificationDocumentType] = mapped_column(
        Enum(VerificationDocumentType, name="verification_document_type"),
        nullable=False,
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(120))
    metadata_json: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class BusinessOwnershipHistory(Base):
    __tablename__ = "business_ownership_history"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_accounts.id", ondelete="CASCADE"), nullable=False
    )
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("accounts.id", ondelete="SET NULL")
    )
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    performed_by_account_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("accounts.id", ondelete="SET NULL")
    )
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
