"""Event ingestion pipeline.

A modular, pluggable pipeline that keeps the events table up to date:

    scraper  -> normalizer -> deduplicator -> importer
    (sources)   (canonical)   (drop dupes)    (idempotent upsert)

Each stage lives in its own module. New providers are added by dropping a new
``EventSource`` adapter into ``event_ingestion/sources/`` and registering it —
nothing else in the app changes. See ``pipeline.run_ingestion`` for the entry
point and ``scheduler.run_daily`` for the scheduled maintenance job.
"""

from event_ingestion.base import EventSource, RawEvent, get_sources, register
from event_ingestion.pipeline import IngestionStats, run_ingestion

__all__ = [
    "EventSource",
    "RawEvent",
    "get_sources",
    "register",
    "IngestionStats",
    "run_ingestion",
]
