# Wapike

Premium tourism and experience-discovery platform. Monorepo with a Next.js
frontend and a FastAPI backend.

> **Status:** tooling scaffold only. No product pages, models, or business
> routes yet — just a booting frontend, a booting backend with a `/health`
> endpoint, and the dev tooling wired up. See [`CLAUDE .md`](./CLAUDE%20.md) for
> the full product spec and conventions.

## Layout

```
wapi-ke/
  frontend/   # Next.js 14 (App Router, TypeScript, Tailwind, ESLint, Prettier)
              #   + stitch_wapike_experience_discovery_platform/  (design source of truth)
  backend/    # FastAPI (SQLAlchemy 2.0, Alembic, Pydantic v2, pytest), uv-managed
```

## Prerequisites

- **Node.js** 18.18+ (tested on 22.x) and **npm**
- **Python** 3.11+ (tested on 3.13)
- **[uv](https://docs.astral.sh/uv/)** for Python dependency management
  (`pip install uv` if you don't have it)
- **PostgreSQL** 14+ — only needed once real models/migrations land; the app
  boots and `/health` works without it.

---

## Frontend

```bash
cd frontend
npm install

# Dev server with hot reload -> http://localhost:3000
npm run dev

# Other scripts
npm run build         # production build
npm run start         # serve the production build
npm run lint          # ESLint (next lint)
npm run format        # Prettier write
npm run format:check  # Prettier check
```

Stack: Next.js 14 App Router, TypeScript, Tailwind CSS, ESLint, Prettier.
**TanStack Query** and **Zustand** are installed but intentionally not yet
configured — they'll be wired up when data fetching and global state arrive.

---

## Backend

All commands are run from `backend/`.

```bash
cd backend

# 1. Create the virtualenv and install deps (app + dev tools)
uv venv
uv pip install -e ".[dev]"

# 2. Configure environment
cp .env.example .env        # then edit values
```

`.env` keys (read by `app/config.py`):

| Key                 | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `DATABASE_URL`      | SQLAlchemy / psycopg v3 Postgres URL      |
| `JWT_SECRET`        | Secret for signing JWT access/refresh     |
| `ANTHROPIC_API_KEY` | Claude API key for the assistant router   |

```bash
# 3. Run the API -> http://localhost:8000  (health: /health, docs: /docs)
uv run uvicorn app.main:app --reload

# 4. Tests
uv run pytest

# 5. Migrations (Alembic) — once models exist
uv run alembic revision --autogenerate -m "message"
uv run alembic upgrade head
```

Quick health check:

```bash
curl http://localhost:8000/health   # -> {"status":"ok"}
```

> On Windows, if the `uv run` prefix isn't available you can use the venv
> interpreter directly, e.g. `.venv/Scripts/python.exe -m uvicorn app.main:app --reload`.

Stack: FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2 (pydantic-settings),
psycopg 3, pytest. The SQLAlchemy engine/session/`Base` and the Alembic
environment are wired up, but no ORM models are defined yet.
