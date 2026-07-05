# Migration Notes — Supabase

## Strategy
Non-breaking, phased. **Auth is fully migrated to Supabase now.** The app keeps
working because the FastAPI data endpoints were **bridged** to accept Supabase
JWTs (via the project JWKS) instead of being rewritten in one shot. The full
Supabase schema + RLS + import are in place so the data layer can be cut over
next without further design work.

## What changed (frontend)
- **Added:** `lib/supabase/{client,server,middleware,admin,types}.ts`,
  `src/middleware.ts`, `lib/password.ts`,
  `components/auth/{password-strength,oauth-buttons}.tsx`,
  `components/account/profile-editor.tsx`,
  `src/app/auth/callback/route.ts`,
  `src/app/(auth)/{forgot-password,reset-password}/page.tsx`,
  `.env.local`, `.env.example`.
- **Rewritten:** `lib/stores/auth-store.ts` (Supabase, same public API),
  `components/auth/auth-form.tsx` (Supabase + strength meter + confirm +
  remember me + verification + friendly errors), `src/app/account/page.tsx`
  (Profile tab → `ProfileEditor`), `(auth)/login/page.tsx` (error param).
- **Removed:** `components/auth/social-auth.tsx` (obsolete Google Identity
  Services button — replaced by Supabase OAuth). `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
  is no longer used by the UI.
- **Deps:** `@supabase/supabase-js`, `@supabase/ssr`.

## What changed (backend)
- `app/api/deps.py` — `get_current_user` verifies Supabase JWTs via JWKS and
  mirrors the user into `users`; legacy tokens still work as a fallback.
- `app/config.py` — `SUPABASE_URL`, `SUPABASE_JWKS_URL`.
- `.env` / `.env.example` — Supabase bridge vars. `cryptography` installed.
- `scripts/export_to_supabase.py` — local DB → Supabase importer.
- **Unchanged / deprecated:** `POST /api/v1/auth/*` (kept for back-compat/tests;
  no longer called by the UI).

## Database
`supabase/migrations/0001_schema.sql`, `0002_rls.sql`, `0003_profile_trigger.sql`.

## Manual steps remaining (see SUPABASE_SETUP.md)
1. Run the 3 SQL migrations in the Supabase SQL editor.
2. Enable the Google provider in Supabase + add redirect URIs in Google Cloud.
3. Set Auth Site URL + redirect URLs.
4. (Optional) run `export_to_supabase.py` to load data into Supabase.
5. **Rotate** the secret key + Google client secret.

## Recommended next phase (data-layer cutover)
Move reads/writes off FastAPI onto Supabase directly (RLS):
- favorites/saved_events/reviews → Supabase tables (RLS already written);
- places/events reads → Supabase (data already importable);
- then retire the FastAPI data + `/auth/*` endpoints and the local Postgres.
This can be done table-by-table with no UI change.

## Known trade-offs
- Two favorites paths exist transiently (FastAPI now; Supabase table ready). The
  UI uses FastAPI until the cutover.
- "Remember me" is UI + default-persistent (Supabase sessions persist by
  design); true session-only expiry is a follow-up.
- `place_images` linking needs a follow-up pass (needs place UUIDs after upsert).
