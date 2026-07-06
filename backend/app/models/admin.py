"""Administrator RBAC models: admin role tiers, invitations, and the audit log.

Admins are **never** created by the public. An admin account exists only when:

1. the bootstrap CLI / seed script creates the first super admin, or
2. a super admin invites someone — an ``AdminInvitation`` is issued and the
   auth account is created only when they accept the one-time magic link.

The *tier* of an admin is stored here (``AdminRoleAssignment``), separate from
``users.account_type`` (which is simply ``admin``). This keeps grant metadata
(who granted it, when) auditable and makes future multi-role support cheap.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.user import User


class AdminRole(str, enum.Enum):
    """Admin tiers, ordered from least to most privileged.

    * ``moderator``     — review reports, review claims, approve listings.
    * ``administrator`` — everything a moderator can do + manage users,
      businesses, categories, and the homepage.
    * ``super_admin``   — everything + create/delete admins, assign roles,
      manage platform settings.

    ``RANK`` gives an ordering so guards can require a *minimum* tier.
    """

    moderator = "moderator"
    administrator = "administrator"
    super_admin = "super_admin"

    @property
    def rank(self) -> int:
        return _ADMIN_ROLE_RANK[self]


_ADMIN_ROLE_RANK: dict[AdminRole, int] = {
    AdminRole.moderator: 1,
    AdminRole.administrator: 2,
    AdminRole.super_admin: 3,
}


class InvitationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    expired = "expired"
    revoked = "revoked"


class AdminRoleAssignment(Base):
    """Maps an admin user to their tier. One row per admin account."""

    __tablename__ = "admin_roles"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    role: Mapped[AdminRole] = mapped_column(
        Enum(AdminRole, name="admin_role"), nullable=False
    )
    # Who granted this tier (null for the bootstrap/seed super admin).
    granted_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(
        back_populates="admin_role_assignment", foreign_keys=[user_id]
    )


class AdminInvitation(Base):
    """A super-admin's invitation for a new admin. The auth account is created
    only when the invitee accepts the one-time magic link (24h expiry)."""

    __tablename__ = "admin_invitations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role: Mapped[AdminRole] = mapped_column(
        Enum(AdminRole, name="admin_role"), nullable=False
    )
    # SHA-256 of the single-use activation token; the raw token is emailed once
    # and never stored.
    token_hash: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False
    )
    status: Mapped[InvitationStatus] = mapped_column(
        Enum(InvitationStatus, name="invitation_status"),
        nullable=False,
        default=InvitationStatus.pending,
        server_default=InvitationStatus.pending.value,
    )
    invited_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AuditLog(Base):
    """Immutable, general-purpose audit trail across the platform.

    Unlike ``moderation_actions`` (scoped to listing moderation), this records
    *any* privileged action — business approvals, admin invitations, role
    grants, suspensions — as ``(actor, action, entity_type, entity_id, data)``.
    """

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
