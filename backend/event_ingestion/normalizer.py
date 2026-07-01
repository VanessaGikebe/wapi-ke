"""Normalize stage — turn a ``RawEvent`` into a canonical field dict.

Cleans whitespace, standardizes county/city casing and currency, clamps lengths
to the column sizes, derives a time-based ``status`` and a readable slug base.
The importer resolves the final unique slug.
"""

from __future__ import annotations

from typing import Any

from app.core.event_status import compute_status
from app.core.slug import slugify
from event_ingestion.base import RawEvent
from event_ingestion.parser import clean_text


def _place(value: str | None) -> str | None:
    cleaned = clean_text(value)
    if not cleaned:
        return None
    # Title-case place names that arrive lower-cased.
    return cleaned.title() if cleaned.islower() else cleaned


def normalize(raw: RawEvent) -> dict[str, Any]:
    title = (clean_text(raw.title) or "Untitled event")[:300]
    slug_base = slugify(f"{title} {raw.start_datetime:%b %d %Y}")

    return {
        "slug_base": slug_base,
        "title": title,
        "description": clean_text(raw.description),
        "category": (clean_text(raw.category) or None),
        "venue": (clean_text(raw.venue) or None),
        "county": _place(raw.county),
        "city": _place(raw.city),
        "address": clean_text(raw.address),
        "latitude": raw.latitude,
        "longitude": raw.longitude,
        "image_url": (raw.image_url or None),
        "organizer": (clean_text(raw.organizer) or None),
        "contact": (clean_text(raw.contact) or None),
        "ticket_url": (raw.ticket_url or None),
        "ticket_price": raw.ticket_price,
        "currency": (raw.currency or "KES").upper()[:3],
        "start_datetime": raw.start_datetime,
        "end_datetime": raw.end_datetime,
        "status": compute_status(raw.start_datetime, raw.end_datetime),
        "featured": raw.featured,
        "source": raw.source,
        "source_uid": raw.source_uid,
    }
