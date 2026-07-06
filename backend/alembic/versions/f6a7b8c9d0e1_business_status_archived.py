"""add 'archived' to business_status enum

Admins can archive (soft-remove) a business from the admin Businesses page, and
reopen it later.

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-07-06 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PG 12+ allows ADD VALUE inside a transaction (as long as it isn't used in
    # the same transaction — it isn't here).
    op.execute("ALTER TYPE business_status ADD VALUE IF NOT EXISTS 'archived'")


def downgrade() -> None:
    # Postgres cannot drop a value from an enum; leaving 'archived' in place is
    # harmless. (A full downgrade would require recreating the type.)
    pass
