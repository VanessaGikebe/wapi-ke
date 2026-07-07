"""add behaviour-derived preference scores and engagement interaction types

Revision ID: a2b3c4d5e6f7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-07 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # New engagement signals logged through the generic interactions endpoint.
    # ADD VALUE can't run inside a transaction block, so use an autocommit block.
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'directions'"
        )
        op.execute(
            "ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'share'"
        )

    op.add_column(
        "user_preference_profiles",
        sa.Column(
            "behavior_scores",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
    )
    op.add_column(
        "user_preference_profiles",
        sa.Column(
            "behavior_events_count",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )
    op.add_column(
        "user_preference_profiles",
        sa.Column(
            "scores_updated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("user_preference_profiles", "scores_updated_at")
    op.drop_column("user_preference_profiles", "behavior_events_count")
    op.drop_column("user_preference_profiles", "behavior_scores")
    # Note: Postgres has no DROP VALUE for enums; the added 'directions'/'share'
    # labels are left in place on downgrade (harmless if unused).
