"""Category + experience read routes (CLAUDE.md §8).

The experiences endpoint filters server-side against the ``Experience.attributes``
JSONB column, driven entirely by the category's ``FilterDefinition`` schema —
each query param whose name matches a filter ``key`` is applied per its type:

  - enum    -> attribute (a JSON string OR array of strings) intersects the
               selected values; repeat or comma-separate the param to OR them
  - range   -> attribute (a JSON number) compared against the given value;
               ``options.direction == "min"`` matches ``>=`` (a floor, e.g.
               "rating 4+"), otherwise the default is ``<=`` (a "max" cap)
  - boolean -> attribute is JSON ``true`` (only applied when the value is truthy)

Unknown params are ignored. Results are paginated with ``page`` / ``limit``.
"""

from __future__ import annotations

import math

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import Float, and_, cast, desc, func, or_, select
from sqlalchemy.dialects.postgresql import array
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql.elements import ColumnElement

from app.db import get_db
from app.models import (
    Category,
    Experience,
    FilterDefinition,
    FilterType,
    InteractionType,
    ListingStatus,
    User,
)
from app.schemas.category import CategoryOut, FilterDefinitionOut
from app.schemas.experience import ExperienceOut, PaginatedExperiences
from app.services.recommendations import (
    log_interaction,
    optional_user,
    update_preference_scores,
)

router = APIRouter(prefix="/categories", tags=["categories"])

# ``q`` is the free-text search param (see list_experiences / search_catalog);
# reserve it so it's never mistaken for a filter key.
RESERVED_PARAMS = {"page", "limit", "q"}
TRUTHY = {"true", "1", "yes", "on"}
SEARCH_SAMPLE_LIMIT = 6
SEARCH_CATEGORY_LIMIT = 8


class CategorySearchOut(BaseModel):
    """Quick-jump results for the categories grid search: matching categories
    plus a small sample of matching experiences across all categories."""

    categories: list[CategoryOut]
    experiences: list[ExperienceOut]


def _escape_like(value: str) -> str:
    """Escape ILIKE wildcards so a user's text is matched literally."""
    return (
        value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    )


def _get_category_or_404(db: Session, slug: str) -> Category:
    category = db.scalar(select(Category).where(Category.slug == slug))
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    return category


def _build_condition(
    fdef: FilterDefinition, raw_values: list[str]
) -> ColumnElement[bool] | None:
    """Translate one filter + its query values into a SQL predicate."""

    element = Experience.attributes[fdef.key]

    if fdef.type == FilterType.enum:
        values = [v for raw in raw_values for v in raw.split(",") if v]
        if not values:
            return None
        return or_(
            and_(
                func.jsonb_typeof(element) == "string",
                element.astext.in_(values),
            ),
            and_(
                func.jsonb_typeof(element) == "array",
                func.jsonb_exists_any(element, array(values)),
            ),
        )

    if fdef.type == FilterType.range:
        try:
            threshold = float(raw_values[0])
        except (ValueError, IndexError):
            return None
        column = cast(element.astext, Float)
        direction = (fdef.options or {}).get("direction")
        return column >= threshold if direction == "min" else column <= threshold

    if fdef.type == FilterType.boolean:
        if not raw_values or raw_values[0].lower() not in TRUTHY:
            return None
        return element.astext == "true"

    return None


@router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)) -> list[Category]:
    return list(db.scalars(select(Category).order_by(Category.name)).all())


# NOTE: must be declared before ``/{slug}`` or "search" would match as a slug.
@router.get("/search", response_model=CategorySearchOut)
def search_catalog(
    q: str = Query(..., min_length=1, max_length=100),
    db: Session = Depends(get_db),
) -> CategorySearchOut:
    """Lightweight cross-category quick search — matching categories and a small
    sample of matching experiences. Not a full results page (use a category's
    ``/experiences?q=`` for that)."""
    term = q.strip()
    if not term:
        return CategorySearchOut(categories=[], experiences=[])

    like = f"%{_escape_like(term)}%"

    categories = db.scalars(
        select(Category)
        .where(Category.name.ilike(like))
        .order_by(Category.name)
        .limit(SEARCH_CATEGORY_LIMIT)
    ).all()

    rating = cast(Experience.attributes["rating"].astext, Float)
    experiences = db.scalars(
        select(Experience)
        .options(joinedload(Experience.category))
        .where(
            Experience.status == ListingStatus.approved,
            or_(
                Experience.title.ilike(like),
                Experience.description.ilike(like),
            ),
        )
        .order_by(desc(rating), Experience.title)
        .limit(SEARCH_SAMPLE_LIMIT)
    ).all()

    return CategorySearchOut(
        categories=[CategoryOut.model_validate(c) for c in categories],
        experiences=[ExperienceOut.from_experience(e) for e in experiences],
    )


@router.get("/{slug}", response_model=CategoryOut)
def get_category(slug: str, db: Session = Depends(get_db)) -> Category:
    return _get_category_or_404(db, slug)


@router.get("/{slug}/filters", response_model=list[FilterDefinitionOut])
def get_category_filters(
    slug: str, db: Session = Depends(get_db)
) -> list[FilterDefinition]:
    category = _get_category_or_404(db, slug)
    return list(
        db.scalars(
            select(FilterDefinition)
            .where(FilterDefinition.category_id == category.id)
            .order_by(FilterDefinition.key)
        ).all()
    )


@router.get("/{slug}/experiences", response_model=PaginatedExperiences)
def list_experiences(
    slug: str,
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    q: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_user),
) -> PaginatedExperiences:
    category = _get_category_or_404(db, slug)

    filters_by_key = {
        f.key: f
        for f in db.scalars(
            select(FilterDefinition).where(
                FilterDefinition.category_id == category.id
            )
        ).all()
    }

    stmt = (
        select(Experience)
        .options(joinedload(Experience.category))
        .where(
            Experience.category_id == category.id,
            Experience.status == ListingStatus.approved,
        )
    )

    # Free-text search narrows the candidate set; existing filters + ordering
    # then apply on top exactly as before.
    if q and q.strip():
        like = f"%{_escape_like(q.strip())}%"
        stmt = stmt.where(
            or_(
                Experience.title.ilike(like),
                Experience.description.ilike(like),
                Experience.location.ilike(like),
            )
        )

    # Apply each recognised filter param once (dedupe repeated keys). The
    # applied filters are the *implied* vibe/budget of a search — we log those,
    # never the raw query text.
    applied_filters: dict[str, list[str]] = {}
    for key in dict.fromkeys(request.query_params.keys()):
        if key in RESERVED_PARAMS or key not in filters_by_key:
            continue
        values = request.query_params.getlist(key)
        condition = _build_condition(filters_by_key[key], values)
        if condition is not None:
            stmt = stmt.where(condition)
            applied_filters[key] = values

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = list(
        db.scalars(
            stmt.order_by(Experience.title, Experience.id)
            .offset((page - 1) * limit)
            .limit(limit)
        ).all()
    )
    pages = math.ceil(total / limit) if total else 0

    response = PaginatedExperiences(
        items=[ExperienceOut.from_experience(item) for item in items],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )

    # A filtered browse is an intentful search; log it (category + implied
    # filters) as a behaviour signal. Plain, unfiltered browsing isn't logged
    # here — experience detail views already capture category interest.
    if user is not None and applied_filters and page == 1:
        log_interaction(
            db,
            user_id=user.id,
            interaction_type=InteractionType.search,
            category_slug=category.slug,
            context={"filters": applied_filters},
        )
        update_preference_scores(db, user.id)
        db.commit()

    return response
