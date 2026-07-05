# Database (Supabase / PostgreSQL)

Normalized schema, UUID PKs, FKs, indexes, `created_at`/`updated_at`. Defined in
`supabase/migrations/`.

## Tables
| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | user profile (1:1 `auth.users`) | id (FK auth.users), full_name, username (unique), avatar_url, email, onboarding_completed |
| `user_preferences` | per-user prefs | user_id (PK/FK), favorite_categories[], home_county, email_notifications |
| `counties` | Kenyan counties | id, name (unique), code |
| `cities` | cities → county | id, name, county_id → counties |
| `categories` | taxonomy | id, slug (unique), name, icon, hero_image |
| `tags` | free tags | id, slug (unique), name |
| `businesses` | operator/owner | id, name, website, phone, email |
| `places` | restaurants/experiences/picnics/nightlife/activities/travel | id, slug, name, category_id, business_id, city_id, county_id, lat/long, rating, price_tier, image_url, attributes(jsonb), source+source_uid (unique) |
| `place_images` | gallery | id, place_id → places, url, position |
| `place_tags` | m:n place↔tag | (place_id, tag_id) |
| `events` | what's on | id, slug, title, category, venue, county/city, start/end_datetime, status(enum), featured, ticket_*, source+source_uid (unique) |
| `favorites` | user ♥ place | id, user_id, place_id, unique(user_id, place_id) |
| `saved_events` | user ♥ event | id, user_id, event_id, unique(user_id, event_id) |
| `reviews` | user reviews place | id, user_id, place_id, rating(1–5), body, unique(user_id, place_id) |
| `recently_viewed` | history | id, user_id, place_id?/event_id?, viewed_at |

Enum: `event_status` = upcoming | ongoing | ended | archived.

## Row Level Security (`0002_rls.sql`)
- **Public read:** counties, cities, categories, tags, businesses, places,
  place_images, place_tags, events, profiles, reviews.
- **No public writes** to content tables — writes go through the service-role
  key (import script / admin), which bypasses RLS.
- **Owner-only:** favorites, saved_events, recently_viewed, user_preferences
  (`auth.uid() = user_id`).
- **profiles:** anyone can read; only the owner can insert/update (`auth.uid() = id`).
- **reviews:** anyone can read; only the owner can insert/update/delete.

## Auto profile creation (`0003_profile_trigger.sql`)
`handle_new_user()` (SECURITY DEFINER) fires on `auth.users` insert (email OR
Google), creating a `profiles` row (full_name/avatar from metadata) and a
`user_preferences` row. Also backfills any pre-existing users.

## Import
`backend/scripts/export_to_supabase.py` reads the already-normalized local
Postgres (categories, experiences→places, events) and upserts to Supabase via
PostgREST. Idempotent (upsert on `slug` / `source,source_uid`). Regenerate TS
types with `supabase gen types typescript` → `frontend/lib/supabase/types.ts`.
