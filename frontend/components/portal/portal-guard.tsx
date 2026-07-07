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
 * This is a **wrapper**: when the current account is confirmed to be in the
 * wrong portal it withholds the mismatched page while the redirect lands. It
 * deliberately does NOT blank the page while the account type is still being
 * resolved from /auth/me — doing so would white-screen the whole app for every
 * logged-in user whenever the API is slow or unreachable. The worst case here
 * is a brief flash of the public page for an admin/business account before the
 * redirect fires, which is far preferable to an unavailable app.
 */
export function PortalGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const accountType = useAuthStore((s) => s.accountType);

  const redirectTo = confinementRedirect(pathname, status, accountType);

  React.useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  // Only withhold the page when we KNOW the account is in the wrong portal and
  // a redirect is in flight (confinementRedirect returns non-null only once the
  // account type is resolved). Otherwise always render — never block on an
  // unresolved account type.
  if (redirectTo) return null;

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
