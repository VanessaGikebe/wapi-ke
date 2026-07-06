# WapiKE — System Handover

_Last updated: 2026-07-06. This is a snapshot of what actually exists in the codebase (read from source), not the aspirational spec. Where the older docs disagree with the code, this document reflects the code._

---

## 1. What WapiKE is

A premium **tourism & experience-discovery platform for Kenya**. Consumers land on a homepage, either **browse categories** (restaurants, hiking, nightlife, staycations, cafés, cultural experiences, family activities, outdoor adventures, picnics, road trips) or **chat with an AI assistant**, and end up on curated, filterable experience listings they can favorite and book. There's also an **events** ("what's on") section.

On top of the consumer product there are two more audiences, each in its own **portal**:

- **Businesses** — operators list or claim their business, get a ✔ Verified badge, and manage their listings from a dashboard.
- **Admins** — a back-office to verify businesses, moderate listings, handle reports, and manage events.

These are **three separate portals sharing one backend**, kept apart by account type (see §4).

---

## 2. Architecture at a glance

```
┌─────────────────────┐     Supabase JWT (Bearer)      ┌──────────────────────┐
│  Next.js frontend    │ ─────────────────────────────▶ │  FastAPI backend      │
│  (Vercel)            │     credentials: include        │  (Render web service) │
│                     │                                  │                       │
│  - Supabase JS       │ ◀───────────────────────────── │  - SQLAlchemy 2.0     │
│    (auth session)    │        JSON responses           │  - own Postgres DB    │
└──────────┬──────────┘                                  └──────────┬───────────┘
           │                                                        │
           │ auth (OAuth, email/pw, sessions)                       │ verify JWT via JWKS
           ▼                                                        │ mint magic links
┌─────────────────────┐                                            │ signed Storage URLs
│  Supabase            │ ◀──────────────────────────────────────────┘
│  - Auth (GoTrue)     │
│  - Postgres (auth +  │       Google Gemini 2.5 Flash ◀──── assistant router (server-side)
│    parallel schema)  │
│  - Storage (buckets) │       Render cron (daily) ────▶ event ingestion
└─────────────────────┘
```

**Stack**

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind (Material-style design tokens), TanStack Query, Zustand, `@supabase/supabase-js` + `@supabase/ssr` |
| Backend | FastAPI (Python 3.12/3.13), SQLAlchemy 2.0, Alembic, Pydantic v2, psycopg 3 |
| Auth | **Supabase Auth** (Google OAuth + email/password). Backend bridges Supabase JWTs. |
| AI Assistant | **Google Gemini 2.5 Flash** (server-side, JSON mode) |
| Storage | Supabase Storage — private `business-documents`, public `business-media` |
| Hosting | Vercel (frontend), Render (API + Postgres + cron), Supabase (auth/db/storage) |

