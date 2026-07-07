"""Seed the database with the 10 categories, their filter schemas (CLAUDE.md
§6), and a handful of sample experiences each.

Mirrors the frontend mock catalog (frontend/lib/mock/catalog.ts) so the API in
Phase 9 returns the same shapes the UI already renders. Experience attributes
are generated deterministically from each category's filter schema, so every
attribute lines up with a real filter `key`.

Idempotent: wipes categories/filters/experiences and re-inserts. Run with:

    python scripts/seed.py            # from the backend/ directory
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import delete

from app.db import SessionLocal
from app.models import (
    Category,
    Experience,
    FilterDefinition,
    FilterType,
)
from app.seed_images import CATEGORY_HERO

# --- Category + filter schemas (CLAUDE.md §6) -------------------------------

CATEGORIES: list[dict[str, Any]] = [
    {
        "slug": "restaurants",
        "name": "Restaurants",
        "icon": "restaurant",
        "filters": [
            {
                "key": "cuisine",
                "label": "Cuisine",
                "type": "enum",
                "options": {
                    "values": [
                        "Italian",
                        "Swahili",
                        "Indian",
                        "Japanese",
                        "Continental",
                        "Ethiopian",
                        "Seafood",
                    ]
                },
            },
            {
                "key": "price_tier",
                "label": "Price range",
                "type": "range",
                "options": {"min": 1, "max": 4, "step": 1, "format": "currency"},
            },
            {
                "key": "dining_style",
                "label": "Dining style",
                "type": "enum",
                "options": {
                    "values": ["Fine dining", "Casual", "Rooftop", "Buffet"]
                },
            },
            {
                "key": "dietary",
                "label": "Dietary preference",
                "type": "enum",
                "options": {
                    "values": ["Vegetarian", "Vegan", "Halal", "Gluten-free"]
                },
            },
            {
                "key": "seating",
                "label": "Seating",
                "type": "enum",
                "options": {"values": ["Indoor", "Outdoor"]},
            },
            {
                "key": "ambience",
                "label": "Atmosphere",
                "type": "enum",
                "options": {"values": ["Romantic", "Family-friendly"]},
            },
        ],
        "seeds": [
            ("The Savannah Room", "Nairobi"),
            ("Altitude Lounge", "Westlands"),
            ("Ocean Drift", "Mombasa"),
            ("Atelier 42", "Karen"),
            ("The Greenhouse", "Kilimani"),
            ("Mara Under Canvas", "Masai Mara"),
            ("Tamarind Terrace", "Diani"),
            ("Nyama Republic", "Nakuru"),
        ],
    },
    {
        "slug": "hiking",
        "name": "Hiking",
        "icon": "hiking",
        "filters": [
            {
                "key": "difficulty",
                "label": "Difficulty",
                "type": "enum",
                "options": {"values": ["Beginner", "Intermediate", "Advanced"]},
            },
            {
                "key": "group",
                "label": "Group type",
                "type": "enum",
                "options": {"values": ["Solo", "Group"]},
            },
            {
                "key": "duration_hours",
                "label": "Duration",
                "type": "range",
                "options": {"min": 1, "max": 12, "step": 1, "unit": "hrs"},
            },
            {
                "key": "distance_km",
                "label": "Distance",
                "type": "range",
                "options": {"min": 1, "max": 30, "step": 1, "unit": "km"},
            },
            {"key": "waterfalls", "label": "Waterfalls", "type": "boolean"},
            {"key": "camping", "label": "Camping available", "type": "boolean"},
            {"key": "pet_friendly", "label": "Pet-friendly", "type": "boolean"},
        ],
        "seeds": [
            ("Karura Forest Loop", "Nairobi"),
            ("Ngong Hills Ridge", "Ngong"),
            ("Mount Longonot Crater", "Naivasha"),
            ("Aberdare Falls Trail", "Aberdares"),
            ("Elephant Hill Climb", "Nyandarua"),
            ("Hell's Gate Gorge", "Naivasha"),
            ("Mt Kenya Sirimon Route", "Nanyuki"),
            ("Karima Hill", "Nyeri"),
        ],
    },
    {
        "slug": "picnics",
        "name": "Picnics",
        "icon": "deck",
        "filters": [
            {
                "key": "location_type",
                "label": "Location",
                "type": "enum",
                "options": {"values": ["Lakeside", "Park", "Scenic viewpoint"]},
            },
            {"key": "picnic_setup", "label": "Setup provided", "type": "boolean"},
            {"key": "bbq", "label": "BBQ facilities", "type": "boolean"},
            {
                "key": "audience",
                "label": "Best for",
                "type": "enum",
                "options": {"values": ["Family-friendly", "Couples"]},
            },
            {
                "key": "accessible",
                "label": "Wheelchair accessible",
                "type": "boolean",
            },
        ],
        "seeds": [
            ("Lake Naivasha Shore", "Naivasha"),
            ("Karura Glade", "Nairobi"),
            ("Arboretum Lawns", "Nairobi"),
            ("Limuru Tea Fields", "Limuru"),
            ("Sagana Riverside", "Sagana"),
            ("Oloolua Clearing", "Karen"),
        ],
    },
    {
        "slug": "nightlife",
        "name": "Nightlife",
        "icon": "nightlife",
        "filters": [
            {
                "key": "venue_type",
                "label": "Venue",
                "type": "enum",
                "options": {"values": ["Club", "Lounge", "Rooftop bar"]},
            },
            {
                "key": "entertainment",
                "label": "Entertainment",
                "type": "enum",
                "options": {"values": ["Live music", "Karaoke", "DJ events"]},
            },
            {"key": "cocktails", "label": "Cocktail bar", "type": "boolean"},
            {
                "key": "age_restriction",
                "label": "Age restriction",
                "type": "enum",
                "options": {"values": ["18+", "21+", "All ages"]},
            },
            {
                "key": "dress_code",
                "label": "Dress code",
                "type": "enum",
                "options": {"values": ["Casual", "Smart casual", "Formal"]},
            },
        ],
        "seeds": [
            ("Skyline Rooftop", "Westlands"),
            ("The Alchemist", "Westlands"),
            ("Brew Bistro", "Lavington"),
            ("Kiza Lounge", "Kilimani"),
            ("Havana Nights", "Nairobi"),
            ("Tribe Terrace", "Gigiri"),
        ],
    },
    {
        "slug": "outdoor-adventures",
        "name": "Outdoor Adventures",
        "icon": "kayaking",
        "filters": [
            {
                "key": "activity",
                "label": "Activity",
                "type": "enum",
                "options": {
                    "values": [
                        "Ziplining",
                        "ATV riding",
                        "Horse riding",
                        "Kayaking",
                        "Cycling",
                        "Rock climbing",
                        "Paintball",
                        "Quad biking",
                    ]
                },
            },
        ],
        "seeds": [
            ("Sagana Rapids Rafting", "Sagana"),
            ("Hell's Gate Cycling", "Naivasha"),
            ("Kereita Forest Zipline", "Kereita"),
            ("Swara Quad Trails", "Athi River"),
            ("Oloolua Paintball", "Karen"),
            ("Mara Horseback Safari", "Masai Mara"),
        ],
    },
    {
        "slug": "staycations",
        "name": "Staycations",
        "icon": "hotel",
        "filters": [
            {
                "key": "stay_type",
                "label": "Stay type",
                "type": "enum",
                "options": {
                    "values": ["Hotel", "Cabin", "Airbnb", "Luxury resort"]
                },
            },
            {
                "key": "amenities",
                "label": "Amenities",
                "type": "enum",
                "options": {"values": ["Spa package", "Swimming pool"]},
            },
            {
                "key": "view",
                "label": "View",
                "type": "enum",
                "options": {"values": ["Mountain", "Lakeside"]},
            },
        ],
        "seeds": [
            ("Acacia Cabins", "Nanyuki"),
            ("Lakeview Resort", "Naivasha"),
            ("Hilltop Hideaway", "Tigoni"),
            ("Urban Loft", "Westlands"),
            ("Mara Tented Camp", "Masai Mara"),
            ("Coral Beach Villa", "Diani"),
        ],
    },
    {
        "slug": "cafes",
        "name": "Cafés",
        "icon": "local_cafe",
        "filters": [
            {
                "key": "offerings",
                "label": "Known for",
                "type": "enum",
                "options": {
                    "values": ["Specialty coffee", "Brunch", "Desserts"]
                },
            },
            {"key": "work_friendly", "label": "Work-friendly", "type": "boolean"},
            {
                "key": "outdoor_seating",
                "label": "Outdoor seating",
                "type": "boolean",
            },
            {"key": "aesthetic", "label": "Aesthetic spot", "type": "boolean"},
        ],
        "seeds": [
            ("Pallet Café", "Karen"),
            ("Spring Valley Coffee", "Westlands"),
            ("The Good Earth", "Kilimani"),
            ("Arbor Brew", "Lavington"),
            ("Connect Coffee", "Riverside"),
            ("Zucchini Greens", "Lavington"),
        ],
    },
    {
        "slug": "cultural-experiences",
        "name": "Cultural Experiences",
        "icon": "museum",
        "filters": [
            {
                "key": "type",
                "label": "Type",
                "type": "enum",
                "options": {
                    "values": [
                        "Museum",
                        "Art gallery",
                        "Historical site",
                        "Cultural village",
                        "Local market",
                        "Festival",
                    ]
                },
            },
        ],
        "seeds": [
            ("Nairobi National Museum", "Nairobi"),
            ("Bomas of Kenya", "Langata"),
            ("Karen Blixen Museum", "Karen"),
            ("Maasai Market", "Nairobi"),
            ("Fort Jesus", "Mombasa"),
            ("Lamu Old Town", "Lamu"),
        ],
    },
    {
        "slug": "road-trips",
        "name": "Road Trips",
        "icon": "directions_car",
        "filters": [
            {
                "key": "highlights",
                "label": "Highlights",
                "type": "enum",
                "options": {
                    "values": ["Scenic routes", "Viewpoints", "Nearby attractions"]
                },
            },
            {"key": "camping_spots", "label": "Camping spots", "type": "boolean"},
            {
                "key": "fuel_stops",
                "label": "Fuel stops en route",
                "type": "boolean",
            },
        ],
        "seeds": [
            ("Rift Valley Viewpoint Run", "Rift Valley"),
            ("Nairobi-Naivasha Escarpment", "Naivasha"),
            ("Mombasa Coastal Drive", "Mombasa"),
            ("Mount Kenya Circuit", "Nanyuki"),
            ("Magadi Soda Road", "Magadi"),
            ("Aberdare Loop", "Nyeri"),
        ],
    },
    {
        "slug": "family-activities",
        "name": "Family Activities",
        "icon": "family_restroom",
        "filters": [
            {
                "key": "type",
                "label": "Type",
                "type": "enum",
                "options": {
                    "values": [
                        "Children's park",
                        "Amusement park",
                        "Educational attraction",
                        "Animal park",
                        "Indoor play area",
                    ]
                },
            },
        ],
        "seeds": [
            ("Nairobi Safari Walk", "Langata"),
            ("Two Rivers Funscape", "Ruaka"),
            ("Giraffe Centre", "Karen"),
            ("Paradise Lost", "Kiambu"),
            ("GP Karting", "Langata"),
            ("Little Explorers Park", "Westlands"),
        ],
    },
]


def build_attributes(
    filters: list[dict[str, Any]], index: int
) -> tuple[dict[str, Any], int]:
    """Deterministically derive an experience's attributes from the schema."""

    price_tier = (index % 4) + 1
    attributes: dict[str, Any] = {}

    for fi, f in enumerate(filters):
        key = f["key"]
        if f["type"] == "enum":
            values = f["options"]["values"]
            a = values[(index + fi) % len(values)]
            b = values[(index + fi + 1) % len(values)]
            attributes[key] = (
                [a, b] if (index % 3 == 0 and len(values) > 1) else a
            )
        elif f["type"] == "range":
            if key == "price_tier":
                attributes[key] = price_tier
            else:
                lo = f["options"]["min"]
                hi = f["options"]["max"]
                span = hi - lo
                attributes[key] = lo + ((index * 3 + fi * 2) % (span + 1))
        else:  # boolean
            attributes[key] = (index + fi) % 2 == 0

    return attributes, price_tier


