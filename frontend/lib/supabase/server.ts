/**
 * Server Supabase client (Server Components, Route Handlers, Server Actions).
 *
 * Reads/writes the auth session from cookies. In a Server Component cookie
 * writes throw (rendering is read-only) — that's expected; the middleware is
 * responsible for refreshing and persisting the session cookie.
 *
 * Next 14: `cookies()` is synchronous.
 */

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware
            // refreshes the session cookie on the response.
          }
        },
      },
    },
  );
}
