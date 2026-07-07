"""Experience read routes: a single experience by id, and a featured set for
the homepage (highest-rated across categories). Only **approved** listings are
served publicly. Also hosts the public "report this listing" endpoint."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Float, cast, desc, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db import get_db
from app.models import (
    Experience,
    InteractionType,
    ListingReport,
    ListingStatus,
    Review,
    User,
)
from app.schemas.experience import ExperienceOut
from app.schemas.moderation import ReportCreate
from app.schemas.review import ReviewCreate, ReviewOut
from app.services.recommendations import (
    log_interaction,
    optional_user,
    update_preference_scores,
)

router = APIRouter(prefix="/experiences", tags=["experiences"])


@router.get("/featured", response_model=list[ExperienceOut])
def featured_experiences(
    limit: int = Query(8, ge=1, le=24),
    db: Session = Depends(get_db),
) -> list[ExperienceOut]:
    """Top approved experiences across all categories, ranked by rating."""

    rating = cast(Experience.attributes["rating"].astext, Float)
    experiences = db.scalars(
        select(Experience)
        .options(joinedload(Experience.category))
        .where(Experience.status == ListingStatus.approved)
        .order_by(desc(rating), Experience.title)
        .limit(limit)
    ).all()
    return [ExperienceOut.from_experience(e) for e in experiences]


@router.get("/{experience_id}", response_model=ExperienceOut)
def get_experience(
    experience_id: UUID,
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_user),
) -> ExperienceOut:
    experience = db.scalar(
        select(Experience)
        .options(joinedload(Experience.category))
        .where(
            Experience.id == experience_id,
            Experience.status == ListingStatus.approved,
        )
    )
    if experience is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experience not found",
        )
    result = ExperienceOut.from_experience(experience)

    # Log the detail view as a behaviour signal (repeated views of the same
    # experience accumulate and raise its category). Authenticated users only.
    if user is not None:
        log_interaction(
            db,
            user_id=user.id,
            interaction_type=InteractionType.view,
            experience_id=experience.id,
            category_slug=experience.category.slug,
        )
        update_preference_scores(db, user.id)
        db.commit()

    return result


@router.post(
    "/{experience_id}/report", status_code=status.HTTP_201_CREATED
)
def report_experience(
    experience_id: UUID,
    payload: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Flag a listing as fake/suspicious — queued for admin review."""
    exp = db.get(Experience, experience_id)
    if exp is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found"
        )
    db.add(
        ListingReport(
            experience_id=experience_id,
            reporter_id=current_user.id,
            reason=payload.reason,
        )
    )
    db.commit()
    return {"detail": "Report submitted. Thank you."}


@router.get("/{experience_id}/reviews", response_model=list[ReviewOut])
def list_reviews(
    experience_id: UUID,
    db: Session = Depends(get_db),
) -> list[ReviewOut]:
    """Public list of first-party reviews for an experience, newest first."""
    reviews = db.scalars(
        select(Review)
        .options(joinedload(Review.user))
        .where(Review.experience_id == experience_id)
        .order_by(desc(Review.created_at))
    ).all()
    return [ReviewOut.from_review(r) for r in reviews]


@router.post(
    "/{experience_id}/reviews",
    status_code=status.HTTP_201_CREATED,
    response_model=ReviewOut,
)
def create_review(
    experience_id: UUID,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReviewOut:
    """Leave (or update) this user's review for an experience. One review per
    user per experience — re-submitting overwrites the previous one. Also logs
    the ``review`` interaction signal through the shared helper."""
    experience = db.scalar(
        select(Experience)
        .options(joinedload(Experience.category))
        .where(
            Experience.id == experience_id,
            Experience.status == ListingStatus.approved,
        )
    )
    if experience is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experience not found",
        )

    review = db.scalar(
        select(Review).where(
            Review.experience_id == experience_id,
            Review.user_id == current_user.id,
        )
    )
    if review is None:
        review = Review(
            experience_id=experience_id,
            user_id=current_user.id,
            rating=payload.rating,
            text=payload.text,
        )
        db.add(review)
    else:
        review.rating = payload.rating
        review.text = payload.text

    log_interaction(
        db,
        user_id=current_user.id,
        interaction_type=InteractionType.review,
        experience_id=experience_id,
        category_slug=experience.category.slug,
    )
    update_preference_scores(db, current_user.id)
    db.commit()
    db.refresh(review)

    # Ensure the author relationship is loaded for the response.
    review.user = current_user
    return ReviewOut.from_review(review)
