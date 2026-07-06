"""Business verification service boundary.

Manual verification is the only implementation today. eCitizen BRS can be added
later by implementing the same interface and selecting it through config or
business category without changing the approval workflow.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class VerificationResult:
    provider: str
    reference: str | None
    passed: bool
    notes: str | None = None


class BusinessVerificationProvider(Protocol):
    name: str

    def verify_application(self, application_id: str) -> VerificationResult:
        ...

    def verify_claim(self, claim_id: str) -> VerificationResult:
        ...


class ManualVerificationProvider:
    name = "manual"

    def verify_application(self, application_id: str) -> VerificationResult:
        return VerificationResult(
            provider=self.name,
            reference=application_id,
            passed=True,
            notes="Manual administrator verification.",
        )

    def verify_claim(self, claim_id: str) -> VerificationResult:
        return VerificationResult(
            provider=self.name,
            reference=claim_id,
            passed=True,
            notes="Manual administrator verification.",
        )


def get_verification_provider() -> BusinessVerificationProvider:
    return ManualVerificationProvider()
