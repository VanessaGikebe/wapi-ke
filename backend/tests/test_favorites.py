"""Tests for the auth-gated favorites routes (CLAUDE.md §8)."""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Favorite
from tests.factories import experience_ids, seed_category


def _auth_header(client: TestClient, email: str = "fav@example.com") -> dict:
    token = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "password123", "name": "Fav User"},
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_favorite_requires_auth(client: TestClient, db_session: Session):
    seed_category(db_session)
    exp_id = experience_ids(db_session)[0]

    assert client.post(f"/api/v1/favorites/{exp_id}").status_code == 401
    assert client.delete(f"/api/v1/favorites/{exp_id}").status_code == 401


def test_favorite_add_is_idempotent_and_persists(
    client: TestClient, db_session: Session
):
    seed_category(db_session)
    exp_id = experience_ids(db_session)[0]
    headers = _auth_header(client)

    first = client.post(f"/api/v1/favorites/{exp_id}", headers=headers)
    assert first.status_code == 201
    assert first.json()["favorited"] is True

    # Re-favoriting is a no-op, still 201, no duplicate row.
    second = client.post(f"/api/v1/favorites/{exp_id}", headers=headers)
    assert second.status_code == 201

    count = db_session.scalar(
        select(func.count()).select_from(Favorite)
    )
    assert count == 1


def test_favorite_remove(client: TestClient, db_session: Session):
    seed_category(db_session)
    exp_id = experience_ids(db_session)[0]
    headers = _auth_header(client)

    client.post(f"/api/v1/favorites/{exp_id}", headers=headers)
    deleted = client.delete(f"/api/v1/favorites/{exp_id}", headers=headers)
    assert deleted.status_code == 204

    count = db_session.scalar(select(func.count()).select_from(Favorite))
    assert count == 0

    # Deleting again is still 204 (idempotent).
    assert (
        client.delete(f"/api/v1/favorites/{exp_id}", headers=headers).status_code
        == 204
    )


def test_favorite_unknown_experience_404(
    client: TestClient, db_session: Session
):
    headers = _auth_header(client)
    fake_id = uuid.uuid4()
    response = client.post(f"/api/v1/favorites/{fake_id}", headers=headers)
    assert response.status_code == 404