> ⚠️ **Doc drift to know about:** the older `CLAUDE .md` and `README.md` predate most of this. `README.md` still says "tooling scaffold only" (false — there's a full app). `CLAUDE .md` says the assistant is Anthropic Claude; the implemented assistant is **Google Gemini** (`backend/app/services/assistant.py`). `AUTHENTICATION.md`, `DATABASE.md`, `DEPLOYMENT.md`, `MIGRATION_NOTES.md` are accurate and current.

---

## 3. The two-database reality (important)

There are **two Postgres databases by design**, and this trips people up:

1. **Render Postgres — the API's own DB.** Everything the FastAPI app reads/writes lives here (users mirror, experiences, events, favorites, bookings, businesses, applications, claims, moderation, audit). Schema is managed by **Alembic** (`backend/alembic/versions/`).
2. **Supabase Postgres — auth + a parallel schema.** Holds `auth.users` and profiles, and a *separate* normalized content schema (`supabase/migrations/0001…0005`) that was built for a **future cutover** where the app would read content directly from Supabase (with RLS). **That cutover has not happened.** Today, content is served by FastAPI/Render; Supabase is used for auth and file storage only.

Both schemas define an `events` table — that's why they're kept apart. See `DEPLOYMENT.md` "Two databases by design" and `MIGRATION_NOTES.md` "data-layer cutover" for the intended endgame (retire Render, run on Vercel + Supabase).

---

## 4. Identity, accounts, and portal confinement

### Account types (`backend/app/models/user.py`)
Exactly three, **never self-service** — assigned only by the correct flow:

- `user` — regular explorer (default for public signup).
- `business` — created **only** when an admin approves a business application or claim.
- `admin` — created **only** by a super-admin invite or the seed/bootstrap CLI. The admin *tier* lives in a separate table.

### Admin tiers (`backend/app/models/admin.py`)
`moderator (1) < administrator (2) < super_admin (3)`, stored in `admin_roles` (`AdminRoleAssignment`). Guards can require a minimum tier (`require_admin_role` in `deps.py`). Invitations (`admin_invitations`) carry a hashed one-time token.

### How auth works end-to-end
- **Frontend** authenticates against **Supabase** directly (`lib/stores/auth-store.ts`): email/password, Google OAuth, signup w/ email verification, password reset. Supabase persists + auto-refreshes the session (cookie-based, refreshed by `src/middleware.ts` on every navigation).
- The store pushes the Supabase **access token** into the API client (`lib/api/client.ts`) as a `Bearer` header (kept in memory only — never localStorage).
- **Backend** (`backend/app/api/deps.py`) verifies that token against the Supabase **JWKS**, and **mirrors** the Supabase user into the local `users` table (keyed by the Supabase user id) so FK-based features keep working. It also still accepts **legacy app-issued JWTs** as a fallback (the old `/api/v1/auth/*` endpoints — signup/login/refresh/google — still exist but the UI no longer uses them).
- Account type + admin tier come from `GET /api/v1/auth/me`; the store caches them and `PortalGuard` enforces confinement client-side.

### Portal confinement (`frontend/components/portal/portal-guard.tsx`)
Mounted globally in `providers.tsx`. Once the account type resolves:
- `admin` → confined to `/admin/**` (else redirected to `/admin/dashboard`)
- `business` → confined to `/business/dashboard/**`
- `user`/anon → public site (+ the public business-onboarding pages)

This is UX only; **data access is independently enforced server-side** by the API's RBAC dependencies.

---

## 5. Consumer product (the public site)

### Key pages (`frontend/src/app/`)
- `(marketing)/page.tsx` — landing (Browse vs AI Assistant).
- `(categories)/categories/page.tsx` — category grid; `.../categories/[slug]/page.tsx` — the generic listing page (cards + data-driven filter sidebar).
- `assistant/page.tsx` — AI concierge chat.
- `experiences/[id]/page.tsx` — experience detail (with favorite/book/report).
- `events/page.tsx` + `events/[slug]/page.tsx` — what's-on listing + detail.
- `account/page.tsx` — profile/preferences (Supabase-backed profile editor).
- `(auth)/login`, `signup`, `forgot-password`, `reset-password`; `auth/callback/route.ts` handles OAuth/email code exchange.

### Data-driven filters (the core mechanic)
Filters are **not hardcoded per category**. Each category has `FilterDefinition[]` (type `enum` / `range` / `boolean`, with JSONB `options`). The listing page fetches the schema and renders one generic filter UI. The backend (`categories.py → list_experiences`) filters server-side against `Experience.attributes` (JSONB):
- `enum` → attribute (string or array) intersects selected values (comma/repeat to OR)
- `range` → numeric compare; `options.direction == "min"` means `>=` (e.g. "rating 4+"), else `<=`
- `boolean` → attribute is JSON `true`
Only `approved` listings are ever served publicly. Results are paginated.

### Favorite / book gating
`POST/DELETE /favorites/{id}` and `POST /bookings` require auth (401 otherwise). The frontend catches the 401, stashes a "pending favorite," redirects to login, then **replays** it after auth (`providers.tsx`). Bookings are a **v1 stub** — creates a `requested` booking, **no payment processing**.

### AI assistant (`backend/app/services/assistant.py`)
Server-side call to **Gemini 2.5 Flash** in JSON mode. System prompt is grounded with the live category+filter catalog. Every turn returns `{reply, suggested_category_slug, suggested_filters}`; the suggestions stay `null` until the model is confident, at which point the UI can deep-link the user into the matching filtered listing. The backend **validates** the model's suggested slug/filter keys against the real catalog and drops anything bogus before returning. Conversation state is persisted per session (`AssistantSession`, guests allowed with null `user_id`). Degrades gracefully if `GEMINI_API_KEY` is unset.

---

## 6. Business onboarding & portal (the active development area)

This is where recent work has concentrated. The design deliberately **separates the pre-auth submission from the live entity**:

```
BusinessApplication  ──(admin approves)──►  Business + BusinessOwner + Supabase auth account
(no auth account)                            (magic-link activation)

BusinessClaim        ──(admin approves)──►  Business + BusinessOwner + auth account
(on an existing listing)                     + listing.owner_id assigned
```

### Two public entry points (`/business` landing → `frontend/src/app/business/page.tsx`)

**A. List a New Business** (`/business/signup` → 6-step `ApplicationWizard`: Business → Owner → Location → Category → Documents → Review; router `applications.py`)
1. `POST /api/v1/applications` — stores a `BusinessApplication` (business + owner + location + tourism categories). **No auth account created.** A `BusinessVerification` row is created via the verification service (currently `manual`; an eCitizen BRS provider can slot in later without schema change).
2. Documents (registration cert, ID, logo, cover, etc.) are uploaded **straight to Supabase Storage** using backend-minted **signed upload URLs** (`/applications/{id}/documents/sign` → upload → `/applications/{id}/documents` to record). Sensitive docs → private bucket; logo/cover → public bucket.
3. Applicant can poll `GET /applications/{id}` for status.

**B. Claim an Existing Business** (`/business/claim` → 4-step `ClaimWizard`: Find → Your details → Proof → Review; also reachable via "Own this business? Claim it →" on any experience page; router `claims.py`)
1. `GET /claims/search?q=` — search approved catalog listings.
2. `POST /claims` — stores a `BusinessClaim` targeting the chosen `Experience`. No auth account.
3. Upload proof of ownership via the same signed-URL pattern (`/claims/{id}/documents/sign` + record).
4. Poll `GET /claims/{id}` for status.

### Admin review → approval is where the account is born
In `/admin/dashboard` (Applications & Claims tabs):

- **Approve application** (`admin_applications.py → review_application`): provisions a Supabase auth account + mints an **activation magic link** (`supabase_admin.provision_account`), creates the live **`Business`** (verified badge = true, logo/cover public URLs copied over), links a **`BusinessOwner`**, marks the application `approved` and the verification `verified`, writes an **audit log**. `request_info` / `reject` are the other outcomes.
- **Approve claim** (`admin_claims.py → review_claim`): same account/magic-link/business/owner creation, **plus** it assigns `experience.owner_id` to the new owner (transferring the catalog listing).

> In **development**, the magic link is returned in the API response and logged (there's no email sending yet — `RESEND_API_KEY` is blank; Supabase's built-in emails are the fallback). Production would email it via Resend.

### Owner activation & dashboard
- `/business/activate` — owner arrives via the magic link (Supabase sets the session from the URL), optionally sets a password, accepts terms, lands in the dashboard.
- `/business/dashboard` — manage listings. `business.py` router (all routes require an approved `business` account via `get_current_business`): `POST /business/listings` (created as `pending` → awaits admin approval), `GET /business/listings`, `PATCH /business/listings/{id}` (owner-scoped).

> **Note:** listing ownership is currently keyed on `Experience.owner_id` (the user), not yet fully wired to the `Business` entity. The fuller dashboard (bookings, analytics, reviews) is future work — see the `ComingSoon` portal placeholder.

### Admin "Businesses" panel (newest, uncommitted) — `admin_businesses.py`
Manages **live/approved** businesses (distinct from pending applications):
- `GET /admin/businesses` (filter by status, search), `GET /admin/businesses/{id}` (detail incl. source = application|claim, listing count, primary owner).
- `PATCH /admin/businesses/{id}` — actions `suspend` / `archive` / `reopen` (audited).
- `GET .../documents` and `.../documents/{doc}/url` (signed view of the originating docs), `GET .../ownership-history`.

Business lifecycle status (`BusinessStatus`): `approved` (can publish) / `suspended` (hidden, blocked) / `archived` (soft-removed, kept for record). The `archived` state was added by the newest migration.

---

## 7. Admin moderation & events

`admin.py` (all routes require an admin):
- **Listings** — `GET /admin/listings` (filter/search), `PATCH /admin/listings/{id}` to approve / flag / remove / re-queue (pending). Every change writes a `ModerationAction`.
- **Reports** — public users flag a listing via `POST /experiences/{id}/report` (reason). Admin reviews/dismisses at `GET/PATCH /admin/reports`.
- **Audit** — `GET /admin/audit` (moderation actions). Separately, privileged business/admin actions write to the general `audit_logs` table.

**Events** (`events.py`): public reads auto-hide archived + expired events (`/events`, `/events/upcoming`, `/events/featured`, `/events/{slug}`). Admin CRUD (`POST/PATCH/DELETE /events`) covers feature + archive. A **Render cron** (`event_ingestion.scheduler`, daily) ingests/refreshes events.

---

## 8. Backend API surface (`/api/v1`)

| Router | Endpoints | Auth |
|---|---|---|
| `auth.py` | `POST signup/login/google/refresh/logout`, `GET me` | public (legacy; `me` requires token) |
| `categories.py` | `GET /categories`, `/{slug}`, `/{slug}/filters`, `/{slug}/experiences` | public |
| `experiences.py` | `GET /experiences/featured`, `/{id}`; `POST /{id}/report` | public (report requires user) |
| `events.py` | `GET` reads; `POST/PATCH/DELETE` | reads public, writes admin |
| `favorites.py` | `GET`, `POST/{id}`, `DELETE/{id}` | user |
| `bookings.py` | `POST`, `GET` | user |
| `assistant.py` | `POST /assistant/message` (+ session) | public/guest |
| `applications.py` | submit + doc sign/record + status | public |
| `claims.py` | search + submit + doc sign/record + status | public |
| `business.py` | `/business/listings` CRUD | business |
| `admin.py` | listings, reports, audit | admin |
| `admin_applications.py` | list/detail/review applications, doc URLs | admin |
| `admin_claims.py` | list/detail/review claims, doc URLs | admin |
| `admin_businesses.py` | live-business list/detail/actions/docs/history | admin |

Wired in `backend/app/main.py`; `GET /health` is the liveness probe. Interactive docs at `/docs`.

---

## 9. Data model (API DB)

Core: `users`, `categories`, `filter_definitions`, `experiences`, `favorites`, `bookings`, `assistant_sessions`, `events`.

Business: `business_applications`, `business_verifications`, `business_documents` (attach to an application **XOR** a claim, enforced by a check constraint), `businesses`, `business_owners`, `business_claims`.

Admin/moderation: `admin_roles`, `admin_invitations`, `audit_logs`, `listing_reports`, `moderation_actions`.

Key enums: `AccountType`, `AdminRole`, `ApplicationStatus`, `BusinessStatus`, `ClaimStatus`, `VerificationStatus`, `DocumentType`, `OwnerRole`, `BusinessType`, `ListingStatus`, `EventStatus`, `FilterType`, `BookingStatus`, `ReportStatus`.

**Alembic migrations** (`backend/alembic/versions/`) tell the build order:
1. `initial_schema` — users, categories, filters, experiences, favorites, bookings, assistant sessions.
2. `events_and_admin` — events + initial admin/moderation.
3. `roles_moderation` — admin role tiers, invitations, audit log, reports/moderation actions.
4. `account_types_and_business_onboarding` — account types + applications/verifications/documents/businesses/owners.
5. `claims_target_experience` — claims point at an `Experience` (the claimed listing).
6. `business_status_archived` — adds the `archived` business status (uncommitted WIP).

**Supabase migrations** (`supabase/migrations/`, for the future cutover, not the live path): `0001_schema`, `0002_rls`, `0003_profile_trigger` (auto-creates a `profiles` row on `auth.users` insert), `0004_avatars_storage`, `0005_business_storage`.

---

## 10. Frontend structure

- `lib/api/*.ts` — one thin client per domain (`categories`, `experiences`, `events`, `favorites`, `bookings`, `assistant`, `admin`, `admin-businesses`, `applications`, `claims`, `business`, `roles`), all through `client.ts` (`apiFetch`, base URL from `NEXT_PUBLIC_API_URL`, `credentials: include`, Bearer from in-memory token).
- `lib/supabase/{client,server,middleware,admin}.ts` — Supabase clients; `lib/stores/auth-store.ts` (+ `favorites-store`) — Zustand.
- `components/admin/` — `admin-dashboard.tsx` (tabbed: Applications / Claims / Listings / Reports / Audit), `businesses-panel.tsx`, `applications-panel`, `claims-panel`.
- `components/business/` — `claim-wizard`, signup wizard; `components/portal/` — `portal-guard`, `portal-shell`, `coming-soon`.
- `components/auth/`, `components/account/` — Supabase auth UI (strength meter, OAuth buttons, profile editor).
- Admin pages under `src/app/admin/**`, business pages under `src/app/business/**`. Document uploads (`lib/business-docs.ts`) go signed-URL → straight to Supabase Storage (≤10MB; PNG/JPG/WebP/PDF).

> **Partial admin migration:** two admin surfaces coexist and reuse the same panel components — the legacy tabbed `/admin/page.tsx` (inside site chrome) and the newer `PortalShell`-based `/admin/dashboard/*`. The `/admin/dashboard` sidebar lists many sections (Users, Reviews, Categories, Administrators, Settings, Analytics) that are not built yet (`ComingSoon`).

---

## 11. Configuration & running

**Backend env** (`backend/app/config.py`): `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID` (legacy), `SUPABASE_URL`, `SUPABASE_JWKS_URL`, `SUPABASE_SERVICE_KEY`, `BUSINESS_DOCS_BUCKET`/`BUSINESS_MEDIA_BUCKET`, `FRONTEND_URL`, `VERIFICATION_PROVIDER` (`manual`), `RESEND_API_KEY`/`EMAIL_FROM`, `CORS_ORIGINS`/`CORS_ORIGIN_REGEX`, `COOKIE_SECURE`.

**Frontend env**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server only).

