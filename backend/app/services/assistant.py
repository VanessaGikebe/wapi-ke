"""AI assistant service — talks to Google **Gemini 2.5 Flash** server-side.

The assistant chats conversationally to learn the user's mood, occasion, group
size, budget, location, and interests, and — once it has enough signal —
recommends a category and concrete filter values. Structured fields are returned
as strict JSON (Gemini JSON mode), so the frontend gets reliable
`reply` / `suggested_category_slug` / `suggested_filters` every turn.
"""

from __future__ import annotations

import json
from typing import Any

from google import genai
from google.genai import errors, types

from app.config import get_settings

settings = get_settings()

MODEL = "gemini-2.5-flash"

# JSON shape the model must return every turn (`suggested_*` stay null until the
# assistant is confident, so the frontend knows when to show the CTA).
_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "reply": {"type": "string"},
        "suggested_category_slug": {"type": "string", "nullable": True},
        "suggested_filters": {"type": "object", "nullable": True},
    },
    "required": ["reply", "suggested_category_slug", "suggested_filters"],
}


class AssistantUnavailable(Exception):
    """Raised when the assistant can't run (no API key, or upstream error)."""


def build_system_prompt(categories: list[dict[str, Any]]) -> str:
    """Build the grounding system prompt from the live category/filter schema."""

    catalog = json.dumps(categories, ensure_ascii=False)
    return (
        "You are Wapike's friendly local concierge for premium Kenyan "
        "experiences — restaurants, hikes, nightlife, staycations, cafés, and "
        "more. Through natural, warm conversation, learn the user's mood, "
        "occasion, group size, budget, location, and interests. Ask only one "
        "or two short questions per turn; never interrogate.\n\n"
        "Once you have enough signal (usually after the user shares a couple "
        "of preferences), pick the single best-matching category and set "
        "`suggested_category_slug` to its exact slug, and `suggested_filters` "
        "to an object keyed by that category's filter keys using valid values "
        "(enum option values, a number within a range filter's min/max as a "
        "maximum, or true/false for booleans). Until then, keep both null and "
        "keep the conversation going. In your `reply`, preview the "
        "recommendation and invite the user to view the matching experiences.\n\n"
        "Always respond with ONLY a JSON object (no markdown, no code fences) "
        "with exactly these keys:\n"
        '  - "reply": string — your warm, concise message (never include raw '
        "JSON in it).\n"
        '  - "suggested_category_slug": string or null — the exact slug of the '
        "best category once confident, else null.\n"
        '  - "suggested_filters": object or null — filter values keyed by that '
        "category's filter keys, else null.\n\n"
        f"Available categories and their filters (JSON):\n{catalog}"
    )


def _to_contents(
    history: list[dict[str, str]], message: str
) -> list[dict[str, Any]]:
    """Map our stored history + new message to Gemini's contents format."""

    contents: list[dict[str, Any]] = []
    for turn in history:
        role = "model" if turn.get("role") == "assistant" else "user"
        contents.append(
            {"role": role, "parts": [{"text": turn.get("content", "")}]}
        )
    contents.append({"role": "user", "parts": [{"text": message}]})
    return contents


def _parse(raw: str | None) -> dict[str, Any]:
    """Parse the model's JSON, tolerating stray code fences; never crash."""

    text = (raw or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except (ValueError, TypeError):
        pass
    # Fallback: treat the whole thing as the reply, no suggestion.
    return {"reply": text, "suggested_category_slug": None, "suggested_filters": None}


def generate_reply(
    system_prompt: str,
    history: list[dict[str, str]],
    message: str,
) -> dict[str, Any]:
    """Call Gemini and return {reply, suggested_category_slug,
    suggested_filters}. Raises AssistantUnavailable on config/API failure."""

    if not settings.gemini_api_key:
        raise AssistantUnavailable(
            "Assistant is not configured (GEMINI_API_KEY is not set)."
        )

    client = genai.Client(api_key=settings.gemini_api_key)

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=_to_contents(history, message),
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=_RESPONSE_SCHEMA,
                temperature=0.7,
                max_output_tokens=1024,
            ),
        )
    except errors.APIError as exc:  # auth / rate limit / upstream
        status_code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
        if status_code == 429:
            raise AssistantUnavailable(
                "The assistant is busy right now — please try again in a moment."
            ) from exc
        raise AssistantUnavailable(str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 — network/unknown, degrade gracefully
        raise AssistantUnavailable(str(exc)) from exc

    data = _parse(response.text)
    return {
        "reply": data.get("reply", ""),
        "suggested_category_slug": data.get("suggested_category_slug"),
        "suggested_filters": data.get("suggested_filters"),
    }
