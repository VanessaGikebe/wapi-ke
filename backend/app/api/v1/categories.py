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
from sqlalchemy import Float, and_, cast, func, or_, select
from sqlalchemy.dialects.postgresql import array
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql.elements import ColumnElement

from app.db import get_db
from app.models import Category, Experience, FilterDefinition, FilterType
from app.schemas.category import CategoryOut, FilterDefinitionOut
from app.schemas.experience import ExperienceOut, PaginatedExperiences

router = APIRouter(prefix="/categories", tags=["categories"])

RESERVED_PARAMS = {"page", "limit"}
TRUTHY = {"true", "1", "yes", "on"}


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
    db: Session = Depends(get_db),
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
        .where(Experience.category_id == category.id)
    )

    # Apply each recognised filter param once (dedupe repeated keys).
    for key in dict.fromkeys(request.query_params.keys()):
        if key in RESERVED_PARAMS or key not in filters_by_key:
            continue
        condition = _build_condition(
            filters_by_key[key], request.query_params.getlist(key)
        )
        if condition is not None:
            stmt = stmt.where(condition)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = list(
        db.scalars(
            stmt.order_by(Experience.title, Experience.id)
            .offset((page - 1) * limit)
            .limit(limit)
        ).all()
    )
    pages = math.ceil(total / limit) if total else 0

    return PaginatedExperiences(
        items=[ExperienceOut.from_experience(item) for item in items],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )
