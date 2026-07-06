"""Account and RBAC models.

Supabase Auth owns credentials. This table owns the application account type
and roles, which are server-controlled and never derived from client metadata.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class AccountType(str, enum.Enum):
    regular = "regular"
    business = "business"
    admin = "admin"


class AccountRole(str, enum.Enum):
    regular_user = "regular_user"
    business_account = "business_account"
    moderator = "moderator"
    administrator = "administrator"
    super_admin = "super_admin"


class AccountStatus(str, enum.Enum):
    active = "active"
    pending_onboarding = "pending_onboarding"
    suspended = "suspended"
    disabled = "disabled"


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    auth_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, unique=True, nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_type: Mapped[AccountType] = mapped_column(
        Enum(AccountType, name="account_type"), nullable=False
    )
    role: Mapped[AccountRole] = mapped_column(
        Enum(AccountRole, name="account_role"), nullable=False
    )
    status: Mapped[AccountStatus] = mapped_column(
        Enum(AccountStatus, name="account_status"),
        nullable=False,
        default=AccountStatus.pending_onboarding,
        server_default=AccountStatus.pending_onboarding.value,
    )
    onboarding_completed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    mfa_required: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
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
