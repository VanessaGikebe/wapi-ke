"""Supabase Admin (GoTrue + Storage) service — SERVER-SIDE ONLY.

Thin ``httpx`` wrapper over the Supabase Auth Admin and Storage REST APIs using
the **service (secret) key**. The backend uses this to:

* create the auth account for an approved business owner / invited admin,
* mint one-time activation **magic links** (Supabase Auth), and
* issue **signed upload / download URLs** for the private documents bucket so a
  *pre-account* applicant can upload without a session and an admin can view.

The service key bypasses RLS and must never reach the browser. All calls are
guarded by :func:`is_configured`; endpoints that need it 503 cleanly when the
key is unset (mirroring the Google-sign-in path).
"""

from __future__ import annotations

import secrets
from typing import Any
from urllib.parse import parse_qs, urlsplit

import httpx

from app.config import get_settings

_TIMEOUT = 15.0


class SupabaseAdminError(RuntimeError):
    """A Supabase Admin API call failed."""


class SupabaseNotConfigured(SupabaseAdminError):
    """The service key / URL is not configured on the server."""


class SupabaseUserExists(SupabaseAdminError):
    """A user with this email already exists in Supabase Auth."""


def _cfg() -> tuple[str, str]:
    settings = get_settings()
    url = (settings.supabase_url or "").rstrip("/")
    key = settings.supabase_service_key or ""
    if not url or not key:
        raise SupabaseNotConfigured(
            "Supabase is not configured (set SUPABASE_URL and "
            "SUPABASE_SERVICE_KEY)."
        )
    return url, key


def is_configured() -> bool:
    settings = get_settings()
    return bool(settings.supabase_url and settings.supabase_service_key)


def _headers(key: str) -> dict[str, str]:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


# --- Auth admin -------------------------------------------------------------


def create_user(
    email: str,
    *,
    password: str | None = None,
    user_metadata: dict[str, Any] | None = None,
    email_confirm: bool = True,
) -> dict[str, Any]:
    """Create a Supabase Auth user and return the user object (incl. ``id``).

    ``email_confirm=True`` marks the address confirmed so the account is usable
    immediately after activation. Raises :class:`SupabaseUserExists` if the
    email is already registered.
    """

    url, key = _cfg()
    body: dict[str, Any] = {
        "email": email,
        "email_confirm": email_confirm,
        # A random password guarantees a usable credential even before the user
        # sets their own; they normally activate via the magic link.
        "password": password or secrets.token_urlsafe(24),
    }
    if user_metadata:
        body["user_metadata"] = user_metadata

    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(
            f"{url}/auth/v1/admin/users", headers=_headers(key), json=body
        )
    if resp.status_code in (200, 201):
        return resp.json()
    detail = _error_detail(resp)
    if resp.status_code in (409, 422) and "already" in detail.lower():
        raise SupabaseUserExists(detail)
    raise SupabaseAdminError(f"create_user failed ({resp.status_code}): {detail}")


