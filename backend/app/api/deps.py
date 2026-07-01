"""Shared FastAPI dependencies."""

from __future__ import annotations

from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import ACCESS_TOKEN_TYPE, decode_token
from app.db import get_db
from app.models import User

# auto_error=False so we can raise a consistent 401 (not 403) ourselves.
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated user from a Bearer access token.

    Raises 401 if the token is missing, malformed, expired, of the wrong type,
    or references a user that no longer exists.
    """

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credentials_exception

    try:
        payload = decode_token(credentials.credentials)
    except jwt.PyJWTError:
        raise credentials_exception

    if payload.get("type") != ACCESS_TOKEN_TYPE:
        raise credentials_exception

    subject = payload.get("sub")
    if not subject:
        raise credentials_exception

    try:
        user_id = UUID(subject)
    except (ValueError, TypeError):
        raise credentials_exception

    user = db.get(User, user_id)
    if user is None:
        raise credentials_exception

    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require the authenticated user to be an administrator (403 otherwise)."""

    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )
    return current_user
