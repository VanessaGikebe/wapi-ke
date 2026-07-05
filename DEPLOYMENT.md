# Deployment — Vercel (frontend) + Render (API) + Supabase (auth/db)

Deploy order matters (each step needs a URL from the previous one):
**Render → Vercel → wire URLs back into Supabase + Render.**

Prereqs: push the repo to GitHub; Supabase tables + auth already set up.

---

## 1. Render — API + Postgres + daily cron
`render.yaml` (repo root) provisions everything.

1. **Render → New → Blueprint →** pick this repo → **Apply**.
   Creates: `wapike-db` (Postgres), `wapike-api` (web), `wapike-events` (cron).
2. On **`wapike-api` → Environment**, set the `sync:false` vars:

| Var | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your Claude key |
| `SUPABASE_URL` | `https://qcvlmwahpnyehsmlgmuj.supabase.co` |
| `SUPABASE_JWKS_URL` | `https://qcvlmwahpnyehsmlgmuj.supabase.co/auth/v1/.well-known/jwks.json` |
| `CORS_ORIGINS` | `https://YOUR-APP.vercel.app,http://localhost:3000` *(fill after Vercel)* |
| `CORS_ORIGIN_REGEX` | `https://.*\.vercel\.app` *(optional — allows preview URLs)* |

`DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECURE`, `PYTHON_VERSION` are set by the blueprint.

3. First deploy auto-runs `alembic upgrade head` (creates the API's tables).
4. Note the API URL: `https://wapike-api.onrender.com` (yours may differ).

### Seed the Render database (one-time, from your machine)
The scraped JSON is git-ignored, so load it into the Render DB from local, using
Render's **External Database URL** (Dashboard → `wapike-db` → Connect):
```bash
cd backend
# uses your local backend/data/*.json; scheme is auto-normalized to psycopg
DATABASE_URL="postgresql://<render-external-connection-string>" \
  ./.venv/Scripts/python.exe scripts/import_data.py
# optional: create the initial events now (cron does this daily anyway)
DATABASE_URL="postgresql://<render-external-connection-string>" \
  ./.venv/Scripts/python.exe -m event_ingestion.scheduler
```

---

## 2. Vercel — frontend
1. **Vercel → Add New → Project →** import the repo.
2. **Root Directory: `frontend`** (important). Framework auto-detects Next.js.
3. **Environment Variables** (Production + Preview):

| Var | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qcvlmwahpnyehsmlgmuj.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your **publishable** key (`sb_publishable_…`) |
| `NEXT_PUBLIC_API_URL` | `https://wapike-api.onrender.com/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | `https://YOUR-APP.vercel.app` *(fill after first deploy)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(optional — only if server code uses the admin client)* |

4. **Deploy.** Note the URL, e.g. `https://wapike.vercel.app`.
5. Set `NEXT_PUBLIC_SITE_URL` to that URL and **redeploy**.

### Or via CLI
```bash
cd frontend
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production   # repeat per var
vercel --prod
```

---

## 3. Wire the production URLs back
1. **Supabase → Authentication → URL Configuration:**
   - Site URL: `https://YOUR-APP.vercel.app`
   - Redirect URLs: add `https://YOUR-APP.vercel.app/auth/callback`
2. **Google Cloud Console → OAuth client → Authorized redirect URIs:** keep the
   Supabase callback; **Authorized JavaScript origins:** add `https://YOUR-APP.vercel.app`.
3. **Render `wapike-api` → `CORS_ORIGINS`:** ensure it includes the Vercel URL →
   redeploy if you changed it.

---

## Notes / gotchas
- **Two databases by design:** the API keeps its own Postgres (Render); Supabase
  holds auth (+ the new schema for the future cutover). This avoids a table clash
  (both define `events`). After the data-layer cutover you can drop Render
  entirely and run on Vercel + Supabase only.
- **Render free tier** sleeps on idle → first request is slow (~30–60s). Upgrade
  or add a keep-alive ping for production.
- **Python:** pinned to 3.12.7 on Render for broad wheel support (`psycopg[binary]`,
  `cryptography`). Local dev uses 3.13 via uv — both fine.
- **Rotate** the Supabase secret + Google client secret (shared in chat).
