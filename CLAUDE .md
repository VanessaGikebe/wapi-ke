# Wapike — Project Context

This file is persistent context for Claude Code / Antigravity. Read it fully before generating any code. Re-check it whenever a prompt references "the design system," "the filter schema," or "the data model" — those are defined here, not in chat.

## 1. What This Is

Wapike is a premium tourism and experience discovery platform. Users land on a homepage with two entry points — **Browse Categories** or **Use the AI Assistant** — and end up at curated experience listings (restaurants, hiking, nightlife, staycations, etc.) that they can filter, favorite, and book. Favoriting or booking gates the user into login/signup.

## 2. Stack

**Frontend** — Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui (heavily restyled, not default theme), TanStack Query for data fetching, Zustand for lightweight global state (session, assistant chat state).

**Backend** — FastAPI (Python 3.11+), SQLAlchemy 2.0 + Alembic, PostgreSQL, Pydantic v2 schemas, JWT auth (short-lived access token in response body, refresh token in an httpOnly cookie).

**AI Assistant** — Anthropic Claude API called server-side from a dedicated FastAPI router. Conversation state persisted per session in Postgres, not just in memory.

**Repo layout** (monorepo, matches the existing `wapi-ke` repo):

```
wapi-ke/
  frontend/        # Next.js app
  backend/         # FastAPI app
```

## 3. Design Source of Truth

Stitch exports already exist under `Frontend/stitch_wapike_experienc.../`, one folder per surface:

| Folder | Maps to |
|---|---|
| wapike_home | Landing page (Browse vs AI Assistant split) |
| wapike_ai_assistant | Chat UI |
| wapike_restaurants | Restaurants listing + filters |
| wapike_caf_s | Cafés listing + filters |
| wapike_cultural_experiences | Cultural Experiences listing + filters |
| wapike_family_activities | Family Activities listing + filters |
| wapike_hiking_outdoors | Hiking listing + filters |
| wapike_nightlife | Nightlife listing + filters |
| wapike_outdoor_adventures | Outdoor Adventures listing + filters |
| wapike_picnics | Picnics listing + filters |
| wapike_road_trips | Road Trips listing + filters |
| wapike_staycations | Staycations listing + filters |
| high_quality_professional_photog... | Reference/placeholder imagery |

**Rule:** before building any page, open the matching Stitch export folder and pull layout, spacing, type scale, and card/component shapes from it. Recreate the visual language in Tailwind. Treat the Stitch HTML as a styled wireframe, not a copy-paste target — it's a different stack and will need real component architecture, not raw markup.

## 4. Aesthetic Direction

Minimalist, premium. Dark-leaning neutral palette, generous whitespace, confident large typography, restrained motion (no gimmicky animation), photography-led cards. Avoid default SaaS-blue shadcn styling, avoid loud gradients.

## 5. Core User Flow

1. Landing page → **Browse Categories** or **AI Assistant**.
2. Browse path → category grid → select category → listing page with experience cards on the main panel and a filter sidebar; filters update results without a full page reload.
3. AI Assistant path → conversational flow (mood, occasion, group size, budget, location, interests) → assistant recommends a category and specific experiences within it, landing the user on the same listing template as the browse path.
4. Heart (favorite) or Book on any experience → if not authenticated, redirect to `/login?redirect={currentPath}`. After auth, return to the original action.

## 6. Categories & Filters

| Category | Filters |
|---|---|
| Restaurants | Cuisine, price range, dining style (fine dining/casual/rooftop/buffet), dietary preference, indoor/outdoor seating, romantic vs family-friendly |
| Hiking | Difficulty (beginner/intermediate/advanced), solo or group, duration, distance, waterfalls, camping availability, pet-friendly |
| Picnics | Scenic location, lakeside or park, picnic setup availability, BBQ facilities, family-friendly, couples' experiences, accessibility |
| Nightlife | Clubs, lounges, live music, karaoke, rooftop bars, DJ events, cocktails, age restriction, dress code |
| Outdoor Adventures | Ziplining, ATV riding, horse riding, kayaking, cycling, rock climbing, paintball, quad biking |
| Staycations | Hotels, cabins, Airbnbs, luxury resorts, spa packages, swimming pools, mountain or lakeside views |
| Cafés | Specialty coffee, brunch, desserts, work-friendly, outdoor seating, aesthetic |
| Cultural Experiences | Museums, art galleries, historical sites, cultural villages, local markets, festivals |
| Road Trips | Scenic routes, viewpoints, nearby attractions, camping spots, fuel stops |
| Family Activities | Children's parks, amusement parks, educational attractions, animal parks, indoor play areas |

These must be **data-driven**, not hardcoded per category. Each category has a `FilterDefinition[]` fetched from the backend; the frontend renders one generic filter component from that schema.

## 7. Data Model (high level)

- **User** — id, email, password_hash, name, created_at
- **Category** — id, slug, name, hero_image, icon
- **FilterDefinition** — id, category_id, key, label, type (`enum` | `range` | `boolean`), options (JSONB)
- **Experience** — id, category_id, title, description, images (JSONB array), location, lat, lng, price_tier, attributes (JSONB — keyed by filter `key`)
- **Favorite** — user_id, experience_id, created_at
- **Booking** — user_id, experience_id, status, requested_date (stub for v1 — no payment processing yet)
- **AssistantSession** — id, user_id (nullable for guests), messages (JSONB), inferred_category_id, inferred_filters (JSONB)

## 8. API Conventions

REST, versioned under `/api/v1`.

- `POST /api/v1/auth/signup`, `/login`, `/refresh`, `/logout`
- `GET /api/v1/categories`, `GET /api/v1/categories/{slug}`
- `GET /api/v1/categories/{slug}/filters`
- `GET /api/v1/categories/{slug}/experiences?{filter_key}={value}&page=&limit=` — server-side filtering and pagination
- `POST /api/v1/favorites/{experience_id}`, `DELETE /api/v1/favorites/{experience_id}` — 401 if unauthenticated; frontend handles the redirect
- `POST /api/v1/assistant/message` — body `{session_id, message}`, returns `{reply, suggested_category?, suggested_filters?}`

## 9. Frontend Conventions

- App Router route groups: `(marketing)/page.tsx` for landing, `(categories)/categories/[slug]/page.tsx` for listings, `(auth)/login`, `(auth)/signup`
- One generic `<CategoryListing categorySlug={slug} />` template parameterized by the category's filter schema — no per-category page duplication
- Server components fetch initial category/experience data for SEO; filter interactivity is client-side, calling the API on change
- Auth state in a Zustand store; any favorite/book action checks it before calling the API

## 10. Non-negotiables

- Mobile-first responsive at every breakpoint
- Filters never trigger a full page reload
- Zero category-specific component duplication — one template, driven by config
- Keyboard-navigable filters, alt text on all imagery
