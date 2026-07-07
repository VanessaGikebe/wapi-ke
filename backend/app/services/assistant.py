"""AI assistant service — talks to Google **Gemini 2.5 Flash** server-side.

The assistant chats conversationally to learn the user's mood, occasion, group
size, budget, location, and interests, and — once it has enough signal —
recommends a category and concrete filter values. Structured fields are returned
as strict JSON (Gemini JSON mode), so the frontend gets reliable
`reply` / `suggested_category_slug` / `suggested_filters` every turn.
"""

from __future__ import annotations

import functools
import json
import re
from pathlib import Path
from typing import Any

from google import genai
from google.genai import errors, types

from app.config import get_settings

settings = get_settings()

MODEL = "gemini-2.5-flash"

# --- Wapike knowledge base (single source of truth) -------------------------
# Loaded from app/data/wapike_knowledge.json. Used two ways:
#   1. to GROUND Gemini's answers (build_system_prompt), and
#   2. to answer common FAQs OFFLINE via faq_answer() — no model call, no token
#      cost, and it works even with no GEMINI_API_KEY configured.
_KB_PATH = Path(__file__).resolve().parent.parent / "data" / "wapike_knowledge.json"


@functools.lru_cache(maxsize=1)
def _knowledge() -> dict[str, Any]:
    try:
        with _KB_PATH.open(encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {}


def _kb_prompt_block() -> str:
    """Render the knowledge base (overview + FAQ) as grounding text for Gemini."""
    kb = _knowledge()
    if not kb:
        return ""
    lines = ["Wapike knowledge — answer platform questions only from this:"]
    overview = kb.get("product", {}).get("what_it_is")
    if overview:
        lines.append(f"Overview: {overview}")
    for item in kb.get("faq", []):
        question, answer = item.get("q"), item.get("a")
        if question and answer:
            lines.append(f"Q: {question}\nA: {answer}")
    return "\n".join(lines)


# --- Offline FAQ matcher (token-free) ---------------------------------------
_STOPWORDS = frozenset(
    {
        "the", "and", "for", "are", "you", "your", "with", "that", "this", "from",
        "have", "how", "what", "who", "why", "when", "where", "which", "does",
        "did", "can", "could", "should", "would", "will", "was", "were", "been",
        "being", "into", "onto", "out", "about", "need", "get", "got", "use",
        "using", "used", "any", "all", "also", "not", "but", "its", "our", "their",
        "there", "here", "some", "one", "two", "want", "like", "please", "tell",
        "does", "make", "made", "them", "they", "who", "whom", "then", "than",
    }
)


def _tokens(text: str) -> set[str]:
    return {
        tok
        for tok in re.findall(r"[a-z]+", text.lower())
        if len(tok) >= 3 and tok not in _STOPWORDS
    }


@functools.lru_cache(maxsize=1)
def _faq_index() -> tuple[tuple[frozenset[str], str], ...]:
    out: list[tuple[frozenset[str], str]] = []
    for item in _knowledge().get("faq", []):
        question, answer = item.get("q", ""), item.get("a", "")
        toks = frozenset(_tokens(question))
        if toks and answer:
            out.append((toks, answer))
    return tuple(out)


@functools.lru_cache(maxsize=1)
def _doc_freq() -> dict[str, int]:
    df: dict[str, int] = {}
    for toks, _ in _faq_index():
        for tok in toks:
            df[tok] = df.get(tok, 0) + 1
    return df


def faq_answer(message: str) -> str | None:
    """Answer a common question straight from the knowledge base — NO model call,
    NO tokens. Returns None when there's no confident, unambiguous match (the
    caller then falls back to Gemini).

    Scoring: shared significant words, weighted by inverse frequency across the
    FAQ (rare, discriminating words count more), plus a coverage bonus. Requires
    a clear winner so vague messages fall through instead of misfiring.
    """
    index = _faq_index()
    if not index:
        return None
    msg = _tokens(message)
    if not msg:
        return None
    df = _doc_freq()
    best_score = 0.0
    best_answer: str | None = None
    for toks, answer in index:
        shared = msg & toks
        if not shared:
            continue
        score = sum(1.0 / df.get(tok, 1) for tok in shared) + len(shared) / len(toks)
        if score > best_score:
            best_score, best_answer = score, answer
    # Absolute threshold: a single common word (high frequency, low coverage)
    # scores below 1.0 and falls through to Gemini, so only reasonably specific
    # questions are answered offline. On a tie the earlier (more general) FAQ wins.
    if best_answer is not None and best_score >= 1.0:
        return best_answer
    return None

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
        "You can also answer common questions about how Wapike works (accounts, "
        "listing or claiming a business, favourites, bookings, personalised "
        "recommendations) using the knowledge below. Answer those directly and "
        "concisely from it, and only use facts stated there — don't invent "
        "policies or details. For a plain question like this, keep "
        "`suggested_category_slug` and `suggested_filters` null.\n\n"
        f"{_kb_prompt_block()}\n\n"
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
