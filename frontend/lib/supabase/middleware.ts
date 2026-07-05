/**
 * Session refresh for Next middleware.
 *
 * `updateSession` runs on every matched request: it reads the auth cookies,
 * lets Supabase rotate an expired access token, and writes the refreshed
 * cookies onto the response. This is what makes sessions persist and refresh
 * automatically across Server Components and page loads.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token with Supabase and triggers the
  // cookie refresh above. Do not remove.
  await supabase.auth.getUser();

  return response;
}
