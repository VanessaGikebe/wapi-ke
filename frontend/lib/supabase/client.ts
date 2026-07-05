/**
 * Browser Supabase client (Client Components).
 *
 * Uses the PUBLISHABLE (anon) key — safe to ship to the browser. Row Level
 * Security is what actually protects the data. Create a fresh client per call;
 * `@supabase/ssr` dedupes the underlying connection.
 */

import { createBrowserClient } from "@supabase/ssr";

// Typed via `supabase gen types` later (see lib/supabase/types.ts); loosely
// typed for now to avoid friction with hand-authored partial types.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
