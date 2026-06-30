"""Pydantic v2 schemas for the AI assistant (CLAUDE.md §8)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AssistantMessageRequest(BaseModel):
    # Omit / null on the first message; the server creates a session and
    # returns its id to continue the conversation.
    session_id: UUID | None = None
    message: str = Field(min_length=1, max_length=2000)


class AssistantMessageResponse(BaseModel):
    session_id: UUID
    reply: str
    # Populated once the assistant has enough signal to recommend.
    suggested_category: str | None = None
    suggested_filters: dict[str, Any] | None = None
