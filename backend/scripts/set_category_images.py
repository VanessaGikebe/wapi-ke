"""Backfill distinct curated cover images onto existing category rows.

Each category tile must show a distinct image. ``import_data.py`` / ``seed.py``
now set this on insert; this one-off updates rows already present in a database
**without** a full re-import (handy for the deployed DB). Idempotent.

Run from ``backend/`` (optionally targeting another DB via ``DATABASE_URL``)::

    python scripts/set_category_images.py
    DATABASE_URL="postgresql://<render-external-url>" python scripts/set_category_images.py
"""

from __future__ import annotations

from sqlalchemy import select

from app.db import SessionLocal
from app.models import Category
from app.seed_images import CATEGORY_HERO


def main() -> None:
    updated = 0
    skipped: list[str] = []
    with SessionLocal() as db:
        for category in db.scalars(select(Category)):
            hero = CATEGORY_HERO.get(category.slug)
            if hero is None:
                skipped.append(category.slug)
                continue
            if category.hero_image != hero:
                category.hero_image = hero
                print(f"[ok]   {category.slug} -> {hero}")
                updated += 1
        db.commit()

    print(f"\nUpdated hero_image on {updated} categor{'y' if updated == 1 else 'ies'}.")
    if skipped:
        print(f"! No curated image for slugs (left unchanged): {sorted(skipped)}")


if __name__ == "__main__":
    main()
