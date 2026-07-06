"""Pydantic v2 request/response schemas for auth."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import AccountType, AdminRole


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    """The Google ID token (JWT credential) issued to the browser by GIS."""

    credential: str = Field(min_length=1)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    name: str
    # The account type is assigned server-side only (never self-service).
    account_type: AccountType
    # Present only for admin accounts: their tier (moderator/administrator/
    # super_admin). Read from the ``admin_role`` property on the ORM model.
    admin_role: AdminRole | None = None
    created_at: datetime


class AuthResponse(BaseModel):
    """Access token returned in the body; refresh token rides in a cookie."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse
