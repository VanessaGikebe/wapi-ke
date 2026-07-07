"""Import the real scraped Google-Maps dataset (backend/data/*.json) into Postgres.

This REPLACES the dummy seed catalog. It is the single normalization layer for
the project and does everything Phase 5 asks for:

  * de-duplicates businesses by ``placeId`` (a place can be scraped under several
    searches; we keep it once),
  * standardizes / merges categories (the 9 app categories are derived from the
    source files; "Restaurants" is rebuilt from Kenyan restaurant-type places
    across every file because the dedicated Restaurants.json is New-York data),
  * generates slugs, cleans addresses into a short location label,
  * stores image URLs, rating, reviews, contact + opening hours,
  * derives a price tier from the messy ``price`` field,
  * turns Google's ``additionalInfo`` booleans into per-experience attributes and
    auto-generates the category filter schema from whatever is actually present,
  * handles missing values, logs every skipped record, and
  * is fully idempotent — it wipes categories/filters/experiences and re-inserts,
    so it is safe to run repeatedly.

Run from the backend/ directory:

    python scripts/import_data.py
"""

from __future__ import annotations

import collections
import glob
import json
import os
import re
from typing import Any

from sqlalchemy import delete

from app.db import SessionLocal
from app.models import Category, Experience, FilterDefinition, FilterType
from app.seed_images import CATEGORY_HERO

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

# --- Category definitions (the 9 app categories) ----------------------------
# Each source file maps to one category. Restaurants.json is intentionally
# excluded (NYC data); the Restaurants category is rebuilt from Kenyan
# restaurant-type places found across the other files.

CATEGORY_META = {
    "restaurants": ("Restaurants", "restaurant"),
    "nightlife": ("Nightlife", "nightlife"),
    "cafes": ("Cafés", "local_cafe"),
    "outdoor-activities": ("Outdoor Activities", "hiking"),
    "family-activities": ("Family Activities", "family_restroom"),
    "wellness": ("Wellness", "spa"),
    "picnics": ("Picnics", "deck"),
    "museums-art": ("Museums & Art", "museum"),
    "coastal": ("Coastal Experiences", "beach_access"),
}

FILE_TO_SLUG = {
    "wellness.json": "wellness",
    "nightlife.json": "nightlife",
    "cafes.json": "cafes",
    "Museums and art.json": "museums-art",
    "Coastal experience.json": "coastal",
    "Outdoor activities.json": "outdoor-activities",
    "Picnic spots.json": "picnics",
    "Family Activities.json": "family-activities",
}

# When a place was scraped under several searches, the first slug here wins.
PRIORITY = [
    "wellness",
    "museums-art",
    "nightlife",
    "cafes",
    "coastal",
    "outdoor-activities",
    "picnics",
    "family-activities",
]
PRIORITY_INDEX = {slug: i for i, slug in enumerate(PRIORITY)}

# --- additionalInfo -> filterable boolean attributes ------------------------
# key -> (human label, {normalized Google labels that set it true}).
# Spelling variants from the data ("Cozy"/"Cosy", "Takeout"/"Takeaway",
# "Wheelchair accessible*"/"Wheelchair-accessible*") are folded together.