**Run locally**
```bash
# backend (from backend/)
uv venv && uv pip install -e ".[dev]"
uv run uvicorn app.main:app --reload      # http://localhost:8000  (/docs, /health)
uv run alembic upgrade head               # apply migrations
uv run pytest

# frontend (from frontend/)
npm install && npm run dev                # http://localhost:3000
```
Deployment is documented step-by-step in `DEPLOYMENT.md` (Render blueprint `render.yaml` → Vercel → wire URLs back to Supabase). Supabase manual setup in `SUPABASE_SETUP.md`.

---

## 12. Current state & known gaps

**Working end-to-end:** consumer browse + data-driven filters, favorites (with pending-replay), booking stub, AI assistant, events (+ daily ingestion), Supabase auth (Google + email/pw + reset + verification), business application & claim submission with document upload, admin review/approval → auth account + magic link + live business, business listing management, admin moderation (listings/reports/audit), admin businesses panel.

**Gaps / follow-ups:**
- **Email delivery not wired** — approval magic links are returned in the API response and logged (dev). `RESEND_API_KEY` is blank; production email is TODO.
- **Data-layer cutover not done** — content still served from Render Postgres via FastAPI, not from Supabase (RLS schema is ready but unused). Two favorites paths exist transiently.
- **Business ↔ listing wiring** keyed on `Experience.owner_id`, not fully on the `Business` entity yet; richer business dashboard (bookings/analytics/reviews) is `ComingSoon`.
- **Legacy `/auth/*` endpoints** and legacy JWT path remain for back-compat; can be retired after the Supabase data cutover.
- **Stale top-level docs** — `README.md` ("scaffold only") and `CLAUDE .md` (assistant = Claude) are out of date; trust the code and this document.
- **Owner-login email quirk** — on application approval, the owner's auth account is provisioned against the application's `business_email`, not the separately-collected `owner_email` (`admin_applications._upsert_business_user`). Worth confirming that's intended.
- **Admin RBAC tiers under-used** — `require_moderator/administrator/super_admin` deps exist but the admin routers currently gate only on `get_current_admin` (any tier).

**Uncommitted work in the tree right now** (per `git status` on branch `Vanessa`): the admin businesses panel (`admin_businesses.py`, `admin_business.py` schema, `businesses-panel.tsx`, `admin-businesses.ts`), the `business_status_archived` migration, the portal components, and `src/app/admin/dashboard/` pages.
