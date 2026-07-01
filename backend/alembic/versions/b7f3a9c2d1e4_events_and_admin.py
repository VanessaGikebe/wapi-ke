"""events table + user is_admin

Revision ID: b7f3a9c2d1e4
Revises: 39497c24ac76
Create Date: 2026-07-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "b7f3a9c2d1e4"
down_revision: Union[str, None] = "39497c24ac76"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_admin",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )

    op.create_table(
        "events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("slug", sa.String(length=320), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("venue", sa.String(length=255), nullable=True),
        sa.Column("county", sa.String(length=120), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("image_url", sa.String(length=1000), nullable=True),
        sa.Column("organizer", sa.String(length=255), nullable=True),
        sa.Column("contact", sa.String(length=255), nullable=True),
        sa.Column("ticket_url", sa.String(length=1000), nullable=True),
        sa.Column("ticket_price", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column(
            "currency",
            sa.String(length=3),
            server_default="KES",
            nullable=False,
        ),
        sa.Column("start_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_datetime", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "featured",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "upcoming",
                "ongoing",
                "ended",
                "archived",
                name="event_status",
            ),
            server_default="upcoming",
            nullable=False,
        ),
        sa.Column("source", sa.String(length=100), nullable=True),
        sa.Column("source_uid", sa.String(length=255), nullable=True),
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
        sa.UniqueConstraint("slug"),
        sa.UniqueConstraint("source", "source_uid", name="uq_event_source_uid"),
    )
    op.create_index("ix_events_start_datetime", "events", ["start_datetime"])
    op.create_index("ix_events_status", "events", ["status"])
    op.create_index("ix_events_county", "events", ["county"])
    op.create_index("ix_events_category", "events", ["category"])
    op.create_index("ix_events_featured", "events", ["featured"])


def downgrade() -> None:
    op.drop_index("ix_events_featured", table_name="events")
    op.drop_index("ix_events_category", table_name="events")
    op.drop_index("ix_events_county", table_name="events")
    op.drop_index("ix_events_status", table_name="events")
    op.drop_index("ix_events_start_datetime", table_name="events")
    op.drop_table("events")
    op.execute("DROP TYPE IF EXISTS event_status")
    op.drop_column("users", "is_admin")
