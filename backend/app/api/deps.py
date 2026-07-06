"""Shared FastAPI dependencies.

Authentication accepts **Supabase JWTs** (verified against the project's JWKS)
and, as a transition/back-compat fallback, legacy app-issued access tokens. A
Supabase user is mirrored into the local ``users`` table (keyed by the Supabase
user id) so existing FK-based features (favorites, bookings) keep working.
"""

from __future__ import annotations

import functools
import secrets
from typing import Any
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.security import ACCESS_TOKEN_TYPE, decode_token, hash_password
from app.db import get_db
from app.models import AccountType, AdminRole, User

settings = get_settings()

# auto_error=False so we can raise a consistent 401 (not 403) ourselves.
bearer_scheme = HTTPBearer(auto_error=False)

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


@functools.lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient | None:
    if not settings.supabase_jwks_url:
        return None
    # PyJWKClient caches keys internally and refreshes on unknown kid.
    return PyJWKClient(settings.supabase_jwks_url)


def _verify_supabase_token(token: str) -> dict[str, Any] | None:
    """Return verified Supabase claims, or None if it isn't a valid one."""
    client = _jwks_client()
    if client is None:
        return None
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            options={"verify_aud": True},
        )
    except Exception:  # noqa: BLE001 — any failure -> not a Supabase token
        return None


def _resolve_supabase_user(db: Session, claims: dict[str, Any]) -> User:
    """Find or create the local mirror of a Supabase user (keyed by its id)."""
    try:
        user_id = UUID(str(claims.get("sub")))
    except (ValueError, TypeError):
        raise _CREDENTIALS_EXC

    user = db.get(User, user_id)
    if user is not None:
        return user

    email = claims.get("email")
    meta = claims.get("user_metadata") or {}
    name = (
        meta.get("full_name")
        or meta.get("name")
        or (email.split("@")[0] if email else "Explorer")
    )

    if email:
        existing = db.scalar(select(User).where(User.email == email))
        if existing is not None:
            return existing

    user = User(
        id=user_id,
        email=email or f"{user_id}@users.supabase",
        name=name,
        password_hash=hash_password(secrets.token_urlsafe(24)),
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        user = db.scalar(select(User).where(User.email == email)) if email else None
        if user is None:
            raise _CREDENTIALS_EXC
    return user


def _resolve_legacy_user(db: Session, token: str) -> User:
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise _CREDENTIALS_EXC
    if payload.get("type") != ACCESS_TOKEN_TYPE:
        raise _CREDENTIALS_EXC
    subject = payload.get("sub")
    if not subject:
        raise _CREDENTIALS_EXC
    try:
        user_id = UUID(subject)
    except (ValueError, TypeError):
        raise _CREDENTIALS_EXC
    user = db.get(User, user_id)
    if user is None:
        raise _CREDENTIALS_EXC
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated user from a Supabase (or legacy) Bearer token."""
    if credentials is None:
        raise _CREDENTIALS_EXC

    token = credentials.credentials

    claims = _verify_supabase_token(token)
    if claims is not None and claims.get("sub"):
        user = _resolve_supabase_user(db, claims)
    else:
        user = _resolve_legacy_user(db, token)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )
    return user


# --- Role-based access control (RBAC) ---------------------------------------
#
# Authorization is enforced *server-side* only. There are three separate
# account types (``AccountType``); admins additionally carry a tier
# (``AdminRole``) stored in the ``admin_roles`` table. Never trust a role sent
# by the client.


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require an administrator account (any admin tier). 403 otherwise."""
    if current_user.account_type != AccountType.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )
    return current_user


def admin_role_of(user: User) -> AdminRole | None:
    """Return the admin tier for an admin account, or ``None``."""
    return user.admin_role


def require_admin_role(minimum: AdminRole):
    """Dependency factory: require an admin whose tier is at least ``minimum``.

    Tiers are ordered moderator < administrator < super_admin, so
    ``require_admin_role(AdminRole.administrator)`` also admits super admins.
    """

    def _dependency(current_user: User = Depends(get_current_admin)) -> User:
        tier = admin_role_of(current_user)
        if tier is None or tier.rank < minimum.rank:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {minimum.value} privileges or higher.",
            )
        return current_user

    return _dependency


# Convenience dependencies for the three admin tiers.
require_moderator = require_admin_role(AdminRole.moderator)
require_administrator = require_admin_role(AdminRole.administrator)
require_super_admin = require_admin_role(AdminRole.super_admin)


def get_current_business(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require a business account. Admins do NOT pass — admins manage
    businesses through the admin portal, not the business routes."""
    if current_user.account_type != AccountType.business:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Business account required",
        )
    return current_user
