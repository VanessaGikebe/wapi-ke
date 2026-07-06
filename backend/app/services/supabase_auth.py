"""Server-side Supabase Auth operations.

All business/admin account creation happens here, using the service-role key.
The frontend never receives permission to create privileged accounts.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

import httpx

from app.config import get_settings

settings = get_settings()


class SupabaseAuthUnavailable(RuntimeError):
    pass


@dataclass(frozen=True)
class ProvisionedAuthUser:
    auth_user_id: UUID
    activation_link: str | None


def _headers() -> dict[str, str]:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseAuthUnavailable(
            "Supabase service-role auth is not configured."
        )
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }


def invite_user(
    *,
    email: str,
    redirect_to: str,
    metadata: dict[str, str],
) -> ProvisionedAuthUser:
    """Create/invite a Supabase Auth user and return the activation link.

    Supabase sends the invite email when SMTP/templates are configured. The
    returned action link is stored for audit/debugging and can be sent by a
    future dedicated email provider.
    """

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/invite"
    payload = {
        "email": email,
        "data": metadata,
        "redirect_to": redirect_to,
    }
    with httpx.Client(timeout=30.0) as client:
        response = client.post(url, headers=_headers(), json=payload)
    if response.status_code >= 300:
        raise SupabaseAuthUnavailable(response.text[:500])
    data = response.json()
    user = data.get("user") or data
    auth_id = user.get("id")
    if not auth_id:
        raise SupabaseAuthUnavailable("Supabase invite did not return a user id.")
    return ProvisionedAuthUser(
        auth_user_id=UUID(str(auth_id)),
        activation_link=data.get("action_link"),
    )


def generate_magic_link(email: str, redirect_to: str) -> str | None:
    """Generate a magic link without exposing service credentials to clients."""

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/generate_link"
    payload = {
        "type": "magiclink",
        "email": email,
        "options": {"redirect_to": redirect_to},
    }
    with httpx.Client(timeout=30.0) as client:
        response = client.post(url, headers=_headers(), json=payload)
    if response.status_code >= 300:
        raise SupabaseAuthUnavailable(response.text[:500])
    return response.json().get("action_link")
