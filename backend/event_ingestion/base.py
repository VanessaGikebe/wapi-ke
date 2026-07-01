"""Core types + source registry for the ingestion pipeline.

An ``EventSource`` is an adapter for one provider (a scraped site, an API, an
ICS feed, …). It owns its own fetching + parsing and yields ``RawEvent`` objects
in a provider-agnostic shape. Register a source once and the whole pipeline
(scrape → normalize → dedupe → import) picks it up automatically.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class RawEvent:
    """A provider-agnostic event as emitted by a source (pre-normalization).

    ``source`` + ``source_uid`` MUST be stable across runs for the same real
    event — that pair is the idempotency key the importer upserts on.
    """

    source: str
    source_uid: str
    title: str
    start_datetime: datetime
    end_datetime: datetime | None = None
    description: str | None = None
    category: str | None = None
    venue: str | None = None
    county: str | None = None
    city: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    image_url: str | None = None
    organizer: str | None = None
    contact: str | None = None
    ticket_url: str | None = None
    ticket_price: float | None = None
    currency: str = "KES"
    #: A hint used only when first inserting; admins keep control afterwards.
    featured: bool = False


class EventSource(ABC):
    """Adapter for a single event provider."""

    #: Unique, stable identifier stored on every event's ``source`` column.
    name: str = "source"

    @abstractmethod
    def fetch(self) -> list[RawEvent]:
        """Return the provider's current events as ``RawEvent`` objects."""
        raise NotImplementedError


_REGISTRY: dict[str, EventSource] = {}


def register(source: EventSource) -> EventSource:
    """Register a source instance so the pipeline runs it. Idempotent by name."""
    _REGISTRY[source.name] = source
    return source


def get_sources() -> list[EventSource]:
    # Importing the sources package registers the built-in adapters.
    import event_ingestion.sources  # noqa: F401  (side-effect: registration)

    return list(_REGISTRY.values())
