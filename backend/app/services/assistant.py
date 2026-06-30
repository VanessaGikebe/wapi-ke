"""AI assistant service — talks to the Anthropic API server-side.

The assistant chats conversationally to learn the user's mood, occasion, group
size, budget, location, and interests, and — once it has enough signal —
recommends a category and concrete filter values. The structured fields are
returned via a forced tool call (`provide_response`), not parsed loosely from
free text, so the frontend gets reliable `reply` / `suggested_category_slug` /
`suggested_filters` every turn.
"""

from __future__ import annotations

import json
from typing import Any

import anthropic

from app.config import get_settings

settings = get_settings()

MODEL = "claude-opus-4-8"

# Forced tool: every turn returns this structure. `suggested_*` stay null until
# the assistant is confident, so the frontend knows when to show the CTA.
RESPONSE_TOOL: dict[str, Any] = {
    "name": "provide_response",
    "description": (
        "Return your conversational reply to the user, plus an optional "
        "category recommendation once you have enough signal."
    ),
    "input_schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "reply": {
                "type": "string",
                "description": (
                    "Your warm, concise message to the user. Ask one or two "
                    "short questions, or — when recommending — preview what you "
                    "found and invite them to view it. Never include raw JSON."
                ),
            },
            "suggested_category_slug": {
                "anyOf": [{"type": "string"}, {"type": "null"}],
                "description": (
                    "Exact slug of the single best-matching category once "
                    "confident; otherwise null. Must be one of the provided "
                    "category slugs."
                ),
            },
            "suggested_filters": {
                "anyOf": [{"type": "object"}, {"type": "null"}],
                "description": (
                    "Filter values for the suggested category, keyed by the "
                    "category's filter keys. Use valid enum option values, a "
                    "number within a range filter's min/max, or true/false for "
                    "boolean filters. Null until a category is suggested."
                ),
            },
        },
        "required": [
            "reply",
            "suggested_category_slug",
            "suggested_filters",
        ],
    },
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
        "recommendation and invite the user to view the matching experiences.\n"
        "\nAlways respond by calling the provide_response tool.\n\n"
        f"Available categories and their filters (JSON):\n{catalog}"
    )


def generate_reply(
    system_prompt: str,
    history: list[dict[str, str]],
    message: str,
) -> dict[str, Any]:
    """Call the model and return {reply, suggested_category_slug,
    suggested_filters}. Raises AssistantUnavailable on config/API failure."""

    if not settings.anthropic_api_key:
        raise AssistantUnavailable(
            "Assistant is not configured (ANTHROPIC_API_KEY is not set)."
        )

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    messages = [*history, {"role": "user", "content": message}]

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
            tools=[RESPONSE_TOOL],
            tool_choice={"type": "tool", "name": "provide_response"},
        )
    except anthropic.APIError as exc:  # network / upstream / auth
        raise AssistantUnavailable(str(exc)) from exc

    tool_block = next(
        (b for b in response.content if b.type == "tool_use"), None
    )
    if tool_block is None:
        raise AssistantUnavailable("Assistant returned no structured response.")

    data: dict[str, Any] = dict(tool_block.input)
    return {
        "reply": data.get("reply", ""),
        "suggested_category_slug": data.get("suggested_category_slug"),
        "suggested_filters": data.get("suggested_filters"),
    }
