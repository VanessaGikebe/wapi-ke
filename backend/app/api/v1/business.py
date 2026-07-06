"""Business account API (all routes require an approved business account).

Business accounts are created only when an admin approves a business
application or claim (see ``app.models.business``); there is no self-service
promotion. Here a business manages its own listings, which start ``pending``
for admin approval.

NOTE: Listing ownership is currently keyed on ``Experience.owner_id`` (the user
account). Wiring listings to the live ``Business`` entity (and the full
dashboard: bookings, analytics, reviews, claim requests) is built out in the
business-dashboard phase.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_business
from app.db import get_db
from app.models import (
    Category,
    Experience,
    ListingStatus,
    User,
)
from app.schemas.moderation import (
    ListingCreate,
    ListingOut,
    ListingUpdate,
)

router = APIRouter(
    prefix="/business",
    tags=["business"],
    dependencies=[Depends(get_current_business)],
)


def _listing_out(exp: Experience) -> ListingOut:
    rating = exp.attributes.get("rating") if exp.attributes else None
    return ListingOut(
        id=exp.id,
        title=exp.title,
        category_slug=exp.category.slug,
        location=exp.location,
        image_url=(exp.images or [None])[0],
        price_tier=exp.price_tier,
        status=exp.status,
        owner_id=exp.owner_id,
        rating=float(rating) if isinstance(rating, (int, float)) else None,
    )


# --- Listings ---------------------------------------------------------------

@router.post(
    "/listings", response_model=ListingOut, status_code=status.HTTP_201_CREATED
)
def create_listing(
    payload: ListingCreate,
    db: Session = Depends(get_db),
    account: User = Depends(get_current_business),
) -> ListingOut:
    category = db.scalar(
        select(Category).where(Category.slug == payload.category_slug)
    )
    if category is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown category")

    exp = Experience(
        category_id=category.id,
        title=payload.title,
        description=payload.description,
        images=[payload.image_url] if payload.image_url else [],
        location=payload.location,
        lat=payload.latitude,
        lng=payload.longitude,
        price_tier=payload.price_tier,
        attributes={**payload.attributes, "type": category.name},
        status=ListingStatus.pending,  # awaits admin approval
        owner_id=account.id,
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    exp.category  # ensure loaded for serialization
    return _listing_out(exp)


@router.get("/listings", response_model=list[ListingOut])
def my_listings(
    db: Session = Depends(get_db),
    account: User = Depends(get_current_business),
) -> list[ListingOut]:
    rows = db.scalars(
        select(Experience)
        .options(joinedload(Experience.category))
        .where(Experience.owner_id == account.id)
        .order_by(Experience.title)
    ).all()
    return [_listing_out(e) for e in rows]


@router.patch("/listings/{listing_id}", response_model=ListingOut)
def edit_listing(
    listing_id: UUID,
    payload: ListingUpdate,
    db: Session = Depends(get_db),
    account: User = Depends(get_current_business),
) -> ListingOut:
    exp = db.scalar(
        select(Experience)
        .options(joinedload(Experience.category))
        .where(Experience.id == listing_id)
    )
    if exp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    if exp.owner_id != account.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your listing")

    data = payload.model_dump(exclude_unset=True)
    if "latitude" in data:
        exp.lat = data.pop("latitude")
    if "longitude" in data:
        exp.lng = data.pop("longitude")
    if "image_url" in data:
        url = data.pop("image_url")
        exp.images = [url] if url else []
    for key, value in data.items():
        setattr(exp, key, value)

    db.commit()
    db.refresh(exp)
    return _listing_out(exp)
