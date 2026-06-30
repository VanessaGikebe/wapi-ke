"""Tests for the assistant route (CLAUDE.md §8).

The model call (`app.services.assistant.generate_reply`) is monkeypatched so
these tests are deterministic and need no Anthropic API key — they exercise the
routing, session persistence, and suggestion-validation logic. One test covers
the real unconfigured path (no key -> 503).
"""

from __future__ import annotations

from sqlalchemy import select

import app.services.assistant as assistant_service
from app.models import AssistantSession
from tests.factories import seed_category

URL = "/api/v1/assistant/message"


def test_message_creates_session_and_returns_reply(
    client, db_session, monkeypatch
):
    seed_category(db_session)

    def fake(system_prompt, history, message):
        return {
            "reply": "Hello! What are you in the mood for?",
            "suggested_category_slug": None,
            "suggested_filters": None,
        }

    monkeypatch.setattr(assistant_service, "generate_reply", fake)

    response = client.post(URL, json={"message": "hi"})
    assert response.status_code == 200
    body = response.json()
    assert body["reply"].startswith("Hello!")
    assert body["session_id"]
    assert body["suggested_category"] is None
    assert body["suggested_filters"] is None


def test_session_continues_and_persists_history(
    client, db_session, monkeypatch
):
    seed_category(db_session)
    seen: dict[str, int] = {}

    def fake(system_prompt, history, message):
        seen["history_len"] = len(history)
        return {
            "reply": f"echo:{message}",
            "suggested_category_slug": None,
            "suggested_filters": None,
        }

    monkeypatch.setattr(assistant_service, "generate_reply", fake)

    first = client.post(URL, json={"message": "first"})
    session_id = first.json()["session_id"]
    assert seen["history_len"] == 0

    second = client.post(
        URL, json={"session_id": session_id, "message": "second"}
    )
    assert second.json()["session_id"] == session_id
    # The first turn (user + assistant) is now in history.
    assert seen["history_len"] == 2


def test_valid_suggestion_is_filtered_to_known_keys(
    client, db_session, monkeypatch
):
    seed_category(db_session)  # "widgets" with color/size/premium filters

    def fake(system_prompt, history, message):
        return {
            "reply": "I found a great match.",
            "suggested_category_slug": "widgets",
            "suggested_filters": {"color": ["Red"], "size": 5, "bogus": "x"},
        }

    monkeypatch.setattr(assistant_service, "generate_reply", fake)

    body = client.post(URL, json={"message": "something fun"}).json()
    assert body["suggested_category"] == "widgets"
    assert body["suggested_filters"] == {"color": ["Red"], "size": 5}
    assert "bogus" not in body["suggested_filters"]

    # Inferred fields persisted on the session.
    db_session.expire_all()
    session = db_session.scalar(select(AssistantSession))
    assert session.inferred_category_id is not None
    assert session.inferred_filters == {"color": ["Red"], "size": 5}


def test_invalid_slug_is_dropped(client, db_session, monkeypatch):
    seed_category(db_session)

    def fake(system_prompt, history, message):
        return {
            "reply": "Hmm.",
            "suggested_category_slug": "does-not-exist",
            "suggested_filters": {"color": ["Red"]},
        }

    monkeypatch.setattr(assistant_service, "generate_reply", fake)

    body = client.post(URL, json={"message": "x"}).json()
    assert body["suggested_category"] is None
    assert body["suggested_filters"] is None


def test_empty_message_is_rejected(client, db_session):
    response = client.post(URL, json={"message": ""})
    assert response.status_code == 422


def test_unconfigured_assistant_returns_503(client, db_session):
    # No ANTHROPIC_API_KEY in the test env -> service raises -> 503.
    seed_category(db_session)
    response = client.post(URL, json={"message": "hi"})
    assert response.status_code == 503
