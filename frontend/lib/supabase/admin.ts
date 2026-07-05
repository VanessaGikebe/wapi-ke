/**
 * Admin Supabase client — SERVICE ROLE / SECRET key. Bypasses Row Level
 * Security, so it must NEVER run in the browser. Use only inside Route
 * Handlers, Server Actions, or scripts (e.g. seeding, webhooks).
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "createAdminClient() must never be called in the browser — it uses the secret key.",
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
