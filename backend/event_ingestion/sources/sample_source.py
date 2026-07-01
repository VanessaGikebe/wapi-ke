"""Curated Kenyan-events source adapter.

A real, self-contained provider that emits well-known recurring Kenyan events on
fixed cadences (monthly day-of-month, or weekly weekday). Each run computes the
NEXT occurrence at/after today, so events roll forward automatically and the
``source_uid`` (``key-YYYYMMDD``) is stable per occurrence — re-running upserts
instead of duplicating.

This is the template every future provider follows: a scraper/API adapter that
turns provider data into ``RawEvent`` objects. Swap the body of ``fetch`` for
real HTTP scraping/API calls and the rest of the pipeline is unchanged.
"""

from __future__ import annotations

import calendar
from datetime import date, datetime, time, timedelta

from event_ingestion.base import EventSource, RawEvent, register
from event_ingestion.parser import EAT, now_eat


def _img(photo_id: str) -> str:
    return (
        f"https://images.unsplash.com/photo-{photo_id}"
        "?auto=format&fit=crop&w=1200&q=70"
    )


# Coordinates per city (approx), for the map on the detail page.
CITY_COORDS: dict[str, tuple[float, float]] = {
    "Nairobi": (-1.2921, 36.8219),
    "Mombasa": (-4.0435, 39.6682),
    "Diani": (-4.3160, 39.5766),
    "Nakuru": (-0.3031, 36.0800),
    "Naivasha": (-0.7167, 36.4310),
    "Kisumu": (-0.0917, 34.7680),
    "Lamu": (-2.2717, 40.9020),
    "Nanyuki": (0.0167, 37.0730),
    "Narok": (-1.0833, 35.8667),
    "Kilifi": (-3.6305, 39.8499),
}

# key, title, category, venue, county, city, organizer, cadence, hour,
# duration_hours, price(KES), photo_id, description
_TEMPLATES: list[dict] = [
    {
        "key": "blankets-and-wine",
        "featured": True,
        "title": "Blankets & Wine",
        "category": "Music",
        "venue": "Lugogo Grounds",
        "county": "Nairobi",
        "city": "Nairobi",
        "organizer": "Blankets & Wine",
        "cadence": ("monthly", 7),
        "hour": 13,
        "duration": 8,
        "price": 3500,
        "photo": "1533174072545-7a4b6ad7a6c3",
        "description": "Kenya's flagship day-time picnic concert — live Afro-fusion bands, food stalls and good company on the lawn.",
    },
    {
        "key": "koroga-festival",
        "featured": True,
        "title": "Koroga Festival",
        "category": "Music",
        "venue": "Two Rivers Lifestyle Mall",
        "county": "Nairobi",
        "city": "Nairobi",
        "organizer": "Capital Group",
        "cadence": ("monthly", 21),
        "hour": 12,
        "duration": 9,
        "price": 4000,
        "photo": "1514525253161-7a46d19cd819",
        "description": "An afternoon-to-night festival of live African music, art and cuisine headlined by continental stars.",
    },
    {
        "key": "thrift-social",
        "title": "The Thrift Social",
        "category": "Lifestyle",
        "venue": "The Alchemist Bar",
        "county": "Nairobi",
        "city": "Nairobi",
        "organizer": "The Alchemist",
        "cadence": ("weekly", 5),  # Saturday
        "hour": 11,
        "duration": 10,
        "price": 200,
        "photo": "1566417713940-fe7c737a9ef2",
        "description": "Westlands' weekend institution — thrift stalls, street food, DJs and craft drinks all afternoon.",
    },
    {
        "key": "nairobi-restaurant-week",
        "title": "Nairobi Restaurant Week",
        "category": "Food",
        "venue": "Participating restaurants",
        "county": "Nairobi",
        "city": "Nairobi",
        "organizer": "EatOut Kenya",
        "cadence": ("monthly", 3),
        "hour": 12,
        "duration": 11,
        "price": 2500,
        "photo": "1517248135467-4c7edcad34c4",
        "description": "Set menus at the city's best kitchens for two weeks — a citywide celebration of Nairobi dining.",
    },
    {
        "key": "safari-sevens",
        "title": "Safari Sevens Rugby",
        "category": "Sports",
        "venue": "RFUEA Ground",
        "county": "Nairobi",
        "city": "Nairobi",
        "organizer": "Kenya Rugby Union",
        "cadence": ("monthly", 14),
        "hour": 9,
        "duration": 10,
        "price": 1000,
        "photo": "1530866495561-507c9faab2ed",
        "description": "Kenya's international rugby sevens tournament — fast rugby, big crowds and a festival atmosphere.",
    },
    {
        "key": "sondeka-festival",
        "title": "Sondeka Festival",
        "category": "Arts",
        "venue": "Ngong Racecourse",
        "county": "Nairobi",
        "city": "Nairobi",
        "organizer": "Sondeka",
        "cadence": ("monthly", 28),
        "hour": 10,
        "duration": 9,
        "price": 1500,
        "photo": "1533929736458-ca588d08c8be",
        "description": "A maker's festival of craft, design, performance and food from Kenyan creatives.",
    },
    {
        "key": "lamu-cultural-festival",
        "featured": True,
        "title": "Lamu Cultural Festival",
        "category": "Culture",
        "venue": "Lamu Old Town",
        "county": "Lamu",
        "city": "Lamu",
        "organizer": "Lamu County",
        "cadence": ("monthly", 18),
        "hour": 9,
        "duration": 12,
        "price": 0,
        "photo": "1611348586804-61bf6c080437",
        "description": "Dhow races, henna, poetry and Swahili heritage across the UNESCO-listed Lamu Old Town.",
    },
    {
        "key": "diani-beach-festival",
        "title": "Diani Beach Festival",
        "category": "Culture",
        "venue": "Diani Beach",
        "county": "Kwale",
        "city": "Diani",
        "organizer": "Diani Tourism",
        "cadence": ("monthly", 11),
        "hour": 14,
        "duration": 9,
        "price": 1500,
        "photo": "1571896349842-33c89424de2d",
        "description": "Live music, water sports and beach parties along Kenya's most celebrated stretch of sand.",
    },
    {
        "key": "naivasha-jazz",
        "title": "Naivasha Jazz Weekend",
        "category": "Music",
        "venue": "Lakeside Gardens",
        "county": "Nakuru",
        "city": "Naivasha",
        "organizer": "Rift Valley Sounds",
        "cadence": ("monthly", 24),
        "hour": 15,
        "duration": 7,
        "price": 3000,
        "photo": "1511192336575-5a79af67a629",
        "description": "Smooth jazz by the lake — an intimate weekend of live sets, wine and Rift Valley sunsets.",
    },
    {
        "key": "mara-marathon",
        "title": "Maasai Mara Marathon",
        "category": "Sports",
        "venue": "Maasai Mara National Reserve",
        "county": "Narok",
        "city": "Narok",
        "organizer": "Mara Conservancy",
        "cadence": ("monthly", 5),
        "hour": 7,
        "duration": 6,
        "price": 2000,
        "photo": "1551632811-561732d1e306",
        "description": "A once-a-year run across the savannah for conservation — wildlife-lined trails and unforgettable views.",
    },
    {
        "key": "kilifi-new-year",
        "title": "Kilifi Beach Sessions",
        "category": "Music",
        "venue": "Distant Relatives Ecolodge",
        "county": "Kilifi",
        "city": "Kilifi",
        "organizer": "Beneath the Baobabs",
        "cadence": ("monthly", 30),
        "hour": 16,
        "duration": 12,
        "price": 4500,
        "photo": "1502680390469-be75c86b636f",
        "description": "Coastal electronic and live music sessions under the baobabs on the Kilifi creek.",
    },
    {
        "key": "nairobi-trade-fair",
        "title": "Nairobi International Trade Fair",
        "category": "Expo",
        "venue": "Jamhuri Park",
        "county": "Nairobi",
        "city": "Nairobi",
        "organizer": "Agricultural Society of Kenya",
        "cadence": ("monthly", 17),
        "hour": 8,
        "duration": 10,
        "price": 500,
        "photo": "1540575467063-178a50c2df87",
        "description": "Agriculture, industry and innovation on show — Kenya's largest annual trade exhibition.",
    },
]


