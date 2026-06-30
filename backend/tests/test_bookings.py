"""Tests for booking + favorites-list routes (auth-gated)."""

from __future__ import annotations

import uuid

from tests.factories import experience_ids, seed_category


def _auth_header(client, email: str = "booker@example.com") -> dict:
    token = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "password123", "name": "Booker"},
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_booking_requires_auth(client, db_session):
    seed_category(db_session)
    exp_id = experience_ids(db_session)[0]
    response = client.post(
        "/api/v1/bookings", json={"experience_id": str(exp_id)}
    )
    assert response.status_code == 401


def test_create_booking_requested_and_list(client, db_session):
    seed_category(db_session)
    exp_id = experience_ids(db_session)[0]
    headers = _auth_header(client)

    created = client.post(
        "/api/v1/bookings",
        json={"experience_id": str(exp_id), "requested_date": "2026-08-01"},
        headers=headers,
    )
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "requested"
    assert body["requested_date"] == "2026-08-01"
    assert body["experience"]["category_slug"] == "widgets"

    listed = client.get("/api/v1/bookings", headers=headers)
    assert listed.status_code == 200
    bookings = listed.json()
    assert len(bookings) == 1
    assert bookings[0]["experience"]["id"] == str(exp_id)


def test_create_booking_unknown_experience_404(client, db_session):
    headers = _auth_header(client)
    response = client.post(
        "/api/v1/bookings",
        json={"experience_id": str(uuid.uuid4())},
        headers=headers,
    )
    assert response.status_code == 404


def test_list_favorites(client, db_session):
    seed_category(db_session)
    exp_id = experience_ids(db_session)[0]
    headers = _auth_header(client, email="favlist@example.com")

    assert client.get("/api/v1/favorites").status_code == 401

    client.post(f"/api/v1/favorites/{exp_id}", headers=headers)
    response = client.get("/api/v1/favorites", headers=headers)
    assert response.status_code == 200
    favorites = response.json()
    assert len(favorites) == 1
    assert favorites[0]["experience"]["id"] == str(exp_id)
