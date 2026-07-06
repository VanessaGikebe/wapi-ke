"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuthStore } from "@/lib/stores/auth-store";

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
 */
export function PortalGuard() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const accountType = useAuthStore((s) => s.accountType);

  React.useEffect(() => {
    if (status === "idle" || status === "loading") return;

    const inAdmin = pathname.startsWith("/admin");
    const inAdminLogin = pathname.startsWith("/admin/login");
    const inBizDash = pathname.startsWith("/business/dashboard");

    if (status === "unauthenticated") {
      if (inAdmin && !inAdminLogin) router.replace("/admin/login");
      else if (inBizDash) router.replace("/business/login");
      return;
    }

    // Authenticated — wait until the account type is resolved from /auth/me.
    if (accountType === null) return;

    if (accountType === "admin") {
      if (!inAdmin) router.replace("/admin/dashboard");
      else if (inAdminLogin) router.replace("/admin/dashboard");
    } else if (accountType === "business") {
      if (!inBizDash) router.replace("/business/dashboard");
    } else {
      // Regular user: barred from both other portals.
      if (inAdmin) router.replace("/");
      else if (inBizDash) router.replace("/");
    }
  }, [pathname, status, accountType, router]);

  return null;
}
