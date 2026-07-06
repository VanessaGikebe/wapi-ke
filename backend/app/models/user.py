"""User model (CLAUDE.md §7).

There are exactly three **account types**, assigned only through the correct
onboarding flow — never self-service:

* ``user``     — a regular explorer (the default for public signup).
* ``business`` — a business account, created *only* when an admin approves a
  business application or claim (see ``app.models.business``).
* ``admin``    — a platform administrator, created *only* by a super admin,
  the seed script, or the bootstrap CLI. The admin's *tier* (moderator /
  administrator / super_admin) lives in the ``admin_roles`` table
  (``app.models.admin.AdminRoleAssignment``), not here.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.admin import AdminRole, AdminRoleAssignment
    from app.models.assistant_session import AssistantSession
    from app.models.booking import Booking
    from app.models.business import BusinessOwner
    from app.models.favorite import Favorite


class AccountType(str, enum.Enum):
    """The three separate account types. A regular ``user`` can NEVER promote
    themselves into ``business`` or ``admin`` — those are assigned server-side by
    the approval / invitation flows only."""

    user = "user"
    business = "business"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    account_type: Mapped[AccountType] = mapped_column(
        Enum(AccountType, name="account_type"),
        nullable=False,
        default=AccountType.user,
        server_default=AccountType.user.value,
    )
    # Deactivated accounts keep their data but cannot authenticate against
    # protected routes (enforced in deps.get_current_user).
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # One-to-one admin tier row (only present for admin accounts).
    admin_role_assignment: Mapped[AdminRoleAssignment | None] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
        foreign_keys="AdminRoleAssignment.user_id",
    )
    # Business memberships (owner/manager/staff). Present for business accounts.
    business_memberships: Mapped[list[BusinessOwner]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    favorites: Mapped[list[Favorite]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    bookings: Mapped[list[Booking]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    assistant_sessions: Mapped[list[AssistantSession]] = relationship(
        back_populates="user"
    )

    @property
    def admin_role(self) -> AdminRole | None:
        """The admin tier for an admin account, or ``None``. Convenience over
        ``admin_role_assignment.role`` for guards and serialization."""
        return (
            self.admin_role_assignment.role
            if self.admin_role_assignment is not None
            else None
        )
