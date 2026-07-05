# Environment Variables

## Frontend (`frontend/.env.local` — git-ignored)
| Var | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser | **Publishable** (anon) key — safe to expose; RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | **Secret** key — bypasses RLS. Never `NEXT_PUBLIC_*` |
| `SUPABASE_JWKS_URL` | server | JWKS for verifying Supabase JWTs |
| `NEXT_PUBLIC_API_URL` | browser | FastAPI base (default `http://localhost:8000/api/v1`) |
| `NEXT_PUBLIC_SITE_URL` | browser | This app's origin (OAuth/email redirect target) |

Key mapping (Supabase's new key names → our vars):
- publishable key `sb_publishable_…` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- secret key `sb_secret_…` → `SUPABASE_SERVICE_ROLE_KEY`

## Backend (`backend/.env` — git-ignored)
| Var | Purpose |
|---|---|
| `DATABASE_URL` | local Postgres (still powers data endpoints this phase) |
| `JWT_SECRET` | legacy token signing (fallback auth) |
| `ANTHROPIC_API_KEY` | AI assistant |
| `GOOGLE_CLIENT_ID` | legacy `/auth/google` (unused by UI now) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_JWKS_URL` | verify Supabase JWTs on protected routes |

For the import script also export `SUPABASE_SERVICE_KEY` (the secret key).

## Security
- Only `NEXT_PUBLIC_*` vars reach the browser. The service/secret key and JWKS
  are server-only.
- `.env.local` and `.env` are git-ignored. Templates: `*.env.example`.
- **Rotate** the secret key + Google client secret (shared in chat).
