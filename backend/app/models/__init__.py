"""SQLAlchemy ORM models (CLAUDE.md §7).

Importing this package registers every model on ``Base.metadata`` so Alembic
autogenerate and ``Base.metadata.create_all`` see the full schema.
"""

from app.models.assistant_session import AssistantSession
from app.models.booking import Booking, BookingStatus
from app.models.category import Category
from app.models.event import Event, EventStatus
from app.models.experience import Experience
from app.models.favorite import Favorite
from app.models.filter_definition import FilterDefinition, FilterType
from app.models.user import User

__all__ = [
    "AssistantSession",
    "Booking",
    "BookingStatus",
    "Category",
    "Event",
    "EventStatus",
    "Experience",
    "Favorite",
    "FilterDefinition",
    "FilterType",
    "User",
]
