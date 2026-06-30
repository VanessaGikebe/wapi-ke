"""Pytest fixtures: an isolated Postgres test database.

Derives a `<db>_test` database from `DATABASE_URL`, creates it if missing,
builds the schema from the models, truncates between tests, and points the app
at it via a `get_db` dependency override.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

import app.models  # noqa: F401  (register models on Base.metadata)
from app.config import get_settings
from app.db import Base, get_db
from app.main import app

settings = get_settings()

_base_url, _db_name = settings.database_url.rsplit("/", 1)
TEST_DB_NAME = f"{_db_name}_test"
TEST_DATABASE_URL = f"{_base_url}/{TEST_DB_NAME}"

test_engine = create_engine(TEST_DATABASE_URL, future=True)
TestingSessionLocal = sessionmaker(
    bind=test_engine, autoflush=False, autocommit=False
)


@pytest.fixture(scope="session", autouse=True)
def _setup_database() -> Iterator[None]:
    # CREATE DATABASE must run outside a transaction (autocommit).
    admin_engine = create_engine(
        settings.database_url, isolation_level="AUTOCOMMIT", future=True
    )
    with admin_engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": TEST_DB_NAME},
        ).scalar()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{TEST_DB_NAME}"'))
    admin_engine.dispose()

    Base.metadata.drop_all(test_engine)
    Base.metadata.create_all(test_engine)
    yield
    test_engine.dispose()


def _override_get_db() -> Iterator[Session]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
def _clean_tables(_setup_database: None) -> Iterator[None]:
    tables = ", ".join(
        f'"{table.name}"' for table in Base.metadata.sorted_tables
    )
    with test_engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    yield


@pytest.fixture
def db_session() -> Iterator[Session]:
    """A session against the test DB for seeding data inside a test."""

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client