ATTRIBUTE_MAP: dict[str, tuple[str, set[str]]] = {
    "outdoor_seating": ("Outdoor seating", {"outdoor seating"}),
    "rooftop": ("Rooftop seating", {"rooftop seating"}),
    "takeaway": ("Takeaway", {"takeout", "takeaway"}),
    "delivery": ("Delivery", {"delivery", "no contact delivery"}),
    "dine_in": ("Dine-in", {"dine in"}),
    "drive_through": ("Drive-through", {"drive through"}),
    "serves_alcohol": ("Serves alcohol", {"alcohol"}),
    "cocktails": ("Cocktails", {"cocktails", "great cocktails"}),
    "craft_beer": ("Craft beer", {"beer", "great beer selection"}),
    "wine": ("Wine", {"wine", "great wine list"}),
    "happy_hour": ("Happy hour", {"happy hour drinks", "happy hour food",
                                  "happy hour", "happy-hour drinks"}),
    "live_music": ("Live music", {"live music", "live performances"}),
    "dancing": ("Dancing / DJ", {"dancing"}),
    "sports": ("Sports on TV", {"sports", "sport"}),
    "karaoke": ("Karaoke", {"karaoke"}),
    "great_coffee": ("Great coffee", {"great coffee"}),
    "great_tea": ("Great tea selection", {"great tea selection"}),
    "brunch": ("Brunch", {"brunch"}),
    "breakfast": ("Breakfast", {"breakfast"}),
    "desserts": ("Desserts", {"dessert", "great dessert"}),
    "vegetarian": ("Vegetarian options", {"vegetarian options"}),
    "vegan": ("Vegan options", {"vegan options"}),
    "halal": ("Halal", {"halal food", "halal"}),
    "healthy": ("Healthy options", {"healthy options", "organic dishes"}),
    "wifi": ("Free Wi-Fi", {"free wi fi", "wi fi", "wifi"}),
    "work_friendly": ("Work-friendly", {"good for working on laptop"}),
    "bar_onsite": ("Bar on site", {"bar onsite", "bar on site"}),
    "good_for_kids": ("Good for kids", {"good for kids"}),
    "kids_menu": ("Kids' menu", {"kids menu"}),
    "high_chairs": ("High chairs", {"high chairs"}),
    "playground": ("Playground", {"playground"}),
    "swings": ("Swings", {"swings"}),
    "slides": ("Slides", {"slides"}),
    "picnic_tables": ("Picnic tables", {"picnic tables"}),
    "bbq": ("Barbecue grill", {"barbecue grill"}),
    "hiking": ("Hiking", {"hiking", "kid friendly hikes"}),
    "cycling": ("Cycling", {"cycling lanes"}),
    "camping": ("Camping", {"tent sites", "rv camping"}),
    "dog_friendly": ("Dog-friendly", {"dogs allowed", "dog park",
                                      "dogs allowed outside", "dogs allowed inside"}),
    "wheelchair": ("Wheelchair accessible", {"wheelchair accessible entrance",
                                             "wheelchair accessible car park"}),
    "free_parking": ("Free parking", {"free parking lot", "free parking garage",
                                      "free street parking",
                                      "free of charge street parking"}),
    "reservations": ("Accepts reservations", {"accepts reservations"}),
    "by_appointment": ("By appointment", {"appointment required",
                                          "appointments recommended",
                                          "online appointments",
                                          "reservations required"}),
    "sauna": ("Sauna", {"sauna"}),
    "skincare": ("Skincare treatments", {"skincare treatments"}),
    "women_owned": ("Women-owned", {"identifies as women owned"}),
    "romantic": ("Romantic", {"romantic"}),
    "cozy": ("Cosy", {"cozy", "cosy"}),
    "trendy": ("Trendy", {"trendy"}),
    "upscale": ("Upscale", {"upscale"}),
    "quiet": ("Quiet", {"quiet"}),
    "groups": ("Good for groups", {"groups"}),
    "family_friendly": ("Family-friendly", {"family friendly"}),
    "late_night": ("Late-night food", {"late night food"}),
    "catering": ("Catering", {"catering"}),
    "private_dining": ("Private dining", {"private dining room"}),
    "fireplace": ("Fireplace", {"fireplace"}),
    "free_breakfast": ("Free breakfast", {"free breakfast"}),
}

RESERVED_ATTR_KEYS = {"type", "cuisine", "city", "price_tier", "rating"}


def norm(label: str) -> str:
    s = label.lower().replace("-", " ").replace("’", "'")
    return re.sub(r"\s+", " ", s).strip()


# Reverse index: normalized Google label -> attribute key.
_LABEL_TO_KEY: dict[str, str] = {}
for _key, (_lbl, _aliases) in ATTRIBUTE_MAP.items():
    for _alias in _aliases:
        _LABEL_TO_KEY[_alias] = _key


