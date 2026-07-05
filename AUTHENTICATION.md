# Authentication

Auth runs entirely on **Supabase Auth**. The existing UI/design is preserved;
only the plumbing changed.

## Flows supported
| Flow | How |
|---|---|
| Google sign-in | `supabase.auth.signInWithOAuth({ provider: 'google' })` → `/auth/callback` |
| Email + password | `signInWithPassword` / `signUp` |
| Email verification | `signUp` sends a link → `/auth/callback` exchanges the code |
| Forgot password | `resetPasswordForEmail` → email link → `/auth/callback?next=/reset-password` |
| Password reset | `/reset-password` calls `updateUser({ password })` |
| Persistent session | cookie-based; refreshed by middleware on every navigation |
| Auto refresh | `supabase-js` + `src/middleware.ts` (`updateSession`) |
| Secure logout | `signOut()` clears cookies + local state |

## Key files
- `lib/supabase/client.ts` — browser client (publishable key)
- `lib/supabase/server.ts` — server client (cookies)
- `lib/supabase/middleware.ts` + `src/middleware.ts` — session refresh
- `lib/supabase/admin.ts` — service-role client (server only)
- `lib/stores/auth-store.ts` — Zustand store wrapping Supabase (same API the UI already used)
- `components/auth/auth-form.tsx` — login/signup (strength meter, confirm, remember me, show/hide, verification prompt)
- `components/auth/oauth-buttons.tsx` — Google (Supabase OAuth) + Apple (placeholder)
- `components/auth/password-strength.tsx` + `lib/password.ts` — policy + meter
- `src/app/auth/callback/route.ts` — OAuth/email code exchange
- `src/app/(auth)/forgot-password`, `.../reset-password` — reset flow
- `components/account/profile-editor.tsx` — name/username/avatar/password/preferences

## Password policy (`lib/password.ts`)
8–128 chars, requires upper + lower + number + special, rejects common
passwords. `assessPassword()` returns `{ checks, valid, score, strength }`;
levels: Very Weak → Very Strong. The meter shows live as the user types.

## Backend bridge (kept working, non-breaking)
The FastAPI data endpoints (favorites, bookings, events admin) now **accept
Supabase JWTs**, verified against the project JWKS
(`app/api/deps.py` → `_verify_supabase_token`). A Supabase user is mirrored into
the local `users` table (keyed by the Supabase user id), so existing FK-based
features keep working. Legacy app tokens still validate as a fallback.

The old `POST /api/v1/auth/*` endpoints are no longer used by the UI (kept for
back-compat/tests) — safe to remove once the data layer moves fully to Supabase.
