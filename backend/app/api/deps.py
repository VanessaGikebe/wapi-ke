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
from app.models import Account, AccountRole, AccountStatus, AccountType, User

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


def _resolve_account_from_claims(db: Session, claims: dict[str, Any]) -> Account:
    """Resolve an application account for a Supabase JWT.

    Public self-signup is allowed only for regular users. Business and admin
    accounts must already exist, created by approval/provisioning workflows.
    """

    try:
        auth_user_id = UUID(str(claims.get("sub")))
    except (ValueError, TypeError):
        raise _CREDENTIALS_EXC

    account = db.scalar(
        select(Account).where(Account.auth_user_id == auth_user_id)
    )
    if account is not None:
        return account

    email = claims.get("email")
    if not email:
        raise _CREDENTIALS_EXC
    meta = claims.get("user_metadata") or {}
    name = (
        meta.get("full_name")
        or meta.get("name")
        or email.split("@")[0]
    )

    account = Account(
        auth_user_id=auth_user_id,
        email=email,
        display_name=name,
        account_type=AccountType.regular,
        role=AccountRole.regular_user,
        status=AccountStatus.active,
        onboarding_completed=True,
    )
    db.add(account)
    try:
        db.commit()
        db.refresh(account)
    except IntegrityError:
        db.rollback()
        account = db.scalar(select(Account).where(Account.email == email))
        if account is None:
            raise _CREDENTIALS_EXC
    return account


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
        return _resolve_supabase_user(db, claims)

    return _resolve_legacy_user(db, token)


def get_current_account(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Account:
    """Resolve the server-controlled application account for a Supabase JWT."""

    if credentials is None:
        raise _CREDENTIALS_EXC

    claims = _verify_supabase_token(credentials.credentials)
    if claims is None or not claims.get("sub"):
        raise _CREDENTIALS_EXC
    return _resolve_account_from_claims(db, claims)


def require_roles(*roles: AccountRole):
    allowed = set(roles)

    def dependency(account: Account = Depends(get_current_account)) -> Account:
        if account.status not in {
            AccountStatus.active,
            AccountStatus.pending_onboarding,
        }:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is not active",
            )
        if account.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return account

    return dependency


def get_current_business_account(
    account: Account = Depends(require_roles(AccountRole.business_account)),
) -> Account:
    return account


def get_current_admin_account(
    account: Account = Depends(
        require_roles(
            AccountRole.moderator,
            AccountRole.administrator,
            AccountRole.super_admin,
        )
    ),
) -> Account:
    return account


def get_current_super_admin_account(
    account: Account = Depends(require_roles(AccountRole.super_admin)),
) -> Account:
    return account


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require the authenticated user to be an administrator (403 otherwise)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )
    return current_user
