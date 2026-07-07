"""Personalized discovery endpoints."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.api.v1.categories import _build_condition
from app.db import get_db
from app.models import (
    Booking,
    Category,
    Event,
    EventStatus,
    Experience,
    Favorite,
    FilterDefinition,
    InteractionType,
    ListingStatus,
    User,
    UserInteraction,
    UserPreferenceProfile,
)
from app.schemas.event import EventOut
from app.schemas.experience import ExperienceOut
from app.schemas.personalization import (
    InteractionIn,
    PreferenceProfileIn,
    PreferenceProfileOut,
    RecommendationItem,
    RecommendationResponse,
    RecommendationSection,
)
from app.services.recommendations import update_preference_scores

router = APIRouter(prefix="/personalization", tags=["personalization"])

RESERVED_RECOMMENDATION_PARAMS = {"category_slug", "limit", "page"}
HIGH_CONFIDENCE_THRESHOLD = 85


@dataclass(frozen=True)
class RecommendationContext:
    taste: dict[str, Counter[str] | Counter[int]]
    disliked_experience_ids: set[UUID]
    disliked_categories: Counter[str]
    interaction_count: int
    hour: int
    weekday: int
    preferred_locations: list[str]


@router.get("/profile", response_model=PreferenceProfileOut)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PreferenceProfileOut:
    profile = db.get(UserPreferenceProfile, current_user.id)
    if profile is None:
        return PreferenceProfileOut(completed_onboarding=False)
    return PreferenceProfileOut(
        completed_onboarding=profile.completed_onboarding,
        interests=profile.interests,
        categories=profile.categories,
        budget_tiers=profile.budget_tiers,
        vibes=profile.vibes,
        preferences=profile.preferences,
    )


@router.put("/profile", response_model=PreferenceProfileOut)
def save_profile(
    payload: PreferenceProfileIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PreferenceProfileOut:
    profile = db.get(UserPreferenceProfile, current_user.id)
    if profile is None:
        profile = UserPreferenceProfile(user_id=current_user.id)
        db.add(profile)
    profile.interests = _clean_strings(payload.interests)
    profile.categories = _clean_strings(payload.categories)
    profile.budget_tiers = sorted({tier for tier in payload.budget_tiers if 1 <= tier <= 4})
    profile.vibes = _clean_strings(payload.vibes)
    profile.preferences = payload.preferences
    profile.completed_onboarding = True
    db.commit()
    db.refresh(profile)
    return PreferenceProfileOut(
        completed_onboarding=profile.completed_onboarding,
        interests=profile.interests,
        categories=profile.categories,
        budget_tiers=profile.budget_tiers,
        vibes=profile.vibes,
        preferences=profile.preferences,
    )


@router.post("/interactions", status_code=204)
def record_interaction(
    payload: InteractionIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    experience_id: UUID | None = None
    if payload.experience_id:
        try:
            experience_id = UUID(payload.experience_id)
        except ValueError:
            experience_id = None

    db.add(
        UserInteraction(
            user_id=current_user.id,
            interaction_type=payload.interaction_type,
            experience_id=experience_id,
            category_slug=payload.category_slug,
            search_query=payload.search_query,
            weight=payload.weight,
            context=payload.context,
        )
    )
    # Fold this action into the user's evolving behaviour scores. This endpoint
    # is the logging path for client-only signals too (directions, share, dwell,
    # review) that have no dedicated backend route.
    update_preference_scores(db, current_user.id)
    db.commit()


@router.get("/recommendations", response_model=RecommendationResponse)
def recommendations(
    request: Request,
    category_slug: str | None = Query(default=None),
    limit: int = Query(default=6, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecommendationResponse:
    profile = db.get(UserPreferenceProfile, current_user.id)
    context = _recommendation_context(db, current_user, profile)
    filter_conditions = _recommendation_filter_conditions(db, request, category_slug)

    recommended = _experience_section(
        db,
        key="recommended",
        title="Recommended For You",
        explanation=_section_explanation(context.taste, "Because you enjoy"),
        category_slug=category_slug,
        context=context,
        filter_conditions=filter_conditions,
        limit=limit,
        mode="personal",
    )
    trending = _experience_section(
        db,
        key="trending_near_you",
        title="Trending Near You",
        explanation="Popular among users with similar interests.",
        category_slug=category_slug,
        context=context,
        filter_conditions=filter_conditions,
        limit=limit,
        mode="trending",
    )
    hidden = _experience_section(
        db,
        key="hidden_gems",
        title="Hidden Gems",
        explanation="Highly rated picks that are still under the radar.",
        category_slug=category_slug,
        context=context,
        filter_conditions=filter_conditions,
        limit=limit,
        mode="hidden",
    )
    discovery = _experience_section(
        db,
        key="discover_new",
        title="Discover Something New",
        explanation="A little outside your usual picks, chosen to broaden your options.",
        category_slug=category_slug,
        context=context,
        filter_conditions=filter_conditions,
        limit=limit,
        mode="discovery",
    )
    events = _event_section(db, context, limit)
    return RecommendationResponse(
        sections=[recommended, trending, hidden, discovery, events]
    )


def _clean_strings(values: list[str]) -> list[str]:
    return sorted({value.strip().lower() for value in values if value.strip()})


def _onboarding_factor(profile: UserPreferenceProfile) -> float:
    """Weight applied to the one-time onboarding answers. Starts at 1.0 and
    decays toward a small floor as behaviour accumulates, so what the user does
    gradually outweighs what they answered during onboarding."""
    events = profile.behavior_events_count or 0
    return max(0.15, 1.0 / (1.0 + events / 30.0))


def _recommendation_context(
    db: Session,
    user: User,
    profile: UserPreferenceProfile | None,
) -> RecommendationContext:
    now = datetime.now(UTC)
    taste, interaction_count = _taste_profile(db, user, profile)
    disliked = db.scalars(
        select(UserInteraction).where(
            UserInteraction.user_id == user.id,
            UserInteraction.interaction_type == InteractionType.not_interested,
        )
    ).all()
    disliked_experience_ids = {
        item.experience_id for item in disliked if item.experience_id is not None
    }
    disliked_categories: Counter[str] = Counter()
    for item in disliked:
        if item.category_slug:
            disliked_categories[item.category_slug] += max(1, item.weight)

    preferences = profile.preferences if profile is not None else {}
    raw_locations = preferences.get("locations") if isinstance(preferences, dict) else None
    locations = [
        str(value).lower()
        for value in raw_locations
        if isinstance(value, str) and value.lower() != "anywhere"
    ] if isinstance(raw_locations, list) else []

    return RecommendationContext(
        taste=taste,
        disliked_experience_ids=disliked_experience_ids,
        disliked_categories=disliked_categories,
        interaction_count=interaction_count,
        hour=now.hour,
        weekday=now.weekday(),
        preferred_locations=locations,
    )


def _taste_profile(
    db: Session,
    user: User,
    profile: UserPreferenceProfile | None,
) -> tuple[dict[str, Counter[str] | Counter[int]], int]:
    categories: Counter[str] = Counter()
    interests: Counter[str] = Counter()
    vibes: Counter[str] = Counter()
    budgets: Counter[int] = Counter()

    if profile is not None:
        # Onboarding answers seed the profile, but their weight shrinks as real
        # behaviour accumulates so behaviour gradually outweighs them over time.
        factor = _onboarding_factor(profile)
        categories.update({value: 6 * factor for value in profile.categories})
        interests.update({value: 5 * factor for value in profile.interests})
        vibes.update({value: 4 * factor for value in profile.vibes})
        budgets.update({value: 4 * factor for value in profile.budget_tiers})

        # Behaviour-derived scores (maintained by update_preference_scores) —
        # the part of the profile that evolves from what the user actually does.
        behavior = profile.behavior_scores or {}
        for slug, value in (behavior.get("categories") or {}).items():
            categories[slug] += float(value)
        for name, value in (behavior.get("vibes") or {}).items():
            vibes[name] += float(value)
        for tier, value in (behavior.get("budgets") or {}).items():
            try:
                budgets[int(tier)] += float(value)
            except (TypeError, ValueError):
                continue

    saved_and_booked = db.scalars(
        select(Experience)
        .join(Category)
        .where(
            Experience.status == ListingStatus.approved,
            Experience.id.in_(
                select(Favorite.experience_id).where(Favorite.user_id == user.id)
            )
            | Experience.id.in_(
                select(Booking.experience_id).where(Booking.user_id == user.id)
            ),
        )
    ).all()
    for exp in saved_and_booked:
        categories[exp.category.slug] += 8
        budgets[exp.price_tier] += 4
        _update_attribute_counters(exp, interests, vibes, 4)

    interactions = db.scalars(
        select(UserInteraction)
        .where(UserInteraction.user_id == user.id)
        .order_by(UserInteraction.created_at.desc())
        .limit(100)
    ).all()
    experience_ids = [item.experience_id for item in interactions if item.experience_id]
    experiences = {
        exp.id: exp
        for exp in db.scalars(
            select(Experience).options(joinedload(Experience.category)).where(
                Experience.id.in_(experience_ids)
            )
        ).all()
    }
    for item in interactions:
        if item.interaction_type == InteractionType.not_interested:
            continue
        weight = max(1, item.weight)
        if item.category_slug:
            categories[item.category_slug] += weight
        exp = experiences.get(item.experience_id)
        if exp is not None:
            categories[exp.category.slug] += weight
            budgets[exp.price_tier] += weight
            _update_attribute_counters(exp, interests, vibes, weight)

    return (
        {
            "categories": categories,
            "interests": interests,
            "vibes": vibes,
            "budgets": budgets,
        },
        len(interactions),
    )


def _update_attribute_counters(
    exp: Experience,
    interests: Counter[str],
    vibes: Counter[str],
    weight: int,
) -> None:
    for raw in exp.attributes.values():
        values = raw if isinstance(raw, list) else [raw]
        for value in values:
            if isinstance(value, str):
                normalized = value.strip().lower()
                if normalized:
                    interests[normalized] += weight
                    vibes[normalized] += max(1, weight // 2)


def _recommendation_filter_conditions(db: Session, request: Request, category_slug: str | None):
    if not category_slug:
        return []
    category = db.scalar(select(Category).where(Category.slug == category_slug))
    if category is None:
        return []
    filters_by_key = {
        f.key: f
        for f in db.scalars(
            select(FilterDefinition).where(FilterDefinition.category_id == category.id)
        ).all()
    }
    conditions = []
    for key in dict.fromkeys(request.query_params.keys()):
        if key in RESERVED_RECOMMENDATION_PARAMS or key not in filters_by_key:
            continue
        condition = _build_condition(filters_by_key[key], request.query_params.getlist(key))
        if condition is not None:
            conditions.append(condition)
    return conditions


def _experience_section(
    db: Session,
    *,
    key: str,
    title: str,
    explanation: str,
    category_slug: str | None,
    context: RecommendationContext,
    filter_conditions: list,
    limit: int,
    mode: str,
) -> RecommendationSection:
    stmt = (
        select(Experience)
        .options(joinedload(Experience.category))
        .where(Experience.status == ListingStatus.approved)
    )
    if category_slug:
        stmt = stmt.join(Category).where(Category.slug == category_slug)
    if context.disliked_experience_ids:
        stmt = stmt.where(Experience.id.not_in(context.disliked_experience_ids))
    for condition in filter_conditions:
        stmt = stmt.where(condition)
    candidates = list(db.scalars(stmt.limit(80)).all())

    interactions = dict(
        db.execute(
            select(UserInteraction.experience_id, func.coalesce(func.sum(UserInteraction.weight), 0))
            .where(UserInteraction.experience_id.is_not(None))
            .group_by(UserInteraction.experience_id)
        ).all()
    )

    def score(exp: Experience) -> float:
        rating = exp.attributes.get("rating")
        base = float(rating) if isinstance(rating, (int, float)) else 0.0
        popularity = int(interactions.get(exp.id, 0) or 0)
        personal = _personal_score(exp, context)
        cold_start = 6 if context.interaction_count < 5 else 0
        timely = _time_context_score(exp, context)
        disliked_penalty = context.disliked_categories.get(exp.category.slug, 0) * 4
        if mode == "trending":
            return popularity * 2 + personal + base + timely + cold_start - disliked_penalty
        if mode == "hidden":
            return personal + base * 2 + timely - min(popularity, 10) - disliked_penalty
        if mode == "discovery":
            outside_preference = 14 if context.taste["categories"].get(exp.category.slug, 0) == 0 else 0
            return outside_preference + base * 2 + popularity * 0.4 + timely - personal * 0.25 - disliked_penalty
        return personal * 2 + popularity + base + timely + cold_start - disliked_penalty

    sorted_items = sorted(candidates, key=score, reverse=True)[:limit]
    max_score = max((score(exp) for exp in sorted_items), default=0)
    return RecommendationSection(
        key=key,
        title=title,
        explanation=explanation,
        items=[
            RecommendationItem(
                kind="experience",
                reason=_reason_for(exp, context, mode),
                confidence=_confidence_for(score(exp), max_score, context),
                experience=ExperienceOut.from_experience(exp),
            )
            for exp in sorted_items
        ],
    )


def _event_section(
    db: Session,
    context: RecommendationContext,
    limit: int,
) -> RecommendationSection:
    now = datetime.now(UTC)
    events = list(
        db.scalars(
            select(Event)
            .where(
                Event.status.in_([EventStatus.upcoming, EventStatus.ongoing]),
                Event.start_datetime >= now,
            )
            .order_by(Event.featured.desc(), Event.start_datetime)
            .limit(80)
        ).all()
    )

    interests = context.taste["interests"]
    categories = context.taste["categories"]

    def score(event: Event) -> int:
        text = " ".join(
            value.lower()
            for value in [event.title, event.description, event.category]
            if value
        )
        seasonal_boost = 8 if event.start_datetime.month in {4, 8, 12} else 0
        weekend_boost = 4 if event.start_datetime.weekday() >= 5 else 0
        local_boost = (
            6
            if event.county and event.county.lower() in context.preferred_locations
            else 0
        )
        return (
            sum(weight for key, weight in interests.items() if key in text)
            + (categories.get(str(event.category).lower(), 0) if event.category else 0)
            + seasonal_boost
            + weekend_boost
            + local_boost
        )

    items = sorted(events, key=score, reverse=True)[:limit]
    return RecommendationSection(
        key="upcoming_events",
        title="Upcoming Events You'll Love",
        explanation="Matched to your interests and what you keep exploring.",
        items=[
            RecommendationItem(
                kind="event",
                reason=_event_reason(event, context),
                confidence=90 if score(event) >= 12 else None,
                event=EventOut.model_validate(event),
            )
            for event in items
        ],
    )


def _personal_score(
    exp: Experience,
    context: RecommendationContext,
) -> int:
    taste = context.taste
    score = int(taste["categories"].get(exp.category.slug, 0))
    score += int(taste["budgets"].get(exp.price_tier, 0))
    if exp.location and any(
        location in exp.location.lower() for location in context.preferred_locations
    ):
        score += 6
    for raw in exp.attributes.values():
        values = raw if isinstance(raw, list) else [raw]
        for value in values:
            if isinstance(value, str):
                normalized = value.strip().lower()
                score += int(taste["interests"].get(normalized, 0))
                score += int(taste["vibes"].get(normalized, 0))
    return score


def _time_context_score(exp: Experience, context: RecommendationContext) -> int:
    slug = exp.category.slug
    text = " ".join(
        str(value).lower()
        for value in [exp.title, exp.description, exp.location, *exp.attributes.values()]
        if value
    )
    if 6 <= context.hour < 11 and (slug == "cafes" or "coffee" in text):
        return 10
    if 11 <= context.hour < 15 and slug == "restaurants":
        return 9
    if 18 <= context.hour < 23 and slug in {"nightlife", "restaurants"}:
        return 9
    if context.weekday >= 5 and slug in {"hiking", "road-trips", "outdoor-adventures"}:
        return 8
    return 0


def _confidence_for(
    score: float,
    max_score: float,
    context: RecommendationContext,
) -> int | None:
    if max_score <= 0 or context.interaction_count < 3:
        return None
    confidence = round(72 + min(26, (score / max_score) * 26))
    return confidence if confidence >= HIGH_CONFIDENCE_THRESHOLD else None


def _section_explanation(
    taste: dict[str, Counter[str] | Counter[int]],
    prefix: str,
) -> str:
    top = taste["interests"].most_common(1) or taste["categories"].most_common(1)
    if not top:
        return "Based on your Discover Your Vibe profile."
    return f"{prefix} {top[0][0].replace('-', ' ')}."


def _reason_for(
    exp: Experience,
    context: RecommendationContext,
    mode: str,
) -> str:
    if mode == "trending":
        return "Trending among users with similar interests."
    if mode == "hidden":
        return "Highly rated and less crowded in your taste profile."
    if mode == "discovery":
        return "A fresh pick just outside your usual preferences."
    if _time_context_score(exp, context) >= 8:
        if 6 <= context.hour < 11:
            return "Well timed for a morning plan."
        if 11 <= context.hour < 15:
            return "A strong lunch-hour match."
        if context.weekday >= 5:
            return "Good for a weekend plan."
        return "Fits what people explore around this time."
    top_category = context.taste["categories"].most_common(1)
    if top_category and top_category[0][0] == exp.category.slug:
        return f"Because you enjoy {exp.category.name.lower()}."
    top_interest = context.taste["interests"].most_common(1)
    if top_interest:
        return f"Because you enjoy {top_interest[0][0].replace('-', ' ')}."
    return "Based on your Discover Your Vibe answers."


def _event_reason(event: Event, context: RecommendationContext) -> str:
    if event.county and event.county.lower() in context.preferred_locations:
        return "New near you."
    if event.start_datetime.weekday() >= 5:
        return "Timed for the weekend."
    if event.start_datetime.month in {4, 8, 12}:
        return "Seasonal event you may like."
    top_interest = context.taste["interests"].most_common(1)
    if top_interest:
        return f"Based on your recent interest in {top_interest[0][0].replace('-', ' ')}."
    return "Popular local event for new explorers."
