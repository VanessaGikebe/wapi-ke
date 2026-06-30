"""Tests for the experience detail + featured endpoints."""

from __future__ import annotations

import uuid

from tests.factories import experience_ids, seed_category


def test_get_experience_includes_category_slug(client, db_session):
    seed_category(db_session)
    exp_id = experience_ids(db_session)[0]

    response = client.get(f"/api/v1/experiences/{exp_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(exp_id)
    assert body["category_slug"] == "widgets"


def test_get_unknown_experience_404(client, db_session):
    response = client.get(f"/api/v1/experiences/{uuid.uuid4()}")
    assert response.status_code == 404


def test_featured_experiences(client, db_session):
    seed_category(db_session)
    response = client.get("/api/v1/experiences/featured?limit=3")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 3
    assert all("category_slug" in e for e in body)


def test_listing_includes_category_slug(client, db_session):
    seed_category(db_session)
    body = client.get("/api/v1/categories/widgets/experiences").json()
    assert body["items"][0]["category_slug"] == "widgets"
