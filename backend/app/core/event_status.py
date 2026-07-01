"""Event lifecycle helpers, shared by the API and the scheduler."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.models import EventStatus

# When an event has no explicit end, assume it runs for this long.
DEFAULT_DURATION = timedelta(hours=6)


def _aware(value: datetime) -> datetime:
    """Treat naive datetimes as UTC so comparisons never raise."""
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def effective_end(start: datetime, end: datetime | None) -> datetime:
    return _aware(end) if end else _aware(start) + DEFAULT_DURATION


def compute_status(
    start: datetime,
    end: datetime | None,
    now: datetime | None = None,
) -> EventStatus:
    """Derive an event's status from its schedule (ignores `archived`, which is
    an explicit admin/scheduler state, not time-derived)."""
    now = now or datetime.now(timezone.utc)
    start = _aware(start)
    if now < start:
        return EventStatus.upcoming
    if now > effective_end(start, end):
        return EventStatus.ended
    return EventStatus.ongoing
