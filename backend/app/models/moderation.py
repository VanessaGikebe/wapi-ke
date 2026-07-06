"""Listing moderation + reporting models.

- ``ModerationAction`` is the immutable audit trail of listing moderation
  (who changed a listing's status, when). Broader privileged actions
  (business approvals, admin grants) live in ``app.models.admin.AuditLog``.
- ``ListingReport`` captures a user flagging a listing as fake/suspicious.

Business claims moved to ``app.models.business`` (they now target a live
``Business``, not an ``Experience``).
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ModerationActionType(str, enum.Enum):
    approved = "approved"
    rejected = "rejected"
    flagged = "flagged"
    removed = "removed"
    restored = "restored"
    claim_approved = "claim_approved"
    claim_rejected = "claim_rejected"
    report_reviewed = "report_reviewed"
    report_dismissed = "report_dismissed"


class ReportStatus(str, enum.Enum):
    open = "open"
    reviewed = "reviewed"
    dismissed = "dismissed"


class ModerationAction(Base):
    __tablename__ = "moderation_actions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    experience_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("experiences.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[ModerationActionType] = mapped_column(
        Enum(ModerationActionType, name="moderation_action_type"),
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ListingReport(Base):
    __tablename__ = "listing_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    experience_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiences.id", ondelete="CASCADE"), nullable=False
    )
    reporter_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, name="report_status"),
        nullable=False,
        default=ReportStatus.open,
        server_default=ReportStatus.open.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
