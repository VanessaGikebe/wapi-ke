"""Scrape stage — run every registered source and collect raw events.

This is the fan-out point: it invokes each source adapter and gathers their
``RawEvent`` output. A failing source is logged and skipped so one bad provider
never breaks the whole run.
"""

from __future__ import annotations

import logging

from event_ingestion.base import RawEvent, get_sources

logger = logging.getLogger("event_ingestion.scraper")


def collect_raw_events() -> list[RawEvent]:
    events: list[RawEvent] = []
    for source in get_sources():
        try:
            fetched = source.fetch()
            logger.info("source %s: %d events", source.name, len(fetched))
            events.extend(fetched)
        except Exception:  # noqa: BLE001 — isolate a bad source
            logger.exception("source %s failed; skipping", source.name)
    return events
