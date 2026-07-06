"""roles + moderation: user role, listing status/owner, reports, claims, audit

Revision ID: c9d1e2f3a4b5
Revises: b7f3a9c2d1e4
Create Date: 2026-07-06 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "c9d1e2f3a4b5"
down_revision: Union[str, None] = "b7f3a9c2d1e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

user_role = postgresql.ENUM(
    "user", "business_manager", "administrator",
    name="user_role", create_type=False,
)
listing_status = postgresql.ENUM(
    "pending", "approved", "flagged", "removed",
    name="listing_status", create_type=False,
)
moderation_action_type = postgresql.ENUM(
    "approved", "rejected", "flagged", "removed", "restored",
    "claim_approved", "claim_rejected", "report_reviewed", "report_dismissed",
    name="moderation_action_type", create_type=False,
)
report_status = postgresql.ENUM(
    "open", "reviewed", "dismissed", name="report_status", create_type=False,
)
claim_status = postgresql.ENUM(
    "pending", "approved", "rejected", name="claim_status", create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    for enum in (
        user_role, listing_status, moderation_action_type,
        report_status, claim_status,
    ):
        enum.create(bind, checkfirst=True)

    # users.role (existing admins become administrators)
    op.add_column(
        "users",
        sa.Column("role", user_role, server_default="user", nullable=False),
    )
    op.execute("UPDATE users SET role = 'administrator' WHERE is_admin = true")

    # experiences: moderation status + owner
    op.add_column(
        "experiences",
        sa.Column(
            "status", listing_status, server_default="approved", nullable=False
        ),
    )
    op.add_column(
        "experiences", sa.Column("owner_id", sa.Uuid(), nullable=True)
    )
    op.create_foreign_key(
        "fk_experiences_owner_id", "experiences", "users",
        ["owner_id"], ["id"], ondelete="SET NULL",
    )
    op.create_index("ix_experiences_status", "experiences", ["status"])
    op.create_index("ix_experiences_owner_id", "experiences", ["owner_id"])

    op.create_table(
        "moderation_actions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("experience_id", sa.Uuid(), nullable=True),
        sa.Column("action", moderation_action_type, nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["experience_id"], ["experiences.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_moderation_actions_created", "moderation_actions", ["created_at"]
    )

    op.create_table(
        "listing_reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("experience_id", sa.Uuid(), nullable=False),
        sa.Column("reporter_id", sa.Uuid(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", report_status, server_default="open", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["experience_id"], ["experiences.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["reporter_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_listing_reports_status", "listing_reports", ["status"])
    op.create_index(
        "ix_listing_reports_experience", "listing_reports", ["experience_id"]
    )

    op.create_table(
        "business_claims",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("experience_id", sa.Uuid(), nullable=False),
        sa.Column("manager_id", sa.Uuid(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", claim_status, server_default="pending", nullable=False),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["experience_id"], ["experiences.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["manager_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_business_claims_status", "business_claims", ["status"])
    op.create_index(
        "ix_business_claims_manager", "business_claims", ["manager_id"]
    )


def downgrade() -> None:
    op.drop_table("business_claims")
    op.drop_table("listing_reports")
    op.drop_table("moderation_actions")
    op.drop_index("ix_experiences_owner_id", table_name="experiences")
    op.drop_index("ix_experiences_status", table_name="experiences")
    op.drop_constraint("fk_experiences_owner_id", "experiences", type_="foreignkey")
    op.drop_column("experiences", "owner_id")
    op.drop_column("experiences", "status")
    op.drop_column("users", "role")
    for name in (
        "claim_status", "report_status", "moderation_action_type",
        "listing_status", "user_role",
    ):
        op.execute(f"DROP TYPE IF EXISTS {name}")
