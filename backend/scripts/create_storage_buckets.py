"""Provision the Supabase Storage buckets the business-onboarding pipeline needs.

The signed-upload flow (applications.py / claims.py → supabase_admin) requires
two buckets to exist in the Supabase project:

* ``business-documents`` — PRIVATE. Sensitive verification docs (ID, registration
  certificate); read by admins via short-lived signed URLs.
* ``business-media``     — PUBLIC. Business logos / cover images; served via
  public URLs.

These are infra, not schema, so they aren't created by Alembic. Run this once
per environment after setting SUPABASE_URL / SUPABASE_SERVICE_KEY. Idempotent:
re-running leaves existing buckets untouched.

Usage (from ``backend/``)::

    python scripts/create_storage_buckets.py
"""

from __future__ import annotations

import sys

import httpx

from app.config import get_settings
from app.services import supabase_admin

_TIMEOUT = 15.0


def _ensure_bucket(url: str, key: str, name: str, *, public: bool) -> None:
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    with httpx.Client(timeout=_TIMEOUT) as client:
        # Already there? Leave it exactly as configured in the dashboard.
        existing = client.get(f"{url}/storage/v1/bucket/{name}", headers=headers)
        if existing.status_code == 200:
            is_public = existing.json().get("public")
            print(f"[skip] bucket '{name}' already exists (public={is_public}).")
            if is_public != public:
                print(
                    f"       ! WARNING: expected public={public} but found "
                    f"public={is_public}. Fix this in the Supabase dashboard."
                )
            return

        resp = client.post(
            f"{url}/storage/v1/bucket",
            headers=headers,
            json={"id": name, "name": name, "public": public},
        )
    if resp.status_code in (200, 201):
        print(f"[ok]   created bucket '{name}' (public={public}).")
    else:
        raise SystemExit(
            f"Failed to create bucket '{name}' ({resp.status_code}): "
            f"{resp.text[:300]}"
        )


def main() -> None:
    if not supabase_admin.is_configured():
        raise SystemExit(
            "Supabase not configured — set SUPABASE_URL and "
            "SUPABASE_SERVICE_KEY in backend/.env first."
        )
    settings = get_settings()
    url = settings.supabase_url.rstrip("/")
    key = settings.supabase_service_key

    _ensure_bucket(url, key, settings.business_docs_bucket, public=False)
    _ensure_bucket(url, key, settings.business_media_bucket, public=True)
    print("\nDone.")


if __name__ == "__main__":
    main()
    sys.exit(0)
