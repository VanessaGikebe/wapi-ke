"""business claims target a catalog listing

A claim is asserted against an existing catalog listing (``experiences``), not a
live ``Business`` (which only exists for already-onboarded businesses). The live
``Business`` + ownership is created on approval, so ``business_id`` becomes
nullable and a nullable ``experience_id`` is added.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-06 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "business_claims",
        sa.Column("experience_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_business_claims_experience",
        "business_claims",
        "experiences",
        ["experience_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        "ix_business_claims_experience_id",
        "business_claims",
        ["experience_id"],
    )
    # The live Business is created on approval — no business until then.
    op.alter_column(
        "business_claims",
        "business_id",
        existing_type=sa.Uuid(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "business_claims",
        "business_id",
        existing_type=sa.Uuid(),
        nullable=False,
    )
    op.drop_index("ix_business_claims_experience_id", table_name="business_claims")
    op.drop_constraint(
        "fk_business_claims_experience", "business_claims", type_="foreignkey"
    )
    op.drop_column("business_claims", "experience_id")
