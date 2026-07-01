"""Import stage — idempotent upsert of normalized events into the database.

Upserts on ``(source, source_uid)``: existing rows are updated in place (only
when something actually changed), new rows are inserted with a unique slug.
Admin-owned fields are preserved — ``featured`` is never overwritten, and an
event an admin has ``archived`` is never silently un-archived.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Event, EventStatus

# Fields the importer is allowed to overwrite on an existing event.
_SYNC_FIELDS = (
    "title",
    "description",
    "category",
    "venue",
    "county",
    "city",
    "address",
    "latitude",
    "longitude",
    "image_url",
    "organizer",
    "contact",
    "ticket_url",
    "ticket_price",
    "currency",
    "start_datetime",
    "end_datetime",
)


@dataclass
class ImportStats:
    created: int = 0
    updated: int = 0
    unchanged: int = 0

    def as_dict(self) -> dict[str, int]:
        return {
            "created": self.created,
            "updated": self.updated,
            "unchanged": self.unchanged,
        }


def _unique_slug(db: Session, base: str) -> str:
    candidate, suffix = base, 2
    while db.scalar(select(Event.id).where(Event.slug == candidate)) is not None:
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def _equal(current: Any, incoming: Any) -> bool:
    if isinstance(current, Decimal) or isinstance(incoming, Decimal):
        a = None if current is None else float(current)
        b = None if incoming is None else float(incoming)
        return a == b
    return current == incoming


def import_events(db: Session, normalized: list[dict[str, Any]]) -> ImportStats:
    stats = ImportStats()

    for event in normalized:
        source, source_uid = event.get("source"), event.get("source_uid")
        existing = None
        if source and source_uid:
            existing = db.scalar(
                select(Event).where(
                    Event.source == source, Event.source_uid == source_uid
                )
            )

        if existing is None:
            db.add(
                Event(
                    slug=_unique_slug(db, event["slug_base"]),
                    featured=bool(event.get("featured", False)),
                    source=source,
                    source_uid=source_uid,
                    **{k: event[k] for k in (*_SYNC_FIELDS, "status")},
                )
            )
            stats.created += 1
            continue

        changed = False
        for field in _SYNC_FIELDS:
            if not _equal(getattr(existing, field), event[field]):
                setattr(existing, field, event[field])
                changed = True
        # Respect an admin archive; otherwise keep the time-derived status fresh.
        if existing.status != EventStatus.archived and existing.status != event["status"]:
            existing.status = event["status"]
            changed = True

        if changed:
            stats.updated += 1
        else:
            stats.unchanged += 1

    db.commit()
    return stats
