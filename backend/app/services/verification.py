"""Business verification service layer.

This is the seam that lets an official **eCitizen Business Registration
Service (BRS)** integration replace the manual review later *without changing
the business onboarding flow*. Callers depend on the ``VerificationProvider``
protocol and ``get_verification_provider()`` — never on a concrete provider.

Today the only provider is ``manual``: no automated lookup happens; an admin
reviews the uploaded documents and application details by hand and records the
outcome. A future ``ecitizen_brs`` provider implements the same ``verify()``
contract and is selected via ``settings.verification_provider``.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol, runtime_checkable

from app.config import get_settings
from app.models import VerificationStatus


@dataclass(slots=True)
class VerificationRequest:
    """The applicant-supplied fields a provider verifies against a registry."""

    business_name: str
    business_type: str
    registration_number: str | None = None
    kra_pin: str | None = None
    owner_national_id: str | None = None


@dataclass(slots=True)
class VerificationResult:
    """A provider's outcome. For ``manual`` this starts ``pending`` and an admin
    resolves it; for a real BRS lookup the registry fields are populated."""

    status: VerificationStatus
    provider: str
    verified_registration_number: str | None = None
    verified_business_name: str | None = None
    registration_status: str | None = None
    verified_business_type: str | None = None
    registration_date: datetime | None = None
    director_info: dict[str, Any] | None = None
    raw_response: dict[str, Any] | None = None
    notes: str | None = None


@runtime_checkable
class VerificationProvider(Protocol):
    """Contract every verification backend implements."""

    name: str

    def verify(self, request: VerificationRequest) -> VerificationResult:
        """Attempt to verify a business. Must not raise for an unverifiable
        business — return a ``failed``/``pending`` result instead."""
        ...


class ManualVerificationProvider:
    """Default provider: defer to a human admin.

    No external call is made. The application is marked ``pending`` and an admin
    reviews the uploaded Business Registration Certificate, National ID, etc.,
    then approves or fails it from the admin dashboard.
    """

    name = "manual"

    def verify(self, request: VerificationRequest) -> VerificationResult:
        return VerificationResult(
            status=VerificationStatus.pending,
            provider=self.name,
            notes="Awaiting manual admin review of the uploaded documents.",
        )


# Provider registry. Add ``"ecitizen_brs": EcitizenBrsVerificationProvider``
# here once implemented — no other code needs to change.
_PROVIDERS: dict[str, type[VerificationProvider]] = {
    "manual": ManualVerificationProvider,
}


def get_verification_provider(name: str | None = None) -> VerificationProvider:
    """Return the configured verification provider.

    Falls back to the manual provider for an unknown/unset name so onboarding
    never breaks if a provider is misconfigured.
    """

    key = (name or get_settings().verification_provider or "manual").lower()
    provider_cls = _PROVIDERS.get(key, ManualVerificationProvider)
    return provider_cls()
