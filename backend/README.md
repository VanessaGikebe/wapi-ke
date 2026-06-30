# Wapike Backend

FastAPI service for the Wapike experience-discovery platform. See the repo-root
`README.md` for environment setup and run commands.

## Layout

```
backend/
  app/
    __init__.py
    main.py          # FastAPI app + /health, mounts /api/v1 routers
    config.py        # Settings loaded from .env (pydantic-settings)
    db.py            # SQLAlchemy 2.0 engine / session / Base
    core/
      security.py    # bcrypt password hashing + JWT helpers
    api/
      deps.py        # get_current_user dependency
      v1/auth.py     # /api/v1/auth: signup, login, refresh, logout, me
    schemas/
      auth.py        # Pydantic v2 request/response models
    models/          # ORM models (CLAUDE.md §7)
      user.py, category.py, filter_definition.py, experience.py,
      favorite.py, booking.py, assistant_session.py
  alembic/
    versions/        # migrations (initial schema lives here)
    env.py           # imports app.models so autogenerate sees the schema
  scripts/
    seed.py          # populates categories + filters + sample experiences
  tests/
    test_health.py
  alembic.ini
  pyproject.toml
  .env.example
```

## Database

Models (CLAUDE.md §7): `User`, `Category`, `FilterDefinition`, `Experience`,
`Favorite`, `Booking`, `AssistantSession`. UUID primary keys, JSONB for
`options` / `images` / `attributes` / messages, native PG enums for
`filter_type` and `booking_status`.

### Migrations

```bash
# from backend/, with the venv active (or use .venv/Scripts/python.exe -m ...)
alembic upgrade head                              # apply migrations
alembic revision --autogenerate -m "describe it"  # create a new migration
alembic downgrade -1                              # roll back one
```

### Seed data

`scripts/seed.py` is idempotent — it wipes and re-inserts the 10 categories,
their full filter schemas (CLAUDE.md §6), and 6–8 sample experiences each with
attributes keyed to those filters (mirrors `frontend/lib/mock/catalog.ts`).

```bash
python scripts/seed.py
```

## Auth (CLAUDE.md §8)

JWT auth under `/api/v1/auth`:

| Route          | Method | Notes                                                        |
| -------------- | ------ | ------------------------------------------------------------ |
| `/signup`      | POST   | `{email, password, name}` → access token + refresh cookie    |
| `/login`       | POST   | `{email, password}` → access token + refresh cookie          |
| `/refresh`     | POST   | reads the refresh cookie → new access token (rotates cookie) |
| `/logout`      | POST   | clears the refresh cookie                                    |
| `/me`          | GET    | protected — requires `Authorization: Bearer <access token>`  |

- **Access token** (short-lived, default 15 min) is returned in the response
  body; the client sends it as a Bearer header.
- **Refresh token** (default 7 days) is set as an `httpOnly` cookie scoped to
  `/api/v1/auth`, rotated on each `/refresh`.
- Passwords hashed with **bcrypt**. Protect any route with the
  `get_current_user` dependency (`app/api/deps.py`).
- Run the tests: `pytest` (uses an isolated `wapike_test` database, created
  automatically).

## Catalog & favorites (CLAUDE.md §8)

| Route                                  | Method      | Auth | Notes                                       |
| -------------------------------------- | ----------- | ---- | ------------------------------------------- |
| `/categories`                          | GET         | —    | all categories                              |
| `/categories/{slug}`                   | GET         | —    | one category (404 if unknown)               |
| `/categories/{slug}/filters`           | GET         | —    | the category's `FilterDefinition[]`         |
| `/categories/{slug}/experiences`       | GET         | —    | filtered + paginated experiences            |
| `/favorites/{experience_id}`           | POST/DELETE | ✅   | 401 if unauthenticated                      |

**Experience filtering** is server-side against the `attributes` JSONB column,
driven by the category's filter schema — each query param matching a filter
`key` is applied by type:

- `enum` — `?cuisine=Italian&cuisine=Swahili` (repeat or comma-separate to OR);
  matches whether the stored attribute is a string or an array of strings
- `range` — `?duration_hours=5` keeps experiences with the value **≤ 5**
- `boolean` — `?waterfalls=true` keeps only `true` (a falsy value is a no-op)

Unknown params are ignored. Paginate with `?page=1&limit=20` (response:
`{items, total, page, limit, pages}`).

## Local PostgreSQL (dev)

This machine has no system Postgres, so a portable PostgreSQL 16 instance was
provisioned (no admin / no Windows service):

- **Binaries:** `C:\Users\user\wapike-postgres\pgsql\bin`
- **Data dir:** `C:\Users\user\wapike-postgres\data`
- **Log:** `C:\Users\user\wapike-postgres\pg.log`
- **Server:** `localhost:5432`, superuser role `wapike` (trust auth, local
  only), database `wapike` — matching `DATABASE_URL` in `.env`.

Manage it with `pg_ctl` (PowerShell):

```powershell
$pg = 'C:\Users\user\wapike-postgres\pgsql\bin'
$data = 'C:\Users\user\wapike-postgres\data'

& "$pg\pg_ctl.exe" -D $data status                                  # is it running?
& "$pg\pg_ctl.exe" -D $data -l "$data\..\pg.log" -o "-p 5432" start # start
& "$pg\pg_ctl.exe" -D $data stop                                    # stop

& "$pg\psql.exe" -U wapike -h localhost -p 5432 -d wapike           # psql shell
```

> The data dir lives outside the repo, so the seeded data persists across
> restarts. To start fresh, stop the server, delete the data dir, re-run
> `initdb` + `createdb wapike`, then `alembic upgrade head` and the seed.
> Swapping in a different (e.g. cloud) Postgres is just a `DATABASE_URL` change.
