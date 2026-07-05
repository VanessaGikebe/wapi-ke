# Supabase Setup

Everything you must do **in the Supabase & Google dashboards** to make the
migration live. Code is already wired; these are the manual steps.

## 0. Prerequisites
- A Supabase project (you have one: `qcvlmwahpnyehsmlgmuj`).
- Your keys in `frontend/.env.local` (see `ENVIRONMENT.md`). Already created.

## 1. Apply the database schema
Open **Supabase → SQL Editor** and run, in order:
1. `supabase/migrations/0001_schema.sql`  — tables, indexes, FKs, enums
2. `supabase/migrations/0002_rls.sql`      — Row Level Security policies
3. `supabase/migrations/0003_profile_trigger.sql` — auto-create profiles

Each is idempotent-ish and safe to re-run.

> If you use the Supabase CLI instead: `supabase db push` after
> `supabase link --project-ref qcvlmwahpnyehsmlgmuj`.

## 2. Enable Google sign-in
**Supabase → Authentication → Providers → Google → Enable**, then paste:
- **Client ID:** `987748675385-9kff27go1sl2cepv0m769e95430t85r8.apps.googleusercontent.com`
- **Client Secret:** *(your Google client secret — rotate it, see Security)*

Copy the **Callback URL** Supabase shows (looks like
`https://qcvlmwahpnyehsmlgmuj.supabase.co/auth/v1/callback`) and add it in
**Google Cloud Console → Credentials → your OAuth client → Authorized redirect
URIs**. Also add `http://localhost:3000` under **Authorized JavaScript origins**.

## 3. Configure Auth URLs
**Supabase → Authentication → URL Configuration:**
- **Site URL:** `http://localhost:3000` (and your production URL later)
- **Redirect URLs:** add `http://localhost:3000/auth/callback`
  (and `https://YOUR-DOMAIN/auth/callback` for production)

## 4. Email
Email verification + password-reset use Supabase's built-in email (rate-limited
on the free tier). For production, set **Authentication → Emails → SMTP** with
your own provider. Templates can point at `{{ .SiteURL }}/auth/callback`.

## 5. Import existing data (optional, for the data-layer cutover)
After step 1, load the scraped data into Supabase:
```bash
cd backend
SUPABASE_URL=https://qcvlmwahpnyehsmlgmuj.supabase.co \
SUPABASE_SERVICE_KEY=<your secret key> \
./.venv/Scripts/python.exe scripts/export_to_supabase.py
```
Idempotent (upserts on stable keys). See `DATABASE.md`.

## 6. Security
- **Rotate** the Supabase secret key and Google client secret — they were shared
  in chat. Update `frontend/.env.local` + the Supabase Google provider after.
- The secret key lives **only** in `.env.local` (git-ignored) and server code.

## Run locally
```bash
# backend (bridged to Supabase auth)
cd backend && ./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000 --reload
# frontend
cd frontend && npm run dev   # visit http://localhost:3000
```
