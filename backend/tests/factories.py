"""Test data factories — a small, controlled category so filter-narrowing
assertions are exact (no reliance on the full seed)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Category, Experience, FilterDefinition, FilterType

# (title, attributes) — one enum (sometimes an array), one range, one boolean.
_EXPERIENCES = [
    ("E1 Red Small Premium", {"color": "Red", "size": 2, "premium": True}),
    ("E2 Blue Mid", {"color": "Blue", "size": 5, "premium": False}),
    ("E3 Green Large Premium", {"color": "Green", "size": 8, "premium": True}),
    ("E4 RedBlue Max", {"color": ["Red", "Blue"], "size": 10, "premium": False}),
    ("E5 Green Small Premium", {"color": "Green", "size": 3, "premium": True}),
]


def seed_category(db: Session, slug: str = "widgets") -> Category:
    """Insert a `Widgets` category with enum/range/boolean filters and 5
    experiences with known attributes. Returns the committed Category."""

    category = Category(slug=slug, name="Widgets", icon="widgets")
    db.add(category)
    db.flush()

    db.add_all(
        [
            FilterDefinition(
                category_id=category.id,
                key="color",
                label="Color",
                type=FilterType.enum,
                options={"values": ["Red", "Blue", "Green"]},
            ),
            FilterDefinition(
                category_id=category.id,
                key="size",
                label="Size",
                type=FilterType.range,
                options={"min": 1, "max": 10},
            ),
            FilterDefinition(
                category_id=category.id,
                key="premium",
                label="Premium",
                type=FilterType.boolean,
            ),
        ]
    )

    for index, (title, attributes) in enumerate(_EXPERIENCES):
        db.add(
            Experience(
                category_id=category.id,
                title=title,
                images=[],
                location="Nairobi",
                price_tier=(index % 4) + 1,
                attributes=attributes,
            )
        )

    db.commit()
    return category


def experience_ids(db: Session, slug: str = "widgets") -> list:
    category = db.query(Category).filter(Category.slug == slug).one()
    return [e.id for e in category.experiences]
