"""Shared parsing helpers used by source adapters.

Source adapters (scraped HTML, JSON APIs, ICS feeds, …) call these to turn
messy provider strings into typed values for a ``RawEvent``. Keeping the parsing
here means a new adapter reuses battle-tested parsers instead of re-inventing
date/price handling.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

# East Africa Time — Kenya has no DST, so a fixed +03:00 is correct.
EAT = timezone(timedelta(hours=3))

_ISO_FORMATS = (
    "%Y-%m-%dT%H:%M:%S%z",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y-%m-%d",
)


def parse_datetime(value: str | datetime | None) -> datetime | None:
    """Parse a datetime string into an aware datetime (assume EAT if naive)."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=EAT)
    text = value.strip()
    if not text:
        return None
    # Support a trailing "Z" (UTC).
    text = text.replace("Z", "+00:00")
    for fmt in _ISO_FORMATS:
        try:
            parsed = datetime.strptime(text, fmt)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=EAT)
        except ValueError:
            continue
    # Last resort: fromisoformat (handles many ISO variants).
    try:
        parsed = datetime.fromisoformat(text)
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=EAT)
    except ValueError:
        return None


_PRICE_RE = re.compile(r"([\d][\d,]*(?:\.\d+)?)")


def parse_price(value: str | int | float | None) -> float | None:
    """Extract a numeric price. 'Free' / 'Gate' → 0.0; unparseable → None."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = value.strip().lower()
    if not text:
        return None
    if any(word in text for word in ("free", "gratis", "no charge")):
        return 0.0
    match = _PRICE_RE.search(text.replace(",", ""))
    return float(match.group(1)) if match else None


_CURRENCIES = {"kes", "ksh", "kshs", "usd", "$", "eur", "€", "gbp", "£"}


def parse_currency(value: str | None, default: str = "KES") -> str:
    if not value:
        return default
    text = value.strip().lower()
    if text in ("$", "usd"):
        return "USD"
    if text in ("€", "eur"):
        return "EUR"
    if text in ("£", "gbp"):
        return "GBP"
    if text in ("ksh", "kshs", "kes"):
        return "KES"
    return value.upper()[:3] if value.strip() else default


def clean_text(value: str | None) -> str | None:
    if not value:
        return None
    collapsed = re.sub(r"\s+", " ", value).strip()
    return collapsed or None


def now_eat() -> datetime:
    return datetime.now(EAT)
