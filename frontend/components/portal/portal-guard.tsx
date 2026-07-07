"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuthStore, type AccountType, type AuthStatus } from "@/lib/stores/auth-store";

/**
 * Enforces **portal confinement**. WapiKE is three separate portals sharing one
 * backend; no account type may enter another portal once authenticated:
 *
 *   admin     → confined to /admin/**
 *   business  → confined to /business/dashboard/**
 *   user/anon → public portal (+ the public business onboarding pages)
 *
 * A mismatched authenticated account is redirected to its own home; an
 * unauthenticated visitor to a protected area is sent to that portal's login.
 * (Data access is independently enforced server-side by the API's RBAC.)
 *
 * This is a **wrapper**: while a confinement redirect is pending — or while an
 * authenticated session's account type is still being resolved from /auth/me —
 * it withholds the requested page instead of rendering it. That closes the
 * window where an admin/business account would otherwise briefly see (and be
 * able to interact with) the consumer site before the redirect lands.
 */
export function PortalGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accountType = useAuthStore((s) => s.accountType);

  const redirectTo = confinementRedirect(pathname, status, accountType);

  React.useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  // A confinement redirect is in flight — don't paint the mismatched page.
  if (redirectTo) return null;

  // Authenticated, but we don't yet know which portal this account belongs to
  // (/auth/me still in flight). Withhold content until the type resolves so a
  // portal account is never shown the public site in the meantime. Anonymous
  // sessions never reach this branch (isAuthenticated stays false for them),
  // and the initial render is unaffected (status is "idle"), so SSR/hydration
  // stay in sync.
  if (isAuthenticated && accountType === null) return null;

  return <>{children}</>;
}

/**
 * Pure decision function: the path this account must be redirected to for the
 * current route, or `null` if the route is allowed (or we can't decide yet).
 */
function confinementRedirect(
  pathname: string,
  status: AuthStatus,
  accountType: AccountType | null,
): string | null {
  if (status === "idle" || status === "loading") return null;

  const inAdmin = pathname.startsWith("/admin");
  const inAdminLogin = pathname.startsWith("/admin/login");
  const inBizDash = pathname.startsWith("/business/dashboard");

  if (status === "unauthenticated") {
    if (inAdmin && !inAdminLogin) return "/admin/login";
    if (inBizDash) return "/business/login";
    return null;
  }

  // Authenticated — wait until the account type is resolved from /auth/me.
  if (accountType === null) return null;

  if (accountType === "admin") {
    // Confined to /admin/** — but never left parked on the admin login page.
    if (!inAdmin || inAdminLogin) return "/admin/dashboard";
    return null;
  }

  if (accountType === "business") {
    // Confined to /business/dashboard/**.
    if (!inBizDash) return "/business/dashboard";
    return null;
  }

  // Regular user: barred from both other portals.
  if (inAdmin || inBizDash) return "/";
  return null;
}