def seed() -> None:
    session = SessionLocal()
    try:
        # Idempotent reset (FK-safe order; cascades cover favorites/bookings).
        session.execute(delete(Experience))
        session.execute(delete(FilterDefinition))
        session.execute(delete(Category))
        session.flush()

        total_filters = 0
        total_experiences = 0

        for cat in CATEGORIES:
            category = Category(
                slug=cat["slug"],
                name=cat["name"],
                icon=cat["icon"],
                hero_image=CATEGORY_HERO.get(cat["slug"]),
            )
            session.add(category)
            session.flush()  # assign category.id

            for f in cat["filters"]:
                session.add(
                    FilterDefinition(
                        category_id=category.id,
                        key=f["key"],
                        label=f["label"],
                        type=FilterType(f["type"]),
                        options=f.get("options"),
                    )
                )
                total_filters += 1

            for index, (title, location) in enumerate(cat["seeds"]):
                attributes, price_tier = build_attributes(cat["filters"], index)
                rating = round(4.4 + ((index * 7) % 6) / 10, 1)
                session.add(
                    Experience(
                        category_id=category.id,
                        title=title,
                        description=(
                            f"A curated {cat['name'].lower()} experience "
                            f"in {location}."
                        ),
                        images=[],
                        location=location,
                        price_tier=price_tier,
                        attributes={**attributes, "rating": rating},
                    )
                )
                total_experiences += 1

        session.commit()
        print(
            f"Seeded {len(CATEGORIES)} categories, "
            f"{total_filters} filters, {total_experiences} experiences."
        )
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed()
