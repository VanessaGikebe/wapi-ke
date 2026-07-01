"""Deduplicate stage — drop duplicates *within a batch*.

Two guards:
  * identity: the ``(source, source_uid)`` idempotency key, and
  * content: ``(title, start, county)`` so the same event coming from two
    different providers collapses to one.

Cross-run de-duplication against the database is the importer's job (it upserts
on ``(source, source_uid)``).
"""

from __future__ import annotations

from typing import Any


def _content_key(event: dict[str, Any]) -> tuple:
    return (
        (event.get("title") or "").strip().lower(),
        event.get("start_datetime"),
        (event.get("county") or "").strip().lower(),
    )


def dedupe(events: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    seen_identity: set[tuple] = set()
    seen_content: set[tuple] = set()
    unique: list[dict[str, Any]] = []
    removed = 0

    for event in events:
        identity = (event.get("source"), event.get("source_uid"))
        content = _content_key(event)
        if (event.get("source_uid") and identity in seen_identity) or (
            content in seen_content
        ):
            removed += 1
            continue
        seen_identity.add(identity)
        seen_content.add(content)
        unique.append(event)

    return unique, removed
