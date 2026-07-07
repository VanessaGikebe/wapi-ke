"""Behaviour-driven preference scoring.

WapiKE personalises discovery from two sources: the onboarding answers a user
gives once, and what they *actually do* afterwards. This module owns the second
half — it turns ``interaction_events`` (the ``UserInteraction`` table) into the
evolving ``behavior_scores`` stored on ``UserPreferenceProfile``.

Design (see the "on-write recompute" decision): scores are recomputed
synchronously as a side-effect of each logged interaction. The recompute is
bounded (one user's recent interactions) and stateless — it reads a recent
window and applies recency decay — so it needs no marker bookkeeping and no new
infrastructure. Older activity, and categories the user has stopped touching,
fade on their own as their contributions age out.

The recommendation read path (``_taste_profile`` and the feed sections in
``app.api.v1.personalization``) consumes these scores; this module only updates
them.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import bearer_scheme, get_current_user
from app.db import get_db
from app.models import (
    Experience,
    InteractionType,
    User,
    UserInteraction,
    UserPreferenceProfile,
)

# How strong each kind of action is as a preference signal. Set server-side so a
# client can't inflate its own weight through the generic interactions endpoint.
TYPE_WEIGHTS: dict[InteractionType, float] = {
    InteractionType.view: 1.0,
    InteractionType.search: 1.0,
    InteractionType.filter: 1.0,
    InteractionType.dwell: 2.0,
    InteractionType.share: 5.0,
    InteractionType.directions: 6.0,
    InteractionType.save: 8.0,
    InteractionType.review: 9.0,
    InteractionType.booking: 12.0,
}

# Recompute window: recent, recency-decayed interactions. Anything older than
# WINDOW_DAYS has decayed to a negligible contribution anyway.
WINDOW_DAYS = 180
WINDOW_LIMIT = 250
# Per-day multiplicative decay — a signal ~45 days old counts about half.
DECAY_PER_DAY = 0.985
# Secondary signals contribute a fraction of the category signal.
BUDGET_SIGNAL = 0.5
VIBE_SIGNAL = 0.25
# Drop scores that have decayed into the noise so the JSON stays small.
PRUNE_BELOW = 0.05
MAX_VIBES_PER_EXPERIENCE = 6


def optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Like ``get_current_user`` but returns ``None`` instead of raising for an
    anonymous (or invalid-token) request. Used to attach behaviour logging to
    otherwise-public read endpoints without gating them behind auth."""
    if credentials is None:
        return None
    try:
        return get_current_user(credentials=credentials, db=db)
    except HTTPException:
        return None


def log_interaction(
    db: Session,
    *,
    user_id: UUID,
    interaction_type: InteractionType,
    experience_id: UUID | None = None,
    category_slug: str | None = None,
    search_query: str | None = None,
    context: dict | None = None,
) -> None:
    """Record one interaction_event. Uses the server-side signal weight for the
    type. Does not commit — the caller owns the transaction."""
    db.add(
        UserInteraction(
            user_id=user_id,
            interaction_type=interaction_type,
            experience_id=experience_id,
            category_slug=category_slug,
            search_query=search_query,
            weight=int(TYPE_WEIGHTS.get(interaction_type, 1)),
            context=context or {},
        )
    )


def update_preference_scores(db: Session, user_id: UUID) -> None:
    """Recompute ``behavior_scores`` for ``user_id`` from their recent
    interaction_events, applying recency decay. Creates the profile if the user
    has none yet (behaviour can shape recommendations even without onboarding).
    Does not commit — the caller owns the transaction."""
    # Make sure interactions added earlier in this request are visible to the
    # queries below.
    db.flush()

    profile = db.get(UserPreferenceProfile, user_id)
    if profile is None:
        profile = UserPreferenceProfile(user_id=user_id)
        db.add(profile)

    now = datetime.now(UTC)
    cutoff = now - timedelta(days=WINDOW_DAYS)

    interactions = db.scalars(
        select(UserInteraction)
        .where(
            UserInteraction.user_id == user_id,
            UserInteraction.created_at >= cutoff,
            UserInteraction.interaction_type != InteractionType.not_interested,
        )
        .order_by(UserInteraction.created_at.desc())
        .limit(WINDOW_LIMIT)
    ).all()

    experience_ids = {i.experience_id for i in interactions if i.experience_id}
    experiences: dict[UUID, Experience] = {}
    if experience_ids:
        experiences = {
            exp.id: exp
            for exp in db.scalars(
                select(Experience)
                .options(joinedload(Experience.category))
                .where(Experience.id.in_(experience_ids))
            ).all()
        }

    categories: defaultdict[str, float] = defaultdict(float)
    vibes: defaultdict[str, float] = defaultdict(float)
    budgets: defaultdict[str, float] = defaultdict(float)

    for item in interactions:
        age_days = max(0.0, (now - item.created_at).total_seconds() / 86_400.0)
        recency = DECAY_PER_DAY**age_days
        weight = TYPE_WEIGHTS.get(item.interaction_type, float(item.weight or 1))
        signal = weight * recency
        if signal <= 0:
            continue

        exp = experiences.get(item.experience_id) if item.experience_id else None

        slug = item.category_slug or (exp.category.slug if exp else None)
        if slug:
            categories[slug] += signal

        if exp is not None:
            budgets[str(exp.price_tier)] += signal * BUDGET_SIGNAL
            _accumulate_vibes(exp, vibes, signal * VIBE_SIGNAL)

    profile.behavior_scores = {
        "categories": _prune(categories),
        "vibes": _prune(vibes),
        "budgets": _prune(budgets),
    }
    profile.behavior_events_count = len(interactions)
    profile.scores_updated_at = now


def _accumulate_vibes(
    exp: Experience, vibes: defaultdict[str, float], signal: float
) -> None:
    seen = 0
    for raw in exp.attributes.values():
        values = raw if isinstance(raw, list) else [raw]
        for value in values:
            if not isinstance(value, str):
                continue
            normalized = value.strip().lower()
            if not normalized:
                continue
            vibes[normalized] += signal
            seen += 1
            if seen >= MAX_VIBES_PER_EXPERIENCE:
                return


def _prune(scores: dict[str, float]) -> dict[str, float]:
    return {
        key: round(value, 4)
        for key, value in scores.items()
        if value >= PRUNE_BELOW
    }
