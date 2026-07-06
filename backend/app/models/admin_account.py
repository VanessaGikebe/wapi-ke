"""Administrator invitation and audit models."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class AdminInvitationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    revoked = "revoked"
    expired = "expired"


class AdminInvitation(Base):
    __tablename__ = "admin_invitations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("accounts.id", ondelete="SET NULL")
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[AdminInvitationStatus] = mapped_column(
        Enum(AdminInvitationStatus, name="admin_invitation_status"),
        nullable=False,
        default=AdminInvitationStatus.pending,
        server_default=AdminInvitationStatus.pending.value,
    )
    invited_by_account_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("accounts.id", ondelete="SET NULL")
    )
    activation_link: Mapped[str | None] = mapped_column(Text)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    actor_account_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("accounts.id", ondelete="SET NULL")
    )
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    subject_type: Mapped[str] = mapped_column(String(120), nullable=False)
    subject_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
