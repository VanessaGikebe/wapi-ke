"""Pipeline orchestration — scrape → normalize → dedupe → import.

``run_ingestion`` is the single entry point the scheduler (and any manual run)
calls. It is safe to run repeatedly: the importer upserts, so no duplicates.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from event_ingestion.deduplicator import dedupe
from event_ingestion.importer import import_events
from event_ingestion.normalizer import normalize
from event_ingestion.scraper import collect_raw_events


@dataclass
class IngestionStats:
    fetched: int = 0
    deduped_removed: int = 0
    created: int = 0
    updated: int = 0
    unchanged: int = 0

    def as_dict(self) -> dict[str, int]:
        return {
            "fetched": self.fetched,
            "deduped_removed": self.deduped_removed,
            "created": self.created,
            "updated": self.updated,
            "unchanged": self.unchanged,
        }


def run_ingestion(db: Session) -> IngestionStats:
    raw = collect_raw_events()
    normalized = [normalize(event) for event in raw]
    deduped, removed = dedupe(normalized)
    result = import_events(db, deduped)

    return IngestionStats(
        fetched=len(raw),
        deduped_removed=removed,
        created=result.created,
        updated=result.updated,
        unchanged=result.unchanged,
    )
