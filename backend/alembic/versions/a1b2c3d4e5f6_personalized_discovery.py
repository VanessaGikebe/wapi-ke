"""add personalized discovery profile and interaction signals

Revision ID: a1b2c3d4e5f6
Revises: f6a7b8c9d0e1
Create Date: 2026-07-06 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Created explicitly (checkfirst) and referenced with create_type=False so
    # op.create_table below does NOT also emit a CREATE TYPE — that second,
    # un-checkfirsted creation is what raised DuplicateObject. Matches the enum
    # handling in the sibling migrations (c9d1e2f3a4b5, d4e5f6a7b8c9).
    interaction_type = postgresql.ENUM(
        "search",
        "view",
        "save",
        "booking",
        "review",
        "dwell",
        "filter",
        "not_interested",
        name="interaction_type",
        create_type=False,
    )
    interaction_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "user_preference_profiles",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("interests", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("categories", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("budget_tiers", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("vibes", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("preferences", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "completed_onboarding",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )

    op.create_table(
        "user_interactions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("interaction_type", interaction_type, nullable=False),
        sa.Column("experience_id", sa.Uuid(), nullable=True),
        sa.Column("category_slug", sa.String(length=120), nullable=True),
        sa.Column("search_query", sa.String(length=500), nullable=True),
        sa.Column("weight", sa.Integer(), nullable=False),
        sa.Column("context", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["experience_id"], ["experiences.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_interactions_user_id", "user_interactions", ["user_id"])
    op.create_index(
        "ix_user_interactions_experience_id",
        "user_interactions",
        ["experience_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_user_interactions_experience_id", table_name="user_interactions")
    op.drop_index("ix_user_interactions_user_id", table_name="user_interactions")
    op.drop_table("user_interactions")
    op.drop_table("user_preference_profiles")
    postgresql.ENUM(name="interaction_type").drop(op.get_bind(), checkfirst=True)
