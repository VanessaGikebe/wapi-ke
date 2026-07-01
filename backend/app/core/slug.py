"""Slug helpers shared by the events API and the ingestion pipeline."""

from __future__ import annotations

import re
import unicodedata


def slugify(value: str) -> str:
    """Turn arbitrary text into a URL-safe slug."""
    value = (
        unicodedata.normalize("NFKD", value or "")
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value or "event"
