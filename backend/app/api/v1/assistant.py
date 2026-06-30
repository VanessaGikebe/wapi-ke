"""AI assistant route (CLAUDE.md §8): POST /api/v1/assistant/message.

Conversation state is persisted per session in `AssistantSession` (messages +
inferred category/filters). The model call is delegated to
`app.services.assistant`, grounded with the live category/filter schema so its
suggestions use real slugs and filter keys.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models import AssistantSession, Category
from app.schemas.assistant import (
    AssistantMessageRequest,
    AssistantMessageResponse,
)
from app.services import assistant as assistant_service

router = APIRouter(prefix="/assistant", tags=["assistant"])


def _load_categories(db: Session) -> list[Category]:
    return list(
        db.scalars(
            select(Category)
            .options(selectinload(Category.filters))
            .order_by(Category.name)
        ).all()
    )


def _categories_context(categories: list[Category]) -> list[dict[str, Any]]:
    """Compact category + filter schema for grounding the model."""

    context: list[dict[str, Any]] = []
    for category in categories:
        context.append(
            {
                "slug": category.slug,
                "name": category.name,
                "filters": [
                    {
                        "key": f.key,
                        "label": f.label,
                        "type": f.type.value,
                        "options": f.options,
                    }
                    for f in category.filters
                ],
            }
        )
    return context


@router.post("/message", response_model=AssistantMessageResponse)
def post_message(
    payload: AssistantMessageRequest,
    db: Session = Depends(get_db),
) -> AssistantMessageResponse:
    # Resolve or create the session (guests allowed — user_id stays null).
    session: AssistantSession | None = None
    if payload.session_id is not None:
        session = db.get(AssistantSession, payload.session_id)
    if session is None:
        session = AssistantSession(messages=[])
        db.add(session)
        db.flush()  # assign session.id

    categories = _load_categories(db)
    context = _categories_context(categories)
    system_prompt = assistant_service.build_system_prompt(context)

    history = list(session.messages or [])

    try:
        result = assistant_service.generate_reply(
            system_prompt, history, payload.message
        )
    except assistant_service.AssistantUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )

    reply: str = result["reply"]
    suggested_slug: str | None = result.get("suggested_category_slug")
    suggested_filters: dict[str, Any] | None = result.get("suggested_filters")

    # Validate the suggestion against the real schema; drop anything bogus.
    by_slug = {c.slug: c for c in categories}
    category = by_slug.get(suggested_slug) if suggested_slug else None
    if category is None:
        suggested_slug = None
        suggested_filters = None
    elif isinstance(suggested_filters, dict):
        valid_keys = {f.key for f in category.filters}
        suggested_filters = {
            k: v for k, v in suggested_filters.items() if k in valid_keys
        }

    # Persist the turn (reassign messages so SQLAlchemy sees the JSONB change).
    session.messages = [
        *history,
        {"role": "user", "content": payload.message},
        {"role": "assistant", "content": reply},
    ]
    if category is not None:
        session.inferred_category_id = category.id
        session.inferred_filters = suggested_filters
    db.commit()

    return AssistantMessageResponse(
        session_id=session.id,
        reply=reply,
        suggested_category=suggested_slug,
        suggested_filters=suggested_filters,
    )
