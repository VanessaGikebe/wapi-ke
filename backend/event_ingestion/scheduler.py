"""Daily scheduled maintenance job.

Runs the ingestion pipeline, then keeps every event's lifecycle correct:

  * import new events / update changed ones (via the pipeline, no duplicates),
  * recompute `status` (upcoming → ongoing → ended) from the clock, and
  * archive events that ended more than ``ARCHIVE_AFTER`` ago.

Run it once a day. It is idempotent, so extra runs are harmless.

    # one-shot (wire this to Windows Task Scheduler / cron / a container cron)
    python -m event_ingestion.scheduler

For in-process scheduling you can instead call ``run_daily`` from APScheduler
or a Celery beat task — the logic is identical.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.event_status import compute_status, effective_end
from app.db import SessionLocal
from app.models import Event, EventStatus
from event_ingestion.pipeline import IngestionStats, run_ingestion

logger = logging.getLogger("event_ingestion.scheduler")

# Archive events this long after they end (keeps listings clean, data retained).
ARCHIVE_AFTER = timedelta(days=3)


@dataclass
class MaintenanceStats:
    status_transitions: int = 0
    archived: int = 0


def refresh_lifecycle(db: Session, now: datetime | None = None) -> MaintenanceStats:
    """Recompute statuses and archive long-expired events."""
    now = now or datetime.now(timezone.utc)
    stats = MaintenanceStats()

    events = db.scalars(
        select(Event).where(Event.status != EventStatus.archived)
    ).all()
    for event in events:
        new_status = compute_status(event.start_datetime, event.end_datetime, now)
        if event.status != new_status:
            event.status = new_status
            stats.status_transitions += 1
        if effective_end(event.start_datetime, event.end_datetime) < now - ARCHIVE_AFTER:
            event.status = EventStatus.archived
            stats.archived += 1

    db.commit()
    return stats


def run_daily(db: Session | None = None) -> dict[str, int]:
    """Full daily job: ingest, then refresh lifecycle. Returns combined stats."""
    owns_session = db is None
    db = db or SessionLocal()
    try:
        ingestion: IngestionStats = run_ingestion(db)
        maintenance = refresh_lifecycle(db)
        result = {
            **ingestion.as_dict(),
            "status_transitions": maintenance.status_transitions,
            "archived": maintenance.archived,
        }
        logger.info("daily event job complete: %s", result)
        return result
    finally:
        if owns_session:
            db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    stats = run_daily()
    print("Event scheduler run complete:")
    for key, value in stats.items():
        print(f"  {key:20s} {value}")