def _next_monthly(day: int, base: date) -> date:
    """Next date with `day`-of-month at/after `base`."""
    year, month = base.year, base.month
    clamped = min(day, calendar.monthrange(year, month)[1])
    candidate = date(year, month, clamped)
    if candidate < base:
        month += 1
        if month > 12:
            month, year = 1, year + 1
        clamped = min(day, calendar.monthrange(year, month)[1])
        candidate = date(year, month, clamped)
    return candidate


def _next_weekly(weekday: int, base: date) -> date:
    return base + timedelta(days=(weekday - base.weekday()) % 7)


class SampleKenyaEvents(EventSource):
    name = "sample_kenya"

    def fetch(self) -> list[RawEvent]:
        today = now_eat().date()
        events: list[RawEvent] = []
        for t in _TEMPLATES:
            kind, arg = t["cadence"]
            occ = _next_monthly(arg, today) if kind == "monthly" else _next_weekly(arg, today)
            start = datetime.combine(occ, time(hour=t["hour"]), tzinfo=EAT)
            end = start + timedelta(hours=t["duration"])
            lat, lng = CITY_COORDS.get(t["city"], (None, None))
            events.append(
                RawEvent(
                    source=self.name,
                    source_uid=f"{t['key']}-{occ:%Y%m%d}",
                    title=t["title"],
                    start_datetime=start,
                    end_datetime=end,
                    description=t["description"],
                    category=t["category"],
                    venue=t["venue"],
                    county=t["county"],
                    city=t["city"],
                    address=f"{t['venue']}, {t['city']}",
                    latitude=lat,
                    longitude=lng,
                    image_url=_img(t["photo"]),
                    organizer=t["organizer"],
                    contact=None,
                    ticket_url="https://www.example.com/tickets",
                    ticket_price=float(t["price"]),
                    currency="KES",
                    featured=t.get("featured", False),
                )
            )
        return events


register(SampleKenyaEvents())
