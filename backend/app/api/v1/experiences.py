"""Experience read routes: a single experience by id, and a featured set for
the homepage (highest-rated across categories)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Float, cast, desc, select
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import Experience
from app.schemas.experience import ExperienceOut

router = APIRouter(prefix="/experiences", tags=["experiences"])


@router.get("/featured", response_model=list[ExperienceOut])
def featured_experiences(
    limit: int = Query(8, ge=1, le=24),
    db: Session = Depends(get_db),
) -> list[ExperienceOut]:
    """Top experiences across all categories, ranked by stored rating."""

    rating = cast(Experience.attributes["rating"].astext, Float)
    experiences = db.scalars(
        select(Experience)
        .options(joinedload(Experience.category))
        .order_by(desc(rating), Experience.title)
        .limit(limit)
    ).all()
    return [ExperienceOut.from_experience(e) for e in experiences]


@router.get("/{experience_id}", response_model=ExperienceOut)
def get_experience(
    experience_id: UUID,
    db: Session = Depends(get_db),
) -> ExperienceOut:
    experience = db.scalar(
        select(Experience)
        .options(joinedload(Experience.category))
        .where(Experience.id == experience_id)
    )
    if experience is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experience not found",
        )
    return ExperienceOut.from_experience(experience)
