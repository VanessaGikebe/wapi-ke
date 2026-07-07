# WapiKE — Technical Project Overview

> End-to-end technical documentation of the WapiKE platform, prepared for an academic panel presentation. Every claim below was verified against the actual codebase (backend + frontend), not assumed. Code references are given as `path:function` / `path:line` so any point can be traced to source during defence.

---

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [System Architecture](#2-system-architecture)
3. [Database Schema](#3-database-schema)
4. [Core Functionalities](#4-core-functionalities)
5. [Portal Confinement & Access Control](#5-portal-confinement--access-control)
6. [Personalization & Recommendation Logic](#6-personalization--recommendation-logic)
7. [API Design](#7-api-design)
8. [Notable Design Decisions & Trade-offs](#8-notable-design-decisions--trade-offs)
9. [Anticipated Panel Questions](#9-anticipated-panel-questions)

---

## 1. Project Summary

**WapiKE** is a discovery and booking platform for experiences, businesses, and events in Kenya. It connects three distinct audiences on one backend:

- **Tourists / explorers (consumers)** — browse and discover experiences (restaurants, hikes, nightlife, stays, road-trips, etc.), save favourites, request bookings, read/write reviews, attend events, and get AI-assisted, personalized recommendations.
- **Business owners** — list their business on the platform (new application) or claim an existing catalog listing, then manage their own listings from a dedicated dashboard once approved.
- **Administrators** — review business applications and ownership claims, moderate listings and reports, and manage the lifecycle of live businesses.

### The problem it solves

Experience discovery in Kenya is fragmented across social media, word of mouth, and disconnected listing sites. WapiKE centralises three things that normally live apart:

1. **A curated, filterable catalog** of experiences organised by category, with structured, category-specific filters (a hiking listing filters on difficulty/elevation; a restaurant on cuisine/price).
2. **A verified business layer** — businesses are onboarded through a real review pipeline (application → document upload → admin verification → account provisioning), so listings are backed by an accountable owner rather than anonymous submissions.
3. **An intelligence layer** — a behaviour-driven recommendation engine plus a grounded AI concierge that turns a natural-language request ("somewhere quiet for coffee this morning") into concrete, filtered catalog results.

### Target users at a glance

| User | Enters via | Primary value |
|---|---|---|
| Tourist / explorer | Public site (no login needed to browse) | Discover + personalized recommendations + save/book |
| Business owner | `/business` portal | Get listed/verified + manage listings |
| Administrator | `/admin` portal | Review, verify, moderate, govern |

A defining product principle is **browse-first**: the entire catalog is usable anonymously. Authentication unlocks *personal* features (favourites, bookings, reviews, personalized feed) but is never a wall in front of discovery.

---

## 2. System Architecture

WapiKE is a **decoupled two-tier application** with a third-party identity/storage provider (Supabase) bridged into a self-hosted API.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (one Next.js app)                      │
│                                                                       │
│   Consumer portal        Business portal         Admin portal         │
│   /  /categories         /business/*             /admin/*             │
│   /experiences /events   (dashboard)             (dashboard)          │
│   /assistant /account                                                 │
│                                                                       │
│   React Query (server cache) · Zustand (auth + favourites store)      │
└───────────────┬───────────────────────────────────┬──────────────────┘
                │                                     │
   Supabase JS  │ (auth: login, magic-link,          │ apiFetch (fetch wrapper,
   SDK          │  OAuth, Storage signed uploads)     │ credentials: include,
                ▼                                     │ Bearer <supabase JWT>)
      ┌───────────────────┐                           ▼
      │     SUPABASE      │            ┌──────────────────────────────────┐
      │  Auth (GoTrue)    │            │      FastAPI backend (/api/v1)    │
      │  Storage buckets  │◄───────────┤  Routers → deps (RBAC) → services │
      │  (private docs +  │  service    │  SQLAlchemy ORM                   │
      │   public media)   │  key        └──────────────┬────────────────────┘
      └───────────────────┘  (server)                  │
              ▲                                         ▼
              │ JWKS (verify JWT)              ┌──────────────────┐
              └────────────────────────────────┤   PostgreSQL     │
                                               │  (20 tables)     │
                                               └──────────────────┘
                                     Google Gemini 2.5 Flash ◄── AI assistant
```

### Backend — FastAPI + SQLAlchemy

- **Framework**: FastAPI. The application object is created in `backend/app/main.py:29`; all routers are mounted under a single global prefix **`/api/v1`** (`main.py:41-55`). The only unversioned route is `GET /health` (`main.py:58`).
- **ORM**: SQLAlchemy 2.x declarative models (`backend/app/models/*.py`), sessions from `backend/app/db.py` (`SessionLocal`, `get_db()` dependency). The engine normalises any `postgresql://` / `postgres://` URL to the psycopg-3 driver (`postgresql+psycopg://`).
- **Migrations**: Alembic, `backend/alembic/versions/` — a **linear chain of 9 migrations** (no branches). See §3.
- **Layering**: `api/v1/*` (HTTP routers) → `api/deps.py` (auth + RBAC dependencies) → `services/*` (business logic: recommendations, assistant, verification, supabase_admin) → `models/*` (ORM). Pydantic `schemas/*` define request/response contracts.
- **CORS**: credential-aware (`allow_credentials=True`), origins from `settings.cors_origins_list` plus an optional regex for Vercel preview URLs (`main.py:32-39`).

### Frontend — Next.js 14 (App Router)

- **Stack** (`frontend/package.json`): **Next.js 14.2.35**, React 18.3, TypeScript 5.6, Tailwind CSS 3.4, TanStack **React Query 5** (server-state cache), **Zustand 5** (client stores), Supabase SSR/JS SDK.
- **Layout split**: routes live in `frontend/src/app/**`; shared `lib/**` and `components/**` sit at `frontend/` root and are imported via the `@/` alias.
- **Data flow**: React Query hooks (`lib/queries/**`) call a thin typed API layer (`lib/api/**`), which all funnel through one fetch wrapper `lib/api/client.ts` (`apiFetch`).

### How the two tiers connect

The frontend does **not** talk to its own backend for authentication — it authenticates against **Supabase**, then presents the resulting Supabase JWT to the FastAPI backend:

- `lib/api/client.ts` sends every request with `credentials: "include"` and an `Authorization: Bearer <token>` header, where the token is the in-memory Supabase access token (never localStorage). Base URL: `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"`.
- The backend verifies that JWT against Supabase's JWKS (`api/deps.py:_verify_supabase_token`), then mirrors the Supabase user into its own `users` table so foreign-key features (favourites, bookings, reviews) reference a stable local id. It also retains a **legacy HS256 app-token** path (access + refresh cookie) as a fallback. Full detail in §5.

### Third integration point: Gemini

The AI assistant service (`backend/app/services/assistant.py`) calls **Google Gemini 2.5 Flash** for open-ended queries, but only after an offline FAQ matcher fails to answer confidently (§6.4). Model and temperature are configurable via `settings.gemini_model` / `settings.gemini_temperature`.

---

## 3. Database Schema

PostgreSQL, **20 tables**, all with UUID primary keys (`default=uuid.uuid4`, Python-side) except two natural/composite-PK join tables. Timestamps are timezone-aware. JSONB is used heavily for flexible, schema-light data (filter values, behaviour scores, message logs).

### 3.1 Entity groups

The schema clusters into five domains:

1. **Catalog & discovery** — `categories`, `filter_definitions`, `experiences`, `events`, `reviews`
2. **Consumer activity** — `users`, `favorites`, `bookings`, `assistant_sessions`
3. **Personalization** — `user_preference_profiles`, `user_interactions`
4. **Business onboarding** — `businesses`, `business_applications`, `business_verifications`, `business_documents`, `business_owners`, `business_claims`
5. **Governance** — `admin_roles`, `admin_invitations`, `audit_logs`, `moderation_actions`, `listing_reports`

### 3.2 Key tables

**`categories`** (`models/category.py`) — top-level taxonomy (`slug` unique, `name`, `hero_image`, `icon`). Owns its filter definitions and experiences (`cascade="all, delete-orphan"`).

**`filter_definitions`** (`models/filter_definition.py`) — the heart of the **data-driven filter engine**. Each row defines one filter for one category: `key`, `label`, `type` (enum `filter_type` = `enum` | `range` | `boolean`), and `options` JSONB (`{"values":[…]}` for enums; `{"min","max","step","unit","direction"}` for ranges). Unique on `(category_id, key)`. This is why new categories can gain rich, bespoke filters **without a schema change** — filters are data, not columns.

**`experiences`** (`models/experience.py`) — the core listing. Notable columns:
- `attributes` JSONB — keyed by filter `key`; this is what filters match against and what personalization reads for "vibes".
- `price_tier` (int) — budget signal.
- `lat`/`lng` — geo.
- `status` (enum `listing_status` = `pending` | `approved` | `flagged` | `removed`) — only `approved` is publicly visible.
- `owner_id` → `users` (SET NULL), `business_id` → `businesses` (SET NULL) — links a listing to its business/owner.

**`users`** (`models/user.py`) — `account_type` (enum `account_type` = **`user` | `business` | `admin`**, default `user`), `is_active`, bcrypt `password_hash`. Admin *tier* is deliberately **not** stored here — it lives in `admin_roles` (see governance).

**`user_preference_profiles`** (`models/personalization.py`, natural PK `user_id`) — the personalization state:
- Onboarding answers: `interests`, `categories`, `budget_tiers`, `vibes`, `preferences` (all JSONB).
- `behavior_scores` JSONB — the evolving, behaviour-derived taste model: `{"categories":{slug:float}, "vibes":{name:float}, "budgets":{tier:float}}`.
- `behavior_events_count` (int) — how many interactions fold into the scores; drives the decay of onboarding weights.
- `scores_updated_at`.

**`user_interactions`** (`models/personalization.py`) — the raw behavioural event stream: `interaction_type` (enum, 10 values: `search, view, save, booking, review, dwell, filter, not_interested, directions, share`), `experience_id`, `category_slug`, `weight`, `context` JSONB. Indexed on `user_id` and `experience_id`.

**Business onboarding chain** (`models/business.py`):
- `business_applications` — a **pre-account** submission (a new business has no login yet). Rich status enum (`submitted → pending_verification → verified/verification_failed → pending_approval/more_info_requested → approved/rejected`). Links to a real `Business` only on approval (`business_id` set at approval time).
- `business_verifications` — 1:1 with an application (unique `application_id`), holds provider result (`manual` today; `ecitizen_brs` slot reserved), including a `raw_response` JSONB.
- `business_documents` — uploaded files, attached to **exactly one** parent (application XOR claim, enforced by a DB check constraint `ck_business_documents_one_parent`). Stores the Supabase `bucket` + `storage_path`, never the file bytes.
- `business_claims` — an ownership claim over an existing catalog `experience` (added in migration `e5f6a7b8c9d0`); `business_id` is nullable until approval.
- `business_owners` — many-to-many user↔business with role (`owner` | `manager` | `staff`), unique `(business_id, user_id)`.

**Governance** (`models/admin.py`, `models/moderation.py`):
- `admin_roles` (`AdminRoleAssignment`) — one row per admin, `role` enum (`moderator` | `administrator` | `super_admin`) with a `.rank` (1/2/3). Separated from `users` so admin privilege is a distinct, auditable grant.
- `admin_invitations` — magic-link admin onboarding (SHA-256 `token_hash`, 24h expiry).
- `audit_logs` — immutable privileged-action trail (`actor_user_id`, `action`, `entity_type`, `entity_id`, `data` JSONB). `entity_id` is intentionally an untyped UUID (polymorphic target), not an FK.
- `moderation_actions` / `listing_reports` — listing moderation queue and history.

### 3.3 Why the schema is designed this way

- **UUID PKs everywhere** — safe to expose in URLs and to generate client- or server-side without coordination; avoids leaking row counts.
- **JSONB for `attributes`, `behavior_scores`, `filter_definitions.options`** — the catalog is heterogeneous (a hike and a restaurant share no attribute set). Modelling attributes as columns would force a wide, sparse table or per-category tables; JSONB keeps one `experiences` table while allowing per-category structure, matched at query time against `filter_definitions`.
- **Application/claim separated from `businesses`** — a business exists as a live entity **only after approval**. Keeping the intake (`business_applications`) apart from the live record (`businesses`) means unverified/rejected submissions never pollute the public catalog and the pre-account flow needs no user row.
- **Documents store storage paths, not bytes** — files live in Supabase Storage; the DB holds bucket + path + metadata. This keeps the DB small and delegates large-object handling to purpose-built storage.
- **Admin tier in a side table** — privilege is a grant with provenance (`granted_by`, `granted_at`), not a boolean on the user; supports the invitation flow and audit.

### 3.4 Migration history (dependency order)

| # | Revision | Adds |
|---|---|---|
| 1 | `39497c24ac76` initial_schema | categories, users, assistant_sessions, experiences, filter_definitions, bookings, favorites |
| 2 | `b7f3a9c2d1e4` events_and_admin | events table + `event_status`; `users.is_admin` |
| 3 | `c9d1e2f3a4b5` roles_moderation | `experiences.status`/`owner_id`; moderation_actions, listing_reports; first (experience-based) business_claims |
| 4 | `d4e5f6a7b8c9` account_types_and_business_onboarding | account_type; full business onboarding (businesses, applications, verifications, documents, owners); admin_roles/invitations, audit_logs |
| 5 | `e5f6a7b8c9d0` claims_target_experience | re-targets claims at a catalog `experience`; `business_id` nullable |
| 6 | `f6a7b8c9d0e1` business_status_archived | adds `archived` to `business_status` |
| 7 | `a1b2c3d4e5f6` personalized_discovery | user_preference_profiles, user_interactions |
| 8 | `a2b3c4d5e6f7` behavior_preference_scores | `behavior_scores`, `behavior_events_count`; adds `directions`/`share` interaction types |
| 9 | `b3c4d5e6f7a8` reviews | reviews table (unique per user+experience) |

The chain is itself a narrative of the build: catalog → events/admin → moderation → business onboarding → personalization → reviews.

---

## 4. Core Functionalities

### 4.1 Authentication

Dual-path (detailed in §5). Consumers sign up/in through Supabase (email/password, Google OAuth, magic link). The backend accepts **either** a Supabase-issued JWT (verified via JWKS) **or** a legacy app token, and always resolves to a local `users` row. New signups are always `account_type=user`; **there is no self-service role promotion** anywhere (`auth.py:me` comment; `deps.py`).

### 4.2 Browse-first discovery

The public catalog is fully usable without login.

- **Listing endpoint**: `GET /categories/{slug}/experiences` → `categories.py:list_experiences`. Uses `optional_user` so anonymous and logged-in users get the **same deterministic ordering** (`Experience.title, Experience.id`). Personalization is *not* injected into browse results — it surfaces in a separate feed (§6).
- **Filter engine**: `categories.py:_build_condition` translates each query param that matches a `FilterDefinition.key` into a SQL predicate against the `Experience.attributes` JSONB:
  - `enum` → OR across scalar-equals and array-intersection (supports multi-select).
  - `range` → `>=` or `<=` depending on `options.direction`.
  - `boolean` → `attribute == "true"`.
  Unknown/reserved params (`page`, `limit`, `q`) are ignored; free-text `q` is an escaped ILIKE on title/description.
- **Passive signal capture** (logged-in only): an intentful, filtered browse on page 1 logs a `search` interaction with the *implied filters* (never raw text) and recomputes preference scores (`categories.py:261`). Plain unfiltered browsing logs nothing; anonymous users generate no signal.

### 4.3 Collections / favourites

There is **no separate "collection" entity** — favourites are a flat user↔experience join (`models/favorite.py`, composite PK `(user_id, experience_id)`).

- `POST /favorites/{experience_id}` (idempotent) also writes a `save` interaction (weight 8) and recomputes scores before commit — so favouriting immediately reshapes recommendations.
- `DELETE /favorites/{experience_id}` removes the favourite but does **not** log a negative signal; the prior `save` simply ages out of the decay window.
- The frontend adds a nice touch: a **pending-favourite replay** — a heart tapped while logged out is captured, the user is sent to login, and the favourite is auto-applied on return (`providers.tsx` + `lib/stores/favorites-store.ts`).

### 4.4 Recommendations & personalization

The intelligence layer (full algorithm in §6). In short: onboarding answers seed a taste profile; behaviour (views, saves, bookings, reviews, etc.) is captured as weighted, time-decayed signals that progressively outweigh onboarding; the recommendation endpoint produces **five ranked sections** (Recommended For You, Trending, Hidden Gems, Discover Something New, plus Events), each with its own scoring formula.

### 4.5 AI assistant (concierge)

`POST /assistant/message` (`assistant.py:post_message`), guests allowed, session persisted in `assistant_sessions`.

- **Offline FAQ first** (token-free): `faq_answer` scores the message against a 15-entry FAQ index from `wapike_knowledge.json` using an **IDF + coverage** formula; answers only if confident (score ≥ 1.0).
- **Gemini fallback**: for open-ended queries, `generate_reply` calls Gemini 2.5 Flash in strict JSON mode, grounded in (a) the product knowledge base and (b) the **live** category/filter catalog, returning `{reply, suggested_category_slug, suggested_filters}`.
- **Server validation**: suggested slug/filters are validated against real categories/filter keys before being returned and persisted; the frontend turns them into a deep link to filtered catalog results.

### 4.6 Business management

- **Onboarding (pre-account)**: `POST /applications` (new business) or `POST /claims` (claim an existing listing) — no login required. Documents upload directly to Supabase Storage via backend-minted **signed upload URLs** (`/documents/sign` → `uploadToSignedUrl` → `/documents` record).
- **Admin review**: an admin approves → the backend provisions a Supabase account (`supabase_admin.provision_account`), mints a magic activation link, creates the live `Business` + `BusinessOwner`, sets the user's `account_type=business`, and writes an `AuditLog`.
- **Owner dashboard** (`/business/dashboard`): create listings (start `pending` for admin approval) and edit own listings (`business.py`, guarded so an owner can only touch listings where `owner_id` matches).

### 4.7 Admin controls

Four admin router groups (all under `/admin/*`): listing moderation + reports (`admin.py`), application review (`admin_applications.py`), claim review (`admin_claims.py`), and live-business lifecycle (`admin_businesses.py` — suspend/archive/reopen, ownership history, signed document viewing). Plus admin-only event writes on the otherwise-public `events` router.

### 4.8 Events

A standalone taxonomy (`models/event.py`) with its own status lifecycle (`upcoming/ongoing/ended/archived`), ingestion provenance (`source`, `source_uid` with an idempotency unique constraint), and a daily cron ingestion job (see `render.yaml`). Public reads; admin-only writes.

---

## 5. Portal Confinement & Access Control

WapiKE presents **three portals over one backend**. Confinement is enforced in two layers: **server-side RBAC (authoritative)** and **client-side routing guards (UX only)**.

### 5.1 Server-side — the authoritative layer

All request authentication flows through `get_current_user` (`api/deps.py:129`), which implements a **dual-token bridge**:

1. Try `_verify_supabase_token` first — fetches the signing key by `kid` from Supabase JWKS and verifies the JWT (`algorithms=["ES256","RS256"]`, `audience="authenticated"`). On success the user is resolved/mirrored into the local `users` table by Supabase `sub` UUID (`_resolve_supabase_user`).
2. Otherwise fall back to `_resolve_legacy_user` — a legacy HS256 app access token (15-min access token in the body + 7-day httpOnly refresh cookie scoped to `/api/v1/auth`, rotated on `/auth/refresh`).
3. Finally enforce `is_active` (403 if deactivated).

**Client-sent roles are never trusted.** Even though Supabase user metadata carries `account_type`, authorization reads the authoritative value from the local DB.

Guard dependencies:

| Dependency | Enforces | On failure |
|---|---|---|
| `get_current_user` | any authenticated, active account | 401 / 403 |
| `optional_user` | best-effort (returns `None` for anon) | never raises |
| `get_current_admin` | `account_type == admin` (any tier) | 403 |
| `get_current_business` | `account_type == business` (**admins excluded**) | 403 |
| `require_admin_role(min)` / `require_moderator/administrator/super_admin` | admin tier ≥ threshold | 403 |

Portal separation is by **router-level dependency**:
- **Business portal**: `router = APIRouter(prefix="/business", dependencies=[Depends(get_current_business)])` — the entire surface requires a business account.
- **Admin portal**: all four `/admin/*` routers apply `dependencies=[Depends(get_current_admin)]`.
- **Consumer/public**: no auth, or `get_current_user` for personal data, or `optional_user` for logged reads.

> **Honest limitation to flag to the panel:** the tiered dependencies (`require_moderator/administrator/super_admin`) are **defined but not yet wired to any endpoint**. Today every admin route gates only on `get_current_admin`, so *any* admin tier can perform *every* admin action. The tier model exists in the data + dependency layer; enforcing it per-endpoint is a known next step (§8).

### 5.2 Client-side — UX confinement (not security)

Four cooperating mechanisms, all explicitly UI-only (source comments repeatedly state real authz is server-side):

1. **`src/middleware.ts` + `lib/supabase/middleware.ts`** — refreshes the Supabase session cookie on every non-asset route. It does **no** route gating.
2. **`PortalGuard`** (`components/portal/portal-guard.tsx`, mounted globally) — the load-bearing gate. Its pure `confinementRedirect(pathname, status, accountType)` confines each account type to its portal: `admin` → `/admin/**`, `business` → `/business/dashboard/**`, `user` barred from both; unauthenticated visits to gated portals redirect to the right login. It deliberately renders children (no white-screen) while `account_type` is still resolving.
3. **`RoleGate`** (`components/auth/role-gate.tsx`) — per-page content gate (used by the business dashboard): Loading → "please sign in" → "checking access" → "access restricted" → content.
4. **`PortalShell`** (`components/portal/portal-shell.tsx`) — the admin portal's dedicated chrome (sidebar), applied via `admin/dashboard/layout.tsx`, which renders "Loading…" until the account type matches so admin UI never flashes for the wrong user.

**Asymmetry worth noting:** the admin dashboard has a full separate shell (`PortalShell`); the business dashboard reuses public chrome and is double-gated by `PortalGuard` + `RoleGate`. So "admin portal" is a truly separate shell, while "business portal" is public-chrome pages under guards.

---

## 6. Personalization & Recommendation Logic

This is the analytical core. It has three moving parts: **signal capture**, **score maintenance** (write path), and **ranking** (read path). All numeric weights below are the real constants in `services/recommendations.py` and `api/v1/personalization.py`.

### 6.1 Signals and their weights

Every meaningful action becomes a `UserInteraction` with a **server-fixed weight** (`recommendations.py:TYPE_WEIGHTS`) — fixed server-side so a client can't inflate its own influence:

| Signal | Weight | Where captured |
|---|---|---|
| `view` | 1.0 | experience detail view (authed) |
| `search` / `filter` | 1.0 | intentful filtered browse, page 1 |
| `dwell` | 2.0 | client-reported |
| `share` | 5.0 | client-reported |
| `directions` | 6.0 | client-reported |
| `save` (favourite) | 8.0 | add favourite |
| `review` | 9.0 | write review |
| `booking` | 12.0 | create booking |

`not_interested` is captured too, but used as a **negative** signal (see ranking).

### 6.2 Score maintenance (write path) — `update_preference_scores`

Recomputation is **synchronous and on-write** — no background jobs. When a signal lands, the service recomputes the user's `behavior_scores` over a bounded recent window:

- Window: last **180 days**, newest first, capped at **250 interactions**, excluding `not_interested`.
- Per interaction, a **recency-decayed signal** is computed:

  ```
  age_days  = (now - created_at) / 86400
  recency   = 0.985 ^ age_days          # DECAY_PER_DAY; ~half-life ≈ 45 days
  signal    = TYPE_WEIGHTS[type] * recency

  categories[slug]        += signal
  budgets[price_tier]     += signal * 0.5     # BUDGET_SIGNAL (damped)
  vibes[attribute_value]  += signal * 0.25    # VIBE_SIGNAL   (damped, max 6 vibes/exp)
  ```

- Scores below `0.05` are pruned; results rounded to 4 dp; `behavior_events_count` = interactions in window.

The elegant consequence: **categories a user stops engaging with fade automatically** as old signals age out — the model is self-cleaning without an explicit "forget" step. Budget and vibe are damped (×0.5, ×0.25) because they are weaker, secondary preference channels than category.

### 6.3 Ranking (read path) — `GET /personalization/recommendations`

The endpoint builds one shared context, then emits five sections. First it assembles a **blended taste profile** (`_taste_profile`) from four sources:

- **A. Onboarding answers, decayed** — base weights category 6 / interest 5 / vibe 4 / budget 4, multiplied by `_onboarding_factor = max(0.15, 1/(1 + events/30))`. So onboarding starts at ×1.0, is ×0.5 at 30 events, ×0.25 at 90, flooring at 0.15. **This is the "behaviour gradually outweighs onboarding" mechanism.**
- **B. Behaviour scores** — folded in directly (already decayed at write time).
- **C. Saved & booked experiences** — strong explicit signal: category +8, budget +4, attributes → interest +4 / vibe +2.
- **D. Last 100 raw interactions** — each adds its weight to the matching category/budget/attributes.

`not_interested` interactions become `disliked_experience_ids` (excluded) and `disliked_categories` (penalised).

Each section scores its candidate pool (approved experiences, capped at 80, excluding disliked and already-used ids) with a **mode-specific formula**:

```
personal  = _personal_score(exp, context)   # category + budget + location + interest/vibe affinity
cold_start= 6 if interaction_count < 5 else 0
timely    = 0..10 time-of-day/weekend context boost
penalty   = disliked_categories[slug] * 4

Recommended For You :  personal*2 + popularity + rating + timely + cold_start − penalty
Trending            :  popularity*2 + personal + rating + timely + cold_start − penalty
Hidden Gems         :  personal + rating*2 + timely − min(popularity,10) − penalty
Discover New        :  outside_preference(14 if category unknown to you) + rating*2
                        + popularity*0.4 + timely − personal*0.25 − penalty
```

Sections are computed in order and reserve their chosen ids, so the four rows are **mutually disjoint** (Recommended picks first, then Trending, Hidden, Discovery). This gives a varied home feed rather than the same items repeated across rows.

- **Time context** (`_time_context_score`): morning + cafés → 10; midday + restaurants → 9; evening + nightlife → 9; weekend + outdoor → 8.
- **Confidence** (`_confidence_for`): normalised to a 72–98 band, but suppressed to `null` unless it clears **85** and the user has ≥3 interactions — so the UI only shows a confidence badge when the system is genuinely sure.
- **Events section** scores on interest-word overlap in title/description + category affinity + seasonal (Apr/Aug/Dec) + weekend + local-county boosts.

### 6.4 The AI assistant's intelligence

Two-stage, cost-aware:

1. **Offline FAQ (tried first)** — `faq_answer` tokenises the message (lowercase words ≥3 chars, minus stopwords) and scores each FAQ entry with `Σ(1/df[token]) + shared/total` — an **IDF-weighted overlap plus coverage** measure, so rare/discriminating words dominate. Answers only if best score ≥ 1.0. This means common one-word messages fall through to Gemini, but real platform questions ("how do I list my business") are answered instantly, for free, offline.
2. **Gemini fallback** — `generate_reply` calls Gemini 2.5 Flash in strict JSON-schema mode, temperature configurable, grounded in the product KB **and** the live category/filter catalog so any suggested slug/filter is real. Output `{reply, suggested_category_slug, suggested_filters}` is validated server-side against actual categories and filter keys before it reaches the client.

The design point: **the assistant does not just chat — it converts intent into a filtered catalog query**, deep-linking the user straight to matching experiences.

---

## 7. API Design

All endpoints under `/api/v1`. Auth legend: **public** (none) · **user** (`get_current_user`) · **user?** (`optional_user`) · **business** · **admin**.

### 7.1 Consumer / public

| Method · Path | Auth | Purpose |
|---|---|---|
| `POST /auth/signup` · `/login` · `/google` · `/refresh` · `/logout` | public | Account + session lifecycle |
| `GET /auth/me` | user | Current user + account type |
| `GET /categories` · `/categories/{slug}` · `/categories/{slug}/filters` | public | Taxonomy + filter schema |
| `GET /categories/search` | public | Cross-category quick search |
| `GET /categories/{slug}/experiences` | user? | **Browse-first** filtered, paginated listings (logs intentful browses if authed) |
| `GET /experiences/featured` · `/experiences/{id}` | public / user? | Featured + detail (logs `view` if authed) |
| `GET /experiences/{id}/reviews` · `POST …/reviews` | public / user | Read / write reviews |
| `POST /experiences/{id}/report` | user | Flag a listing to moderation |
| `GET /events` · `/events/upcoming` · `/events/featured` · `/events/{slug}` | public | Events |
| `GET/POST/DELETE /favorites…` | user | Collections |
| `POST /bookings` · `GET /bookings` | user | Booking requests (no payment in v1) |
| `GET/PUT /personalization/profile` | user | Onboarding preferences |
| `POST /personalization/interactions` | user | Log a behaviour signal (weight server-clamped) |
| `GET /personalization/recommendations` | user | Five-section personalized feed |
| `POST /assistant/message` | public | AI concierge turn |

**Business intake (public, pre-account):**

| Method · Path | Purpose |
|---|---|
| `POST /applications` | Submit new-business application (runs verification) |
| `POST /applications/{id}/documents/sign` · `/documents` | Mint signed upload URL · record uploaded doc |
| `GET /applications/{id}` | Public status echo ("track my application") |
| `GET /claims/search` · `POST /claims` | Find a listing · submit ownership claim |
| `POST /claims/{id}/documents/sign` · `/documents` · `GET /claims/{id}` | Proof upload + status |

### 7.2 Business portal (`account_type == business`)

| Method · Path | Purpose |
|---|---|
| `POST /business/listings` | Create listing (starts `pending`) |
| `GET /business/listings` | Own listings |
| `PATCH /business/listings/{id}` | Edit own listing (403 if not owner) |

### 7.3 Admin portal (`account_type == admin`)

| Method · Path | Purpose |
|---|---|
| `GET/PATCH /admin/listings…` | Moderate listings (approve/flag/remove/restore) → `ModerationAction` |
| `GET/PATCH /admin/reports…` · `GET /admin/audit` | Reports queue + audit trail |
| `GET /admin/applications…` · `PATCH /admin/applications/{id}` | Review + approve/reject/request-info (approval provisions account, creates business) |
| `GET …/documents/{id}/url` | Short-lived signed URL to view a private doc |
| `GET /admin/claims…` · `PATCH /admin/claims/{id}` | Review ownership claims |
| `GET/PATCH /admin/businesses…` | Live-business lifecycle (suspend/archive/reopen), documents, ownership history |
| `POST/PATCH/DELETE /events…` | Admin-only event writes |

### 7.4 Request/response patterns

- **Contracts**: Pydantic schemas (`schemas/*`) validate every request body and shape every response; FastAPI auto-generates OpenAPI docs.
- **Errors**: consistent HTTP semantics — `401` (no/invalid token), `403` (wrong role / deactivated), `404` (missing), `409` (already decided / duplicate), `503` (dependency unconfigured, e.g. uploads or Gemini). The frontend `apiFetch` parses FastAPI `detail` (string or validation array) into user-facing messages.
- **Auth transport**: Bearer access token (header) + httpOnly refresh cookie (`credentials: include`).
- **Idempotency & safety**: favourites are idempotent; claims 409 on duplicate pending; uploaded document paths must be namespaced under their application/claim id (defends against arbitrary path injection on the unauthenticated intake surface).

---

## 8. Notable Design Decisions & Trade-offs

Points to be ready to defend, each with the reasoning and the honest limitation.

**1. Why FastAPI?**
Async Python with first-class Pydantic validation and auto-generated OpenAPI docs; type hints double as the request/response contract. It keeps the API thin and self-documenting, and pairs naturally with SQLAlchemy. Trade-off: Python throughput is lower than Go/Node under heavy concurrency, but the workload here is I/O-bound (DB + Supabase + Gemini), where async FastAPI is well-suited.

**2. Why a Supabase + self-hosted FastAPI hybrid (not all-Supabase)?**
Supabase gives production-grade **auth** (OAuth, magic links, JWT/JWKS) and **object storage** for free — building those securely is expensive and risky. But the domain logic (recommendation scoring, business verification workflow, moderation) is bespoke and belongs in owned code. So identity/storage is delegated; business logic and data are self-hosted. The bridge is the JWKS-verified JWT + a mirrored local `users` row. Trade-off: two systems to reason about, and a legacy token path retained for flexibility adds surface area.

**3. Why JSONB `attributes` + data-driven `filter_definitions` (not per-category columns/tables)?**
The catalog is heterogeneous; each category needs different filters. Encoding filters as **data** means adding a category or a filter is an insert, not a migration + code change. Trade-off: JSONB predicates are less index-friendly than typed columns and validation of attribute values lives in application logic, not the DB.

**4. Why synchronous, on-write recomputation of preference scores (no ML pipeline / background jobs)?**
Recommendations must feel immediate (favourite something → the feed reflects it now) and the platform is early-stage, so operational simplicity beats a training pipeline. A bounded window (180 days / 250 events) with exponential recency decay approximates "recent taste" cheaply and is self-cleaning. Trade-off: recompute cost rides on the request that triggered it; at large scale this should move to a queue/materialised store.

**5. Why a heuristic, formula-based recommender (not collaborative filtering / embeddings)?**
It is **explainable** (each item carries a human `reason`), needs **no training data or cold-start corpus**, and can express product intent directly (Hidden Gems deliberately down-weights popularity; Discover deliberately rewards categories outside your profile). For an academic defence, every number is traceable. Trade-off: it won't discover latent cross-user patterns the way matrix factorisation would; it's a strong, honest baseline designed to be swapped later.

**6. Why FAQ-first, Gemini-second for the assistant?**
Most support questions are answerable from a small KB; running them through an LLM wastes tokens and latency and risks hallucination. The IDF-coverage matcher answers those offline and free; Gemini handles genuinely open-ended discovery, grounded in the real catalog and constrained to JSON. Trade-off: the FAQ threshold (≥1.0) is a tuned constant; too high sends easy questions to Gemini, too low gives canned answers to nuanced ones.

**7. Why separate application/claim intake from live businesses, fully unauthenticated?**
A prospective business has no account yet; forcing signup before submission adds friction and creates orphan accounts for rejected businesses. Intake is therefore public, and a real account is provisioned only on approval. Trade-off: the intake endpoints (including signed-URL minting) are unauthenticated — protected by resource-state checks and storage-path namespacing rather than identity, so anyone with an id can read its public status or attach docs to an *undecided* submission.

**8. Known limitations (state these proactively):**
- **Admin tiers not enforced per-endpoint** — `moderator/administrator/super_admin` exist in data and dependencies but every admin route currently uses flat `get_current_admin`.
- **Read-path taste double-count** — in `_taste_profile`, a viewed experience's category is counted twice (via `category_slug` and the experience's own category); the service write-path avoids this, but the legacy read-path counter inflates it slightly.
- **Bookings are a stub** — status lifecycle only, no payment.
- **Client guards are UX-only** — confinement is real only on the server; the frontend guards prevent wrong-portal chrome, not data access.
- **Recommendation recompute is request-coupled** — fine now, needs decoupling at scale.

---

## 9. Anticipated Panel Questions

**Q1. How does a user's request to the frontend actually get authenticated on the backend?**
The browser authenticates with Supabase and receives a JWT. Every API call carries it as a Bearer token. The backend's `get_current_user` verifies it against Supabase's JWKS (ES256/RS256, audience `authenticated`), then mirrors/loads a local `users` row keyed by the Supabase `sub`. A legacy HS256 app-token path exists as fallback. Authorization always reads the role from the local DB — client-supplied roles are never trusted.

**Q2. If the frontend guards are "UX only", is the app secure?**
Yes — security is enforced server-side. Business routes require `get_current_business`, admin routes require `get_current_admin`, and personal data requires `get_current_user`. The client `PortalGuard`/`RoleGate`/`PortalShell` only route users to the correct portal and avoid flashing the wrong chrome; bypassing them still hits an API that rejects the request.

**Q3. Walk us through the recommendation algorithm.**
Signals (view=1 … booking=12) are logged with server-fixed weights. On each write we recompute `behavior_scores` over a 180-day/250-event window with exponential recency decay (0.985^days, ~45-day half-life), damping budget ×0.5 and vibe ×0.25. At read time we blend decayed onboarding answers, behaviour scores, saved/booked boosts, and recent interactions into a taste profile, then score candidates with per-section formulas (Recommended weights personal affinity; Trending weights popularity; Hidden Gems rewards quality and suppresses popularity; Discover rewards unknown categories). Sections reserve their picks so rows don't repeat.

**Q4. Why not use machine learning / collaborative filtering?**
Three reasons: explainability (every recommendation carries a reason), no cold-start/training-data requirement, and direct encoding of product intent. It's a deliberate, defensible baseline. The architecture — signals in `user_interactions`, scores in `behavior_scores` — is exactly the feature store an ML model would later consume, so the upgrade path is clean.

**Q5. How do you keep the recommendations fresh / stop them going stale?**
Recency decay: old signals lose weight exponentially and are pruned below 0.05, so categories a user abandons fade automatically without an explicit forget step. Onboarding answers also decay as behaviour accumulates (×1.0 → floor 0.15), so the system shifts from stated to revealed preference over time.

**Q6. How does the AI assistant avoid hallucinating platform features or fake categories?**
Two guards. It answers common questions from a fixed FAQ (no LLM). For open questions, Gemini runs in strict JSON-schema mode, grounded in the product knowledge base and the *live* category/filter catalog; and the backend validates any suggested category slug / filter keys against the real database before returning them — invalid suggestions are dropped.

**Q7. Why is the business onboarding split into applications, verifications, documents, and a separate businesses table?**
A business is a live catalog entity only after human verification. Keeping intake (`business_applications`) separate from the live `businesses` record means unverified/rejected submissions never reach the public catalog, the pre-account flow needs no user row, and the verification result + raw provider payload are auditable. The live account (Supabase auth + `Business` + `BusinessOwner` + `account_type=business`) is created atomically on approval, with an `AuditLog` entry.

**Q8. Applicants upload sensitive documents (IDs, certificates) without an account — how is that safe?**
Files never pass through the API. The backend mints a **signed upload URL** (Supabase service key, server-side only) scoped to a path namespaced under the application/claim id; the browser uploads directly to a **private** Storage bucket; the backend records only bucket+path. Admins later read them through short-lived signed *download* URLs. The upload endpoints validate that recorded paths start with the correct id prefix. (Trade-off acknowledged in §8: intake is identity-less, protected by state + path checks.)

**Q9. Why UUID primary keys and so much JSONB?**
UUIDs are URL-safe, non-enumerable, and collision-free without coordination. JSONB models genuinely heterogeneous data — experience attributes and per-category filters differ by category, and behaviour scores are a nested map — without a wide sparse table or many per-category tables. Structured, relational data (users, businesses, bookings) stays in typed columns with real foreign keys and constraints.

**Q10. What would you improve or do next?**
Enforce the admin tier system per-endpoint (it's modelled but not gated); decouple score recomputation into a background worker/materialised store for scale; fix the read-path category double-count; add payment to bookings; and, once enough interaction data exists, train a collaborative-filtering/embedding model on the `user_interactions` store as an A/B alternative to the heuristic ranker.

**Q11. How is the system deployed?**
FastAPI + PostgreSQL + a daily events-ingestion cron on Render (`render.yaml`); the Next.js frontend on Vercel; Supabase for auth and storage. Environment-specific secrets (DB URL, Supabase service key, Gemini key, CORS origins) are injected per environment, not committed.

---

*Prepared from direct source analysis of `backend/` (FastAPI/SQLAlchemy, ~7.3k LOC, 20 tables, 9 migrations) and `frontend/` (Next.js 14 App Router). All formulas, weights, enum values, and endpoint signatures reflect the code as implemented.*
