"""account portals and RBAC

Revision ID: c8d1e2f3a4b5
Revises: b7f3a9c2d1e4
Create Date: 2026-07-06 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c8d1e2f3a4b5"
down_revision: Union[str, None] = "b7f3a9c2d1e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


account_type = sa.Enum("regular", "business", "admin", name="account_type")
account_role = sa.Enum(
    "regular_user",
    "business_account",
    "moderator",
    "administrator",
    "super_admin",
    name="account_role",
)
account_status = sa.Enum(
    "active", "pending_onboarding", "suspended", "disabled",
    name="account_status",
)
review_status = sa.Enum(
    "pending_verification", "approved", "rejected", "more_info_requested",
    name="business_review_status",
)
claim_status = sa.Enum(
    "pending_verification", "approved", "rejected", "more_info_requested",
    name="business_claim_status",
)
business_status = sa.Enum(
    "pending_activation", "active", "suspended", "closed",
    name="business_status",
)
document_type = sa.Enum(
    "registration", "ownership", "identity", "other",
    name="verification_document_type",
)
invitation_status = sa.Enum(
    "pending", "accepted", "revoked", "expired",
    name="admin_invitation_status",
)


def upgrade() -> None:
    account_type.create(op.get_bind(), checkfirst=True)
    account_role.create(op.get_bind(), checkfirst=True)
    account_status.create(op.get_bind(), checkfirst=True)
    review_status.create(op.get_bind(), checkfirst=True)
    claim_status.create(op.get_bind(), checkfirst=True)
    business_status.create(op.get_bind(), checkfirst=True)
    document_type.create(op.get_bind(), checkfirst=True)
    invitation_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "accounts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("auth_user_id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("account_type", account_type, nullable=False),
        sa.Column("role", account_role, nullable=False),
        sa.Column(
            "status",
            account_status,
            server_default="pending_onboarding",
            nullable=False,
        ),
        sa.Column(
            "onboarding_completed",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "mfa_required",
            sa.Boolean(),
            server_default=sa.text("false"),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("auth_user_id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_accounts_auth_user_id", "accounts", ["auth_user_id"])

    op.create_table(
        "business_accounts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("account_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=80), nullable=True),
        sa.Column("category", sa.String(length=120), nullable=False),
        sa.Column("county", sa.String(length=120), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column(
            "status",
            business_status,
            server_default="pending_activation",
            nullable=False,
        ),
        sa.Column(
            "verification_provider",
            sa.String(length=80),
            server_default="manual",
            nullable=False,
        ),
        sa.Column("verification_reference", sa.String(length=255), nullable=True),
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
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id"),
    )
    op.create_index("ix_business_accounts_status", "business_accounts", ["status"])

    op.create_table(
        "business_applications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("business_name", sa.String(length=255), nullable=False),
        sa.Column("business_email", sa.String(length=255), nullable=False),
        sa.Column("business_phone", sa.String(length=80), nullable=True),
        sa.Column("category", sa.String(length=120), nullable=False),
        sa.Column("county", sa.String(length=120), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("owner_name", sa.String(length=255), nullable=False),
        sa.Column("owner_email", sa.String(length=255), nullable=False),
        sa.Column("owner_phone", sa.String(length=80), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "status",
            review_status,
            server_default="pending_verification",
            nullable=False,
        ),
        sa.Column("reviewed_by_account_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_message", sa.Text(), nullable=True),
        sa.Column("created_business_id", sa.Uuid(), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["created_business_id"], ["business_accounts.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by_account_id"], ["accounts.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_business_applications_status", "business_applications", ["status"]
    )

    op.create_table(
        "business_claims",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("business_id", sa.Uuid(), nullable=False),
        sa.Column("claimant_name", sa.String(length=255), nullable=False),
        sa.Column("claimant_email", sa.String(length=255), nullable=False),
        sa.Column("claimant_phone", sa.String(length=80), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column(
            "status",
            claim_status,
            server_default="pending_verification",
            nullable=False,
        ),
        sa.Column("reviewed_by_account_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_message", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["business_id"], ["business_accounts.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by_account_id"], ["accounts.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_business_claims_status", "business_claims", ["status"])

    op.create_table(
        "verification_documents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=True),
        sa.Column("claim_id", sa.Uuid(), nullable=True),
        sa.Column("business_id", sa.Uuid(), nullable=True),
        sa.Column("document_type", document_type, nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("storage_path", sa.String(length=1000), nullable=False),
        sa.Column("mime_type", sa.String(length=120), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["application_id"], ["business_applications.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["business_id"], ["business_accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["claim_id"], ["business_claims.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "business_ownership_history",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("business_id", sa.Uuid(), nullable=False),
        sa.Column("account_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("performed_by_account_id", sa.Uuid(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["business_id"], ["business_accounts.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["performed_by_account_id"], ["accounts.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "admin_invitations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("account_id", sa.Uuid(), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=80), nullable=False),
        sa.Column(
            "status",
            invitation_status,
            server_default="pending",
            nullable=False,
        ),
        sa.Column("invited_by_account_id", sa.Uuid(), nullable=True),
        sa.Column("activation_link", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["invited_by_account_id"], ["accounts.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_admin_invitations_email", "admin_invitations", ["email"])

    op.create_table(
        "admin_audit_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("actor_account_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("subject_type", sa.String(length=120), nullable=False),
        sa.Column("subject_id", sa.Uuid(), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["actor_account_id"], ["accounts.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("admin_audit_logs")
    op.drop_index("ix_admin_invitations_email", table_name="admin_invitations")
    op.drop_table("admin_invitations")
    op.drop_table("business_ownership_history")
    op.drop_table("verification_documents")
    op.drop_index("ix_business_claims_status", table_name="business_claims")
    op.drop_table("business_claims")
    op.drop_index("ix_business_applications_status", table_name="business_applications")
    op.drop_table("business_applications")
    op.drop_index("ix_business_accounts_status", table_name="business_accounts")
    op.drop_table("business_accounts")
    op.drop_index("ix_accounts_auth_user_id", table_name="accounts")
    op.drop_table("accounts")
    invitation_status.drop(op.get_bind(), checkfirst=True)
    document_type.drop(op.get_bind(), checkfirst=True)
    business_status.drop(op.get_bind(), checkfirst=True)
    claim_status.drop(op.get_bind(), checkfirst=True)
    review_status.drop(op.get_bind(), checkfirst=True)
    account_status.drop(op.get_bind(), checkfirst=True)
    account_role.drop(op.get_bind(), checkfirst=True)
    account_type.drop(op.get_bind(), checkfirst=True)
