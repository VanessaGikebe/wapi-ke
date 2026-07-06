"""SQLAlchemy ORM models (CLAUDE.md §7).

Importing this package registers every model on ``Base.metadata`` so Alembic
autogenerate and ``Base.metadata.create_all`` see the full schema.
"""

from app.models.assistant_session import AssistantSession
from app.models.account import Account, AccountRole, AccountStatus, AccountType
from app.models.admin_account import (
    AdminAuditLog,
    AdminInvitation,
    AdminInvitationStatus,
)
from app.models.business_account import (
    BusinessAccount,
    BusinessApplication,
    BusinessClaim,
    BusinessOwnershipHistory,
    BusinessStatus,
    ReviewStatus,
    VerificationDocument,
    VerificationDocumentType,
)
from app.models.booking import Booking, BookingStatus
from app.models.category import Category
from app.models.event import Event, EventStatus
from app.models.experience import Experience
from app.models.favorite import Favorite
from app.models.filter_definition import FilterDefinition, FilterType
from app.models.user import User

__all__ = [
    "AssistantSession",
    "Account",
    "AccountRole",
    "AccountStatus",
    "AccountType",
    "AdminAuditLog",
    "AdminInvitation",
    "AdminInvitationStatus",
    "BusinessAccount",
    "BusinessApplication",
    "BusinessClaim",
    "BusinessOwnershipHistory",
    "BusinessStatus",
    "Booking",
    "BookingStatus",
    "Category",
    "Event",
    "EventStatus",
    "Experience",
    "Favorite",
    "FilterDefinition",
    "FilterType",
    "ReviewStatus",
    "User",
    "VerificationDocument",
    "VerificationDocumentType",
]
