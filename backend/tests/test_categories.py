"""Tests for category reads + server-side JSONB filtering (CLAUDE.md §8)."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.factories import seed_category

EXPERIENCES_URL = "/api/v1/categories/widgets/experiences"


def test_list_categories(client: TestClient, db_session: Session):
    seed_category(db_session)
    response = client.get("/api/v1/categories")
    assert response.status_code == 200
    assert any(c["slug"] == "widgets" for c in response.json())


def test_get_category_and_404(client: TestClient, db_session: Session):
    seed_category(db_session)
    assert client.get("/api/v1/categories/widgets").json()["name"] == "Widgets"
    assert client.get("/api/v1/categories/missing").status_code == 404


def test_get_filters(client: TestClient, db_session: Session):
    seed_category(db_session)
    response = client.get("/api/v1/categories/widgets/filters")
    assert response.status_code == 200
    by_key = {f["key"]: f["type"] for f in response.json()}
    assert by_key == {"color": "enum", "size": "range", "premium": "boolean"}


def test_no_filters_returns_all(client: TestClient, db_session: Session):
    seed_category(db_session)
    body = client.get(EXPERIENCES_URL).json()
    assert body["total"] == 5
    assert len(body["items"]) == 5


# --- enum -------------------------------------------------------------------


def test_enum_filter_narrows(client: TestClient, db_session: Session):
    seed_category(db_session)
    # color=Red -> E1 (scalar "Red") + E4 (array contains "Red") = 2
    body = client.get(EXPERIENCES_URL, params={"color": "Red"}).json()
    assert body["total"] == 2
    titles = {item["title"] for item in body["items"]}
    assert titles == {"E1 Red Small Premium", "E4 RedBlue Max"}


def test_enum_filter_multi_value_is_or(client: TestClient, db_session: Session):
    seed_category(db_session)
    # color in {Red, Green} -> E1, E3, E4, E5
    body = client.get(
        EXPERIENCES_URL, params=[("color", "Red"), ("color", "Green")]
    ).json()
    assert body["total"] == 4


# --- range ------------------------------------------------------------------


def test_range_filter_narrows(client: TestClient, db_session: Session):
    seed_category(db_session)
    # size <= 5 -> E1 (2), E2 (5), E5 (3) = 3
    body = client.get(EXPERIENCES_URL, params={"size": "5"}).json()
    assert body["total"] == 3
    assert all(item["attributes"]["size"] <= 5 for item in body["items"])


# --- boolean ----------------------------------------------------------------


def test_boolean_filter_narrows(client: TestClient, db_session: Session):
    seed_category(db_session)
    # premium=true -> E1, E3, E5 = 3
    body = client.get(EXPERIENCES_URL, params={"premium": "true"}).json()
    assert body["total"] == 3
    assert all(item["attributes"]["premium"] is True for item in body["items"])


def test_boolean_false_does_not_filter(
    client: TestClient, db_session: Session
):
    seed_category(db_session)
    # premium=false is a no-op (matches frontend semantics) -> all 5
    body = client.get(EXPERIENCES_URL, params={"premium": "false"}).json()
    assert body["total"] == 5


# --- combined / pagination / robustness ------------------------------------


def test_combined_filters_and_together(
    client: TestClient, db_session: Session
):
    seed_category(db_session)
    # color=Green AND premium=true -> E3, E5
    body = client.get(
        EXPERIENCES_URL, params={"color": "Green", "premium": "true"}
    ).json()
    assert body["total"] == 2
    assert {i["title"] for i in body["items"]} == {
        "E3 Green Large Premium",
        "E5 Green Small Premium",
    }


def test_unknown_param_ignored(client: TestClient, db_session: Session):
    seed_category(db_session)
    body = client.get(EXPERIENCES_URL, params={"bogus": "whatever"}).json()
    assert body["total"] == 5


def test_pagination(client: TestClient, db_session: Session):
    seed_category(db_session)
    page1 = client.get(
        EXPERIENCES_URL, params={"page": "1", "limit": "2"}
    ).json()
    assert page1["total"] == 5
    assert page1["pages"] == 3
    assert len(page1["items"]) == 2

    page3 = client.get(
        EXPERIENCES_URL, params={"page": "3", "limit": "2"}
    ).json()
    assert len(page3["items"]) == 1
