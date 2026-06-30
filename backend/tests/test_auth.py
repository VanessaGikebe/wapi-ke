"""Tests for the JWT auth flow (CLAUDE.md §8)."""

from __future__ import annotations

from fastapi.testclient import TestClient

SIGNUP_URL = "/api/v1/auth/signup"
LOGIN_URL = "/api/v1/auth/login"
REFRESH_URL = "/api/v1/auth/refresh"
LOGOUT_URL = "/api/v1/auth/logout"
ME_URL = "/api/v1/auth/me"


def _signup(
    client: TestClient,
    email: str = "ada@example.com",
    password: str = "password123",
    name: str = "Ada Lovelace",
):
    return client.post(
        SIGNUP_URL,
        json={"email": email, "password": password, "name": name},
    )


def test_signup_returns_token_and_sets_refresh_cookie(client: TestClient):
    response = _signup(client)

    assert response.status_code == 201
    body = response.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "ada@example.com"
    assert body["user"]["name"] == "Ada Lovelace"
    # Access token must not leak the password hash anywhere in the user payload.
    assert "password_hash" not in body["user"]

    # Refresh token is an httpOnly cookie, not in the body.
    assert "access_token" not in response.cookies
    assert response.cookies.get("refresh_token")
    set_cookie = response.headers["set-cookie"]
    assert "refresh_token=" in set_cookie
    assert "HttpOnly" in set_cookie


def test_signup_duplicate_email_conflicts(client: TestClient):
    assert _signup(client).status_code == 201
    duplicate = _signup(client)
    assert duplicate.status_code == 409


def test_login_succeeds_and_rejects_bad_password(client: TestClient):
    _signup(client, email="grace@example.com")

    ok = client.post(
        LOGIN_URL,
        json={"email": "grace@example.com", "password": "password123"},
    )
    assert ok.status_code == 200
    assert ok.json()["access_token"]
    assert ok.cookies.get("refresh_token")

    bad = client.post(
        LOGIN_URL,
        json={"email": "grace@example.com", "password": "wrong-password"},
    )
    assert bad.status_code == 401


def test_login_unknown_email_unauthorized(client: TestClient):
    response = client.post(
        LOGIN_URL,
        json={"email": "nobody@example.com", "password": "password123"},
    )
    assert response.status_code == 401


def test_refresh_with_cookie_issues_new_access_token(client: TestClient):
    # Signup stores the refresh cookie in the client's jar.
    _signup(client, email="refresh@example.com")

    response = client.post(REFRESH_URL)
    assert response.status_code == 200
    assert response.json()["access_token"]
    # Cookie is rotated.
    assert response.cookies.get("refresh_token")


def test_refresh_without_cookie_unauthorized(client: TestClient):
    response = client.post(REFRESH_URL)
    assert response.status_code == 401


def test_refresh_rejects_access_token_as_refresh(client: TestClient):
    access_token = _signup(client, email="mix@example.com").json()[
        "access_token"
    ]
    # Present an access token where a refresh token is expected.
    client.cookies.set(
        "refresh_token", access_token, path="/api/v1/auth"
    )
    response = client.post(REFRESH_URL)
    assert response.status_code == 401


def test_protected_route_requires_valid_token(client: TestClient):
    access_token = _signup(client, email="me@example.com").json()[
        "access_token"
    ]

    # No token -> 401
    assert client.get(ME_URL).status_code == 401

    # Malformed / invalid token -> 401
    bad = client.get(
        ME_URL, headers={"Authorization": "Bearer not.a.real.token"}
    )
    assert bad.status_code == 401

    # Valid access token -> 200 with the user
    ok = client.get(
        ME_URL, headers={"Authorization": f"Bearer {access_token}"}
    )
    assert ok.status_code == 200
    assert ok.json()["email"] == "me@example.com"


def test_logout_clears_refresh_cookie(client: TestClient):
    _signup(client, email="bye@example.com")
    response = client.post(LOGOUT_URL)
    assert response.status_code == 200
    # The Set-Cookie header expires the refresh cookie.
    assert 'refresh_token=""' in response.headers["set-cookie"] or (
        "refresh_token=;" in response.headers["set-cookie"]
    )