def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Look up an existing auth user by email (best-effort, bounded scan)."""

    url, key = _cfg()
    email_l = email.strip().lower()
    with httpx.Client(timeout=_TIMEOUT) as client:
        for page in range(1, 6):  # up to 5 pages × 200 = 1000 users
            resp = client.get(
                f"{url}/auth/v1/admin/users",
                headers=_headers(key),
                params={"page": page, "per_page": 200},
            )
            if resp.status_code != 200:
                raise SupabaseAdminError(
                    f"list users failed ({resp.status_code}): {_error_detail(resp)}"
                )
            data = resp.json()
            users = data.get("users", data) if isinstance(data, dict) else data
            if not users:
                break
            for u in users:
                if (u.get("email") or "").lower() == email_l:
                    return u
    return None


def generate_magic_link(email: str, redirect_to: str) -> str:
    """Mint a one-time magic link for an existing user; return the action URL."""

    url, key = _cfg()
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(
            f"{url}/auth/v1/admin/generate_link",
            headers=_headers(key),
            json={
                "type": "magiclink",
                "email": email,
                "options": {"redirect_to": redirect_to},
            },
        )
    if resp.status_code != 200:
        raise SupabaseAdminError(
            f"generate_link failed ({resp.status_code}): {_error_detail(resp)}"
        )
    data = resp.json()
    link = (
        data.get("action_link")
        or (data.get("properties") or {}).get("action_link")
    )
    if not link:
        raise SupabaseAdminError("generate_link returned no action_link")
    return link


def provision_account(
    email: str,
    *,
    name: str | None = None,
    account_type: str | None = None,
    redirect_to: str,
) -> tuple[str, str]:
    """Ensure an auth account for ``email`` exists, then mint an activation
    magic link. Returns ``(supabase_user_id, activation_link)``.

    Idempotent: if the account already exists it is reused (so re-approving or
    re-inviting is safe).
    """

    meta: dict[str, Any] = {}
    if name:
        meta["full_name"] = name
    if account_type:
        meta["account_type"] = account_type

    try:
        created = create_user(email, user_metadata=meta or None)
        user_id = str(created["id"])
    except SupabaseUserExists:
        existing = get_user_by_email(email)
        if existing is None:
            raise SupabaseAdminError(
                "user reported as existing but could not be looked up"
            )
        user_id = str(existing["id"])

    link = generate_magic_link(email, redirect_to)
    return user_id, link


# --- Storage: signed URLs ---------------------------------------------------


def create_signed_upload_url(bucket: str, path: str) -> dict[str, str]:
    """Create a signed upload URL for ``bucket/path``.

    Returns ``{path, token}`` for the browser's
    ``supabase.storage.from(bucket).uploadToSignedUrl(path, token, file)`` —
    which needs no auth session, so a pre-account applicant can upload straight
    to a private bucket.
    """

    url, key = _cfg()
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(
            f"{url}/storage/v1/object/upload/sign/{bucket}/{path}",
            headers=_headers(key),
            json={},
        )
    if resp.status_code not in (200, 201):
        raise SupabaseAdminError(
            f"signed upload url failed ({resp.status_code}): {_error_detail(resp)}"
        )
    data = resp.json()
    # Response: {"url": "/object/upload/sign/<bucket>/<path>?token=<jwt>"}
    token = data.get("token")
    if not token:
        signed = data.get("url") or data.get("signedUrl") or ""
        qs = parse_qs(urlsplit(signed).query)
        token = (qs.get("token") or [""])[0]
    if not token:
        raise SupabaseAdminError("signed upload url returned no token")
    return {"path": path, "token": token}


def create_signed_download_url(
    bucket: str, path: str, expires_in: int = 120
) -> str:
    """Create a short-lived signed URL to read a private object (admin view)."""

    url, key = _cfg()
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(
            f"{url}/storage/v1/object/sign/{bucket}/{path}",
            headers=_headers(key),
            json={"expiresIn": expires_in},
        )
    if resp.status_code != 200:
        raise SupabaseAdminError(
            f"signed url failed ({resp.status_code}): {_error_detail(resp)}"
        )
    signed = resp.json().get("signedURL") or resp.json().get("signedUrl")
    if not signed:
        raise SupabaseAdminError("signed url response missing signedURL")
    return f"{url}/storage/v1{signed}"


def public_url(bucket: str, path: str) -> str:
    """Public URL for an object in a public bucket (logo/cover)."""

    url, _ = _cfg()
    return f"{url}/storage/v1/object/public/{bucket}/{path}"


def _error_detail(resp: httpx.Response) -> str:
    try:
        data = resp.json()
    except Exception:  # noqa: BLE001
        return resp.text[:300]
    if isinstance(data, dict):
        return str(
            data.get("msg")
            or data.get("message")
            or data.get("error_description")
            or data.get("error")
            or data
        )
    return str(data)
