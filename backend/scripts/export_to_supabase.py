"""Import existing data into Supabase.

Reads the already-normalized rows from the local Postgres (categories,
experiences -> places, events) and upserts them into Supabase via the REST API
(PostgREST) using the SERVICE key. Idempotent: upserts on stable keys
(`slug` for categories, `source,source_uid` for places/events), so it is safe
to re-run and never duplicates.

Why read from the local DB instead of the raw JSON? The JSON was already
normalized by `scripts/import_data.py` (dedupe, category mapping, noise filter,
restaurant rebuild, attributes) — reusing that guarantees parity and no data
loss.

Prerequisites:
  * Apply supabase/migrations/0001–0003 in the Supabase SQL editor first.
  * Local Postgres running with the imported data.
  * Env: SUPABASE_URL and SUPABASE_SERVICE_KEY (the secret key).

Run:
  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python scripts/export_to_supabase.py
"""

from __future__ import annotations

import os
import re
import unicodedata
from typing import Any

import httpx
from sqlalchemy import select

from app.db import SessionLocal
from app.models import Category, Event, Experience

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY", ""
)
BATCH = 500


def _headers(prefer: str) -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": prefer,
    }


def _slugify(value: str) -> str:
    value = (
        unicodedata.normalize("NFKD", value or "")
        .encode("ascii", "ignore")
        .decode()
    )
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "item"


def upsert(table: str, rows: list[dict[str, Any]], on_conflict: str) -> None:
    if not rows:
        return
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={on_conflict}"
    headers = _headers("resolution=merge-duplicates,return=minimal")
    with httpx.Client(timeout=60.0) as client:
        for i in range(0, len(rows), BATCH):
            chunk = rows[i : i + BATCH]
            resp = client.post(url, headers=headers, json=chunk)
            if resp.status_code >= 300:
                raise RuntimeError(
                    f"{table} upsert failed ({resp.status_code}): {resp.text[:400]}"
                )
            print(f"  {table}: upserted {i + len(chunk)}/{len(rows)}")


def fetch_category_ids() -> dict[str, str]:
    url = f"{SUPABASE_URL}/rest/v1/categories?select=id,slug"
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(url, headers=_headers("count=none"))
        resp.raise_for_status()
        return {row["slug"]: row["id"] for row in resp.json()}


def run() -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_KEY.")

    db = SessionLocal()
    try:
        # 1) Categories -------------------------------------------------------
        categories = db.scalars(select(Category)).all()
        upsert(
            "categories",
            [
                {
                    "slug": c.slug,
                    "name": c.name,
                    "icon": c.icon,
                    "hero_image": c.hero_image,
                }
                for c in categories
            ],
            on_conflict="slug",
        )
        slug_to_id = fetch_category_ids()

        # 2) Experiences -> places -------------------------------------------
        experiences = db.scalars(select(Experience)).all()
        places: list[dict[str, Any]] = []
        images: list[dict[str, Any]] = []
        for e in experiences:
            attrs = e.attributes or {}
            slug = f"{_slugify(e.title)}-{str(e.id)[:8]}"
            places.append(
                {
                    "slug": slug,
                    "name": e.title,
                    "description": e.description,
                    "category_id": slug_to_id.get(e.category.slug),
                    "address": attrs.get("address"),
                    "neighborhood": None,
                    "latitude": e.lat,
                    "longitude": e.lng,
                    "phone": attrs.get("phone"),
                    "website": attrs.get("website"),
                    "price_tier": e.price_tier,
                    "price_label": attrs.get("price_label"),
                    "rating": attrs.get("rating"),
                    "reviews_count": attrs.get("reviews_count") or 0,
                    "image_url": (e.images or [None])[0],
                    "attributes": attrs,
                    "source": "wapike",
                    "source_uid": str(e.id),
                }
            )
            for pos, img in enumerate(e.images or []):
                images.append({"place_id": None, "url": img, "position": pos})

        upsert("places", places, on_conflict="source,source_uid")
        # Note: place_images require the place UUIDs; run a follow-up linking
        # step or import images alongside if you enable returning=representation.

        # 3) Events -----------------------------------------------------------
        events = db.scalars(select(Event)).all()
        upsert(
            "events",
            [
                {
                    "slug": ev.slug,
                    "title": ev.title,
                    "description": ev.description,
                    "category": ev.category,
                    "venue": ev.venue,
                    "county": ev.county,
                    "city": ev.city,
                    "address": ev.address,
                    "latitude": ev.latitude,
                    "longitude": ev.longitude,
                    "image_url": ev.image_url,
                    "organizer": ev.organizer,
                    "contact": ev.contact,
                    "ticket_url": ev.ticket_url,
                    "ticket_price": float(ev.ticket_price)
                    if ev.ticket_price is not None
                    else None,
                    "currency": ev.currency,
                    "start_datetime": ev.start_datetime.isoformat(),
                    "end_datetime": ev.end_datetime.isoformat()
                    if ev.end_datetime
                    else None,
                    "featured": ev.featured,
                    "status": ev.status.value,
                    "source": "wapike",
                    "source_uid": str(ev.id),
                }
                for ev in events
            ],
            on_conflict="source,source_uid",
        )

        print(
            f"\nDone. categories={len(categories)} places={len(places)} "
            f"events={len(events)}"
        )
    finally:
        db.close()


if __name__ == "__main__":
    run()
