"""Admin audit logging helpers."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.models import AdminAuditLog


def log_admin_action(
    db: Session,
    *,
    actor_account_id: UUID | None,
    action: str,
    subject_type: str,
    subject_id: UUID | None = None,
    metadata: dict | None = None,
) -> None:
    db.add(
        AdminAuditLog(
            actor_account_id=actor_account_id,
            action=action,
            subject_type=subject_type,
            subject_id=subject_id,
            metadata_json=metadata,
        )
    )
