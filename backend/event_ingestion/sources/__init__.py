"""Built-in event source adapters.

Importing this package registers every adapter with the pipeline. To add a new
provider, create a module here that builds ``RawEvent`` objects and calls
``register(MySource())`` — no other part of the app needs to change.
"""

from event_ingestion.sources import sample_source  # noqa: F401 (registration)

__all__ = ["sample_source"]
