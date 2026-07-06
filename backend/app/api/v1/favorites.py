"""Favorite routes (CLAUDE.md §8) — both require auth (401 otherwise).

The frontend handles the login redirect on a 401; here we just gate on
``get_current_user``.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db import get_db
from app.models import Experience, Favorite, InteractionType, User, UserInteraction
from app.schemas.booking import FavoriteOut

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=list[FavoriteOut])
def list_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FavoriteOut]:
    favorites = db.scalars(
        select(Favorite)
        .options(
            joinedload(Favorite.experience).joinedload(Experience.category)
        )
        .where(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
    ).all()
    return [FavoriteOut.from_favorite(f) for f in favorites]


@router.post("/{experience_id}", status_code=status.HTTP_201_CREATED)
def add_favorite(
    experience_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    if db.get(Experience, experience_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experience not found",
        )

    existing = db.scalar(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.experience_id == experience_id,
        )
    )
    if existing is None:
        db.add(Favorite(user_id=current_user.id, experience_id=experience_id))
        db.add(
            UserInteraction(
                user_id=current_user.id,
                interaction_type=InteractionType.save,
                experience_id=experience_id,
                weight=8,
            )
        )
        db.commit()

    return {"experience_id": str(experience_id), "favorited": True}


@router.delete(
    "/{experience_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_favorite(
    experience_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    existing = db.scalar(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.experience_id == experience_id,
        )
    )
    if existing is not None:
        db.delete(existing)
        db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