def load_file(path: str) -> list[dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        for v in data.values():
            if isinstance(v, list):
                return v
        return []
    return data


def is_kenya(rec: dict[str, Any]) -> bool:
    if rec.get("countryCode") == "KE":
        return True
    loc = rec.get("location") or {}
    lat, lng = loc.get("lat"), loc.get("lng")
    if lat is not None and lng is not None:
        return -5.5 <= lat <= 5.5 and 33.0 <= lng <= 42.0
    return False


# categoryName values that are real Google results but not "experiences" we want
# to surface (retail / utilities / services). Matched as substrings, lower-cased.
NOISE_TYPES = {
    "supermarket", "grocery", "convenience store", "kitchen supply",
    "atm", "bank", "gas station", "petrol", "car wash", "hardware",
    "pharmacy", "chemist", "wholesaler", "distribution service",
    "corporate office", "real estate", "school", "university", "college",
    "hospital", "clinic", "dentist", "doctor", "money transfer",
    "mobile phone", "electronics store", "furniture store", "warehouse",
    "auto parts", "car repair", "car dealer", "stationery",
}


def is_noise(category_name: str | None) -> bool:
    if not category_name:
        return False
    low = category_name.lower()
    return any(token in low for token in NOISE_TYPES)


def is_restaurant(category_name: str | None) -> bool:
    return bool(category_name) and "restaurant" in category_name.lower()


def cuisine_of(category_name: str | None) -> str | None:
    if not category_name:
        return None
    cn = category_name.strip()
    low = cn.lower()
    if low == "restaurant":
        return None
    if low.endswith("restaurant"):
        return cn[: -len("restaurant")].strip() or None
    return None


def clean_city(city: str | None) -> str | None:
    if not city:
        return None
    c = city.strip().strip(".")
    if not c or c == "—":
        return None
    # Collapse Nairobi variants.
    if c.lower().startswith("nairobi"):
        return "Nairobi"
    return c


def location_label(rec: dict[str, Any]) -> str:
    neigh = (rec.get("neighborhood") or "").strip() or None
    city = clean_city(rec.get("city"))
    parts = [p for p in (neigh, city) if p and p != "—"]
    if len(parts) == 2 and parts[0].lower() == parts[1].lower():
        parts = parts[:1]
    if parts:
        return ", ".join(parts)
    street = (rec.get("street") or "").strip()
    return street or "Kenya"


_NUM = re.compile(r"[\d,]+")


def price_tier(price: str | None) -> int | None:
    """Map Google's messy ``price`` to a 1–4 tier, or None when absent."""
    if not price:
        return None
    s = price.replace(" ", " ").strip()
    if s and set(s) <= set("$"):
        return min(len(s), 4)
    if s and set(s) <= set("€"):
        return min(len(s), 4)
    nums = [int(n.replace(",", "")) for n in _NUM.findall(s)]
    if not nums:
        return None
    hi = max(nums)
    if "kes" in s.lower() or hi > 200:  # Kenyan-shilling amounts
        return 1 if hi <= 1000 else 2 if hi <= 3000 else 3 if hi <= 6000 else 4
    return 1 if hi <= 15 else 2 if hi <= 35 else 3 if hi <= 75 else 4  # USD-ish


def extract_attributes(rec: dict[str, Any]) -> dict[str, bool]:
    """Fold Google ``additionalInfo`` booleans into our attribute keys."""
    out: dict[str, bool] = {}
    ai = rec.get("additionalInfo") or {}
    for items in ai.values():
        if not isinstance(items, list):
            continue
        for item in items:
            if not isinstance(item, dict):
                continue
            for label, value in item.items():
                if value is True:
                    key = _LABEL_TO_KEY.get(norm(label))
                    if key:
                        out[key] = True
    return out


def build_experience(rec: dict[str, Any], slug: str) -> dict[str, Any]:
    loc = rec.get("location") or {}
    category_name = (rec.get("categoryName") or "").strip() or None
    tier = price_tier(rec.get("price"))
    score = rec.get("totalScore")

    attributes: dict[str, Any] = extract_attributes(rec)
    attributes["price_tier"] = tier if tier is not None else 2
    if score is not None:
        attributes["rating"] = score
    if category_name:
        attributes["type"] = category_name
    city = clean_city(rec.get("city"))
    if city:
        attributes["city"] = city
    if slug == "restaurants":
        cz = cuisine_of(category_name)
        if cz:
            attributes["cuisine"] = cz

    # Display-only fields (ignored by the filter engine, read by the UI).
    attributes["reviews_count"] = rec.get("reviewsCount") or 0
    if rec.get("phone"):
        attributes["phone"] = rec["phone"]
    if rec.get("website"):
        attributes["website"] = rec["website"]
    if rec.get("address"):
        attributes["address"] = rec["address"]
    if rec.get("openingHours"):
        attributes["opening_hours"] = rec["openingHours"]
    if rec.get("price"):
        attributes["price_label"] = rec["price"].replace(" ", " ")
    if rec.get("url"):
        attributes["google_url"] = rec["url"]
    attributes["category_name"] = category_name

    loc_label = location_label(rec)
    description = (rec.get("description") or "").strip()
    if not description:
        descriptor = category_name or "Experience"
        description = f"{descriptor} in {loc_label}."

    images = [rec["imageUrl"]] if rec.get("imageUrl") else []

    return {
        "slug": slug,
        "title": (rec.get("title") or "Untitled").strip()[:200],
        "description": description,
        "images": images,
        "location": loc_label[:200],
        "lat": loc.get("lat"),
        "lng": loc.get("lng"),
        "price_tier": tier if tier is not None else 2,
        "attributes": attributes,
        "_rating": score or 0,
        "_reviews": rec.get("reviewsCount") or 0,
        "_image": rec.get("imageUrl"),
    }


def collect() -> tuple[dict[str, list[dict[str, Any]]], dict[str, int]]:
    """Return experiences grouped by category slug, plus a skip-log."""
    files = glob.glob(os.path.join(DATA_DIR, "*.json"))
    # placeId -> {"rec": record, "slugs": set(source slugs)}
    places: dict[str, dict[str, Any]] = {}
    for path in files:
        fname = os.path.basename(path)
        if fname not in FILE_TO_SLUG:  # skips Restaurants.json (NYC)
            continue
        for rec in load_file(path):
            pid = rec.get("placeId") or f"__{fname}:{rec.get('title')}"
            entry = places.setdefault(pid, {"rec": rec, "slugs": set()})
            entry["slugs"].add(FILE_TO_SLUG[fname])

    grouped: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    skips = collections.Counter()
    for entry in places.values():
        rec = entry["rec"]
        if rec.get("permanentlyClosed"):
            skips["permanently_closed"] += 1
            continue
        if not is_kenya(rec):
            skips["non_kenya"] += 1
            continue
        if is_noise(rec.get("categoryName")):
            skips["noise_type"] += 1
            continue
        loc = rec.get("location") or {}
        if loc.get("lat") is None or loc.get("lng") is None:
            skips["missing_coords"] += 1
            continue
        if is_restaurant(rec.get("categoryName")):
            slug = "restaurants"
        else:
            slug = min(entry["slugs"], key=lambda s: PRIORITY_INDEX[s])
        if not rec.get("imageUrl"):
            skips["missing_image"] += 1  # logged but still imported
        grouped[slug].append(build_experience(rec, slug))
    return grouped, skips


def build_filters(experiences: list[dict[str, Any]], slug: str) -> list[dict[str, Any]]:
    """Auto-generate a category's filter schema from its actual experiences."""
    n = len(experiences)
    filters: list[dict[str, Any]] = []

    def enum_filter(key: str, label: str, min_count: int, cap: int) -> None:
        counter = collections.Counter(
            e["attributes"].get(key) for e in experiences
        )
        values = [
            v for v, c in counter.most_common()
            if v and c >= min_count
        ][:cap]
        if len(values) >= 2:
            filters.append({
                "key": key, "label": label, "type": "enum",
                "options": {"values": values},
            })

    # Type / cuisine / city enums (data-driven option lists).
    if slug == "restaurants":
        enum_filter("cuisine", "Cuisine", max(10, n // 80), 14)
    enum_filter("type", "Type", max(12, n // 40), 12)
    enum_filter("city", "Area", max(15, n // 40), 12)

    # Price (budget cap) + rating (floor).
    filters.append({
        "key": "price_tier", "label": "Price", "type": "range",
        "options": {"min": 1, "max": 4, "step": 1, "format": "currency"},
    })
    filters.append({
        "key": "rating", "label": "Minimum rating", "type": "range",
        "options": {"min": 3.0, "max": 5.0, "step": 0.5,
                    "direction": "min", "format": "rating"},
    })

    # Boolean filters: every mapped attribute that is common enough to matter
    # but not universal (so it actually narrows results).
    bool_cov: list[tuple[str, float]] = []
    for key, (label, _aliases) in ATTRIBUTE_MAP.items():
        c = sum(1 for e in experiences if e["attributes"].get(key) is True)
        cov = c / n if n else 0
        if 0.06 <= cov <= 0.95:
            bool_cov.append((key, cov))
    bool_cov.sort(key=lambda x: x[1], reverse=True)
    for key, _cov in bool_cov[:12]:
        filters.append({
            "key": key, "label": ATTRIBUTE_MAP[key][0], "type": "boolean",
        })
    return filters


def pick_hero(experiences: list[dict[str, Any]]) -> str | None:
    best = None
    best_score = -1.0
    for e in experiences:
        if not e["_image"]:
            continue
        # Favour well-reviewed, highly rated places for the category cover.
        score = e["_rating"] * (1 + min(e["_reviews"], 500) / 500)
        if score > best_score:
            best_score, best = score, e["_image"]
    return best


def run() -> None:
    grouped, skips = collect()
    session = SessionLocal()
    try:
        session.execute(delete(Experience))
        session.execute(delete(FilterDefinition))
        session.execute(delete(Category))
        session.flush()

        total_exp = 0
        total_filters = 0
        summary: list[tuple[str, int, int]] = []

        for slug, (name, icon) in CATEGORY_META.items():
            experiences = grouped.get(slug, [])
            if not experiences:
                continue
            category = Category(
                slug=slug,
                name=name,
                icon=icon,
                # Curated, distinct tile image; fall back to the best scraped
                # photo only if a slug has no curated entry.
                hero_image=CATEGORY_HERO.get(slug) or pick_hero(experiences),
            )
            session.add(category)
            session.flush()

            schema = build_filters(experiences, slug)
            for f in schema:
                session.add(FilterDefinition(
                    category_id=category.id,
                    key=f["key"],
                    label=f["label"],
                    type=FilterType(f["type"]),
                    options=f.get("options"),
                ))
            total_filters += len(schema)

            for e in experiences:
                session.add(Experience(
                    category_id=category.id,
                    title=e["title"],
                    description=e["description"],
                    images=e["images"],
                    location=e["location"],
                    lat=e["lat"],
                    lng=e["lng"],
                    price_tier=e["price_tier"],
                    attributes=e["attributes"],
                ))
            total_exp += len(experiences)
            summary.append((name, len(experiences), len(schema)))

        session.commit()

        print("=== Import complete ===")
        for name, ne, nf in sorted(summary, key=lambda x: -x[1]):
            print(f"  {name:22s} {ne:5d} experiences  {nf:2d} filters")
        print(f"  {'TOTAL':22s} {total_exp:5d} experiences  {total_filters} filters")
        print("\n=== Skipped (logged) ===")
        for reason, count in skips.most_common():
            print(f"  {reason:20s} {count}")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run()
