"""Curated, distinct cover images for the category tiles (data/config).

One license-safe Unsplash photo per category, chosen so **no two category tiles
share an image**. The IDs are reused from the frontend's already-validated pool
(``frontend/lib/images.ts``), so every URL is known to return HTTP 200. Used by
the seeders (``import_data.py``, ``seed.py``) and the one-off backfill
(``scripts/set_category_images.py``) so all three stay in sync.
"""

from __future__ import annotations


def _photo(photo_id: str, w: int = 1200, q: int = 70) -> str:
    return (
        f"https://images.unsplash.com/photo-{photo_id}"
        f"?auto=format&fit=crop&w={w}&q={q}"
    )


# slug -> Unsplash photo id. Every id is distinct and validated in lib/images.ts.
_CATEGORY_HERO_IDS: dict[str, str] = {
    # Production categories (import_data.py / CATEGORY_META).
    "restaurants": "1414235077428-338989a2e8c0",
    "nightlife": "1566417713940-fe7c737a9ef2",
    "cafes": "1495474472287-4d71bcdd2085",
    "outdoor-activities": "1551632811-561732d1e306",
    "family-activities": "1503454537195-1dcabb73ffb9",
    "wellness": "1600334089648-b0d9d3028eb2",
    "picnics": "1595856619767-ab739fa7daae",
    "museums-art": "1533929736458-ca588d08c8be",
    "coastal": "1571896349842-33c89424de2d",
    # Dev synthetic categories (seed.py) with no scraped equivalent.
    "hiking": "1454496522488-7a8e488e8606",
    "outdoor-adventures": "1533240332313-0db49b459ad6",
    "staycations": "1502680390469-be75c86b636f",
    "cultural-experiences": "1611348586804-61bf6c080437",
    "road-trips": "1530866495561-507c9faab2ed",
}

# slug -> full cover URL.
CATEGORY_HERO: dict[str, str] = {
    slug: _photo(pid) for slug, pid in _CATEGORY_HERO_IDS.items()
}
