"""account types + business onboarding + admin RBAC

Replaces the self-promotion role model (``users.role`` + ``users.is_admin``)
with three separate account types (``users.account_type``) and a dedicated
``admin_roles`` tier table. Adds the full business-onboarding schema
(applications, businesses, verification, documents, owners, business-based
claims), admin invitations, and a general audit log.

Revision ID: d4e5f6a7b8c9
Revises: c9d1e2f3a4b5
Create Date: 2026-07-06 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c9d1e2f3a4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# --- New enum types (created explicitly, referenced with create_type=False) --

account_type = postgresql.ENUM(
    "user", "business", "admin", name="account_type", create_type=False
)
admin_role = postgresql.ENUM(
    "moderator", "administrator", "super_admin",
    name="admin_role", create_type=False,
)
invitation_status = postgresql.ENUM(
    "pending", "accepted", "expired", "revoked",
    name="invitation_status", create_type=False,
)
business_type = postgresql.ENUM(
    "sole_proprietorship", "partnership", "limited_company", "ngo", "cbo",
    "cooperative", "other", name="business_type", create_type=False,
)
application_status = postgresql.ENUM(
    "submitted", "pending_verification", "verified", "verification_failed",
    "pending_approval", "more_info_requested", "approved", "rejected",
    name="application_status", create_type=False,
)
business_status = postgresql.ENUM(
    "approved", "suspended", name="business_status", create_type=False,
)
verification_status = postgresql.ENUM(
    "pending", "verified", "failed",
    name="verification_status", create_type=False,
)
document_type = postgresql.ENUM(
    "registration_certificate", "business_logo", "cover_image", "national_id",
    "business_permit", "tourism_licence", "ownership_proof",
    name="document_type", create_type=False,
)
# claim_status is re-created here with an extra value (more_info_requested).
claim_status = postgresql.ENUM(
    "pending", "more_info_requested", "approved", "rejected",
    name="claim_status", create_type=False,
)
owner_role = postgresql.ENUM(
    "owner", "manager", "staff", name="owner_role", create_type=False,
)

_NEW_ENUMS = (
    account_type, admin_role, invitation_status, business_type,
    application_status, business_status, verification_status, document_type,
    claim_status, owner_role,
)

_TIMESTAMP = sa.DateTime(timezone=True)
_NOW = sa.text("now()")


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Drop the old experience-based business_claims + its enum. It is
    #    recreated below with a new business-based shape.
    op.drop_index("ix_business_claims_manager", table_name="business_claims")
    op.drop_index("ix_business_claims_status", table_name="business_claims")
    op.drop_table("business_claims")
    op.execute("DROP TYPE IF EXISTS claim_status")

    # 2. Create the new enum types.
    for enum in _NEW_ENUMS:
        enum.create(bind, checkfirst=True)

    # 3. users: account_type / phone / is_active; migrate off role + is_admin.
    op.add_column(
        "users",
        sa.Column(
            "account_type", account_type,
            server_default="user", nullable=False,
        ),
    )
    # Existing admins (either mechanism) -> admin; business managers -> business.
    op.execute(
        "UPDATE users SET account_type = 'admin' "
        "WHERE is_admin = true OR role = 'administrator'"
    )
    op.execute(
        "UPDATE users SET account_type = 'business' "
        "WHERE account_type = 'user' AND role = 'business_manager'"
    )
    op.add_column("users", sa.Column("phone", sa.String(32), nullable=True))
    op.add_column(
        "users",
        sa.Column(
            "is_active", sa.Boolean(),
            server_default=sa.text("true"), nullable=False,
        ),
    )
    op.drop_column("users", "is_admin")
    op.drop_column("users", "role")
    op.execute("DROP TYPE IF EXISTS user_role")

    # 4. businesses (referenced by applications/claims/owners).
    op.create_table(
        "businesses",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("registration_number", sa.String(100), nullable=True),
        sa.Column("business_type", business_type, nullable=False),
        sa.Column("kra_pin", sa.String(50), nullable=True),
        sa.Column("year_established", sa.Integer(), nullable=True),
        sa.Column("primary_category_id", sa.Uuid(), nullable=True),
        sa.Column("secondary_category_id", sa.Uuid(), nullable=True),
        sa.Column("county", sa.String(100), nullable=True),
        sa.Column("town", sa.String(100), nullable=True),
        sa.Column("physical_address", sa.Text(), nullable=True),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("logo_url", sa.String(1000), nullable=True),
        sa.Column("cover_image_url", sa.String(1000), nullable=True),
        sa.Column(
            "status", business_status,
            server_default="approved", nullable=False,
        ),
        sa.Column(
            "is_verified", sa.Boolean(),
            server_default=sa.text("false"), nullable=False,
        ),
        sa.Column("created_at", _TIMESTAMP, server_default=_NOW, nullable=False),
        sa.Column("updated_at", _TIMESTAMP, server_default=_NOW, nullable=False),
        sa.ForeignKeyConstraint(
            ["primary_category_id"], ["categories.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["secondary_category_id"], ["categories.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_businesses_status", "businesses", ["status"])

    # 5. business_applications (pre-auth submissions).
    op.create_table(
        "business_applications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("business_email", sa.String(255), nullable=False),
        sa.Column("business_name", sa.String(255), nullable=False),
        sa.Column("registration_number", sa.String(100), nullable=True),
        sa.Column("business_type", business_type, nullable=False),
        sa.Column("kra_pin", sa.String(50), nullable=True),
        sa.Column("year_established", sa.Integer(), nullable=True),
        sa.Column("owner_full_name", sa.String(255), nullable=False),
        sa.Column("owner_national_id", sa.String(50), nullable=False),
        sa.Column("owner_phone", sa.String(32), nullable=False),
        sa.Column("owner_email", sa.String(255), nullable=False),
        sa.Column(
            "owner_phone_verified", sa.Boolean(),
            server_default=sa.text("false"), nullable=False,
        ),
        sa.Column("county", sa.String(100), nullable=True),
        sa.Column("town", sa.String(100), nullable=True),
        sa.Column("physical_address", sa.Text(), nullable=True),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("primary_category_id", sa.Uuid(), nullable=True),
        sa.Column("secondary_category_id", sa.Uuid(), nullable=True),
        sa.Column(
            "status", application_status,
            server_default="submitted", nullable=False,
        ),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", _TIMESTAMP, nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("business_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", _TIMESTAMP, server_default=_NOW, nullable=False),
        sa.Column("updated_at", _TIMESTAMP, server_default=_NOW, nullable=False),
        sa.ForeignKeyConstraint(
            ["primary_category_id"], ["categories.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["secondary_category_id"], ["categories.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["business_id"], ["businesses.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_business_applications_status", "business_applications", ["status"]
    )
    op.create_index(
        "ix_business_applications_email",
        "business_applications", ["business_email"],
    )

    # 6. business_claims (claim an existing business).
    op.create_table(
        "business_claims",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("business_id", sa.Uuid(), nullable=False),
        sa.Column("claimant_email", sa.String(255), nullable=False),
        sa.Column("claimant_name", sa.String(255), nullable=False),
        sa.Column("claimant_phone", sa.String(32), nullable=True),
        sa.Column("claimant_national_id", sa.String(50), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column(
            "status", claim_status,
            server_default="pending", nullable=False,
        ),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", _TIMESTAMP, nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("resulting_user_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", _TIMESTAMP, server_default=_NOW, nullable=False),
        sa.ForeignKeyConstraint(
            ["business_id"], ["businesses.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["resulting_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_business_claims_status", "business_claims", ["status"])
    op.create_index(
        "ix_business_claims_business", "business_claims", ["business_id"]
    )

    # 7. business_documents (attach to an application XOR a claim).
    op.create_table(
        "business_documents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=True),
        sa.Column("claim_id", sa.Uuid(), nullable=True),
        sa.Column("doc_type", document_type, nullable=False),
        sa.Column("bucket", sa.String(100), nullable=False),
        sa.Column("storage_path", sa.String(500), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=True),
        sa.Column("content_type", sa.String(100), nullable=True),
        sa.Column(
            "uploaded_at", _TIMESTAMP, server_default=_NOW, nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["application_id"], ["business_applications.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["claim_id"], ["business_claims.id"], ondelete="CASCADE"
        ),
        sa.CheckConstraint(
            "(application_id IS NOT NULL) <> (claim_id IS NOT NULL)",
            name="ck_business_documents_one_parent",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_business_documents_application",
        "business_documents", ["application_id"],
    )
    op.create_index(
        "ix_business_documents_claim", "business_documents", ["claim_id"]
    )

    # 8. business_verifications (one-to-one with an application).
    op.create_table(
        "business_verifications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=False),
        sa.Column(
            "provider", sa.String(50),
            server_default="manual", nullable=False,
        ),
        sa.Column(
            "status", verification_status,
            server_default="pending", nullable=False,
        ),
        sa.Column("verified_registration_number", sa.String(100), nullable=True),
        sa.Column("verified_business_name", sa.String(255), nullable=True),
        sa.Column("registration_status", sa.String(100), nullable=True),
        sa.Column("verified_business_type", sa.String(100), nullable=True),
        sa.Column("registration_date", _TIMESTAMP, nullable=True),
        sa.Column("director_info", postgresql.JSONB(), nullable=True),
        sa.Column("raw_response", postgresql.JSONB(), nullable=True),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", _TIMESTAMP, nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", _TIMESTAMP, server_default=_NOW, nullable=False),
        sa.ForeignKeyConstraint(
            ["application_id"], ["business_applications.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "application_id", name="uq_business_verifications_application"
        ),
    )

    # 9. business_owners (business <-> user membership).
    op.create_table(
        "business_owners",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("business_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "role", owner_role, server_default="owner", nullable=False
        ),
        sa.Column("created_at", _TIMESTAMP, server_default=_NOW, nullable=False),
        sa.ForeignKeyConstraint(
            ["business_id"], ["businesses.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("business_id", "user_id", name="uq_business_owner"),
    )

    # 10. admin_roles (admin tier per admin account) + backfill existing admins.
    op.create_table(
        "admin_roles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", admin_role, nullable=False),
        sa.Column("granted_by", sa.Uuid(), nullable=True),
        sa.Column("granted_at", _TIMESTAMP, server_default=_NOW, nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["granted_by"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_admin_roles_user"),
    )
    # Existing admins default to the 'administrator' tier; promote to super_admin
    # deliberately via scripts/create_admin.py.
    op.execute(
        "INSERT INTO admin_roles (id, user_id, role, granted_at) "
        "SELECT gen_random_uuid(), id, 'administrator', now() "
        "FROM users WHERE account_type = 'admin'"
    )

    # 11. admin_invitations.
    op.create_table(
        "admin_invitations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", admin_role, nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column(
            "status", invitation_status,
            server_default="pending", nullable=False,
        ),
        sa.Column("invited_by", sa.Uuid(), nullable=True),
        sa.Column("expires_at", _TIMESTAMP, nullable=False),
        sa.Column("accepted_at", _TIMESTAMP, nullable=True),
        sa.Column("created_at", _TIMESTAMP, server_default=_NOW, nullable=False),
        sa.ForeignKeyConstraint(
            ["invited_by"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_admin_invitations_token"),
    )
    op.create_index(
        "ix_admin_invitations_email", "admin_invitations", ["email"]
    )

    # 12. audit_logs (general privileged-action trail).
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=True),
        sa.Column("data", postgresql.JSONB(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", _TIMESTAMP, server_default=_NOW, nullable=False),
        sa.ForeignKeyConstraint(
            ["actor_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_created", "audit_logs", ["created_at"])
    op.create_index(
        "ix_audit_logs_entity", "audit_logs", ["entity_type", "entity_id"]
    )

    # 13. experiences.business_id (link a listing to a live business).
    op.add_column(
        "experiences", sa.Column("business_id", sa.Uuid(), nullable=True)
    )
    op.create_foreign_key(
        "fk_experiences_business_id", "experiences", "businesses",
        ["business_id"], ["id"], ondelete="SET NULL",
    )
    op.create_index(
        "ix_experiences_business_id", "experiences", ["business_id"]
    )


def downgrade() -> None:
    # experiences.business_id
    op.drop_index("ix_experiences_business_id", table_name="experiences")
    op.drop_constraint(
        "fk_experiences_business_id", "experiences", type_="foreignkey"
    )
    op.drop_column("experiences", "business_id")

    # New tables (reverse dependency order).
    op.drop_table("audit_logs")
    op.drop_table("admin_invitations")
    op.drop_table("admin_roles")
    op.drop_table("business_owners")
    op.drop_table("business_verifications")
    op.drop_table("business_documents")
    op.drop_table("business_claims")
    op.drop_table("business_applications")
    op.drop_table("businesses")

    # Restore users.role + is_admin from account_type.
    op.execute("CREATE TYPE user_role AS ENUM "
               "('user', 'business_manager', 'administrator')")
    op.add_column(
        "users",
        sa.Column(
            "role",
            postgresql.ENUM(name="user_role", create_type=False),
            server_default="user", nullable=False,
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "is_admin", sa.Boolean(),
            server_default=sa.text("false"), nullable=False,
        ),
    )
    op.execute(
        "UPDATE users SET role = 'administrator', is_admin = true "
        "WHERE account_type = 'admin'"
    )
    op.execute(
        "UPDATE users SET role = 'business_manager' "
        "WHERE account_type = 'business'"
    )
    op.drop_column("users", "is_active")
    op.drop_column("users", "phone")
    op.drop_column("users", "account_type")

    # Drop new enum types (claim_status is recreated in its old 3-value form).
    for name in (
        "owner_role", "claim_status", "document_type", "verification_status",
        "business_status", "application_status", "business_type",
        "invitation_status", "admin_role", "account_type",
    ):
        op.execute(f"DROP TYPE IF EXISTS {name}")

    # Recreate the old experience-based business_claims + claim_status(3).
    op.execute(
        "CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected')"
    )
    op.create_table(
        "business_claims",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("experience_id", sa.Uuid(), nullable=False),
        sa.Column("manager_id", sa.Uuid(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(name="claim_status", create_type=False),
            server_default="pending", nullable=False,
        ),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", _TIMESTAMP, nullable=True),
        sa.Column("created_at", _TIMESTAMP, server_default=_NOW, nullable=False),
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
