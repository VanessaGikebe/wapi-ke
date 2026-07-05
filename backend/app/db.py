"""SQLAlchemy 2.0 database wiring.

This module sets up the engine, session factory, and declarative base. No ORM
models are defined yet — those arrive in a later phase. Alembic imports
``Base`` from here so future migrations can autogenerate against it.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings

settings = get_settings()


def _normalize_db_url(url: str) -> str:
    """Accept a bare ``postgresql://`` URL (as Render/Supabase provide) and make
    SQLAlchemy use the psycopg 3 driver."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    if url.startswith("postgres://"):  # some providers use this alias
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    return url


engine = create_engine(
    _normalize_db_url(settings.database_url), pool_pre_ping=True, future=True
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    """Declarative base for all ORM models (none defined yet)."""


def get_db():
    """FastAPI dependency that yields a database session and closes it."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
