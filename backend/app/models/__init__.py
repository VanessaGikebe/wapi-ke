"""SQLAlchemy ORM models (CLAUDE.md §7).

Importing this package registers every model on ``Base.metadata`` so Alembic
autogenerate and ``Base.metadata.create_all`` see the full schema.
"""

from app.models.admin import (
    AdminInvitation,
    AdminRole,
    AdminRoleAssignment,
    AuditLog,
    InvitationStatus,
)
from app.models.assistant_session import AssistantSession
from app.models.booking import Booking, BookingStatus
from app.models.business import (
    ApplicationStatus,
    Business,
    BusinessApplication,
    BusinessClaim,
    BusinessDocument,
    BusinessOwner,
    BusinessStatus,
    BusinessType,
    BusinessVerification,
    ClaimStatus,
    DocumentType,
    OwnerRole,
    VerificationStatus,
)
from app.models.category import Category
from app.models.event import Event, EventStatus
from app.models.experience import Experience, ListingStatus
from app.models.favorite import Favorite
from app.models.filter_definition import FilterDefinition, FilterType
from app.models.moderation import (
    ListingReport,
    ModerationAction,
    ModerationActionType,
    ReportStatus,
)
from app.models.personalization import (
    InteractionType,
    UserInteraction,
    UserPreferenceProfile,
)
from app.models.user import AccountType, User

__all__ = [
    "AccountType",
    "AdminInvitation",
    "AdminRole",
    "AdminRoleAssignment",
    "ApplicationStatus",
    "AssistantSession",
    "AuditLog",
    "Booking",
    "BookingStatus",
    "Business",
    "BusinessApplication",
    "BusinessClaim",
    "BusinessDocument",
    "BusinessOwner",
    "BusinessStatus",
    "BusinessType",
    "BusinessVerification",
    "Category",
    "ClaimStatus",
    "DocumentType",
    "Event",
    "EventStatus",
    "Experience",
    "Favorite",
    "FilterDefinition",
    "FilterType",
    "InvitationStatus",
    "InteractionType",
    "ListingReport",
    "ListingStatus",
    "ModerationAction",
    "ModerationActionType",
    "OwnerRole",
    "ReportStatus",
    "UserInteraction",
    "UserPreferenceProfile",
    "User",
    "VerificationStatus",
]
