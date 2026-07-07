"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { PortalPageHeader } from "@/components/portal/portal-shell";
import { fetchBusinesses } from "@/lib/api/admin-businesses";
import { fetchAdminApplications } from "@/lib/api/applications";
import { fetchAdminClaims } from "@/lib/api/claims";
import { cn } from "@/lib/utils";

// Applications/claims still awaiting an admin decision (i.e. "to review").
const PENDING_APPLICATION = new Set([
  "submitted",
  "pending_verification",
  "verified",
  "pending_approval",
  "more_info_requested",
]);
const PENDING_CLAIM = new Set(["pending", "more_info_requested"]);

export default function AdminDashboardPage() {
  const applications = useQuery({
    queryKey: ["admin", "applications", "all"],
    queryFn: () => fetchAdminApplications(),
  });
  const claims = useQuery({
    queryKey: ["admin", "claims", "all"],
    queryFn: () => fetchAdminClaims(),
  });
  const businesses = useQuery({
    queryKey: ["admin", "businesses", "all"],
    queryFn: () => fetchBusinesses(),
  });

  const appsPending = (applications.data ?? []).filter((a) =>
    PENDING_APPLICATION.has(a.status),
  ).length;
  const claimsPending = (claims.data ?? []).filter((c) =>
    PENDING_CLAIM.has(c.status),
  ).length;

  const cards = [
    {
      href: "/admin/dashboard/applications",
      icon: "assignment",
      label: "Businesses to Review",
      value: appsPending,
      sub: `${(applications.data ?? []).length} total applications`,
      loading: applications.isLoading,
      accent: true,
    },
    {
      href: "/admin/dashboard/claims",
      icon: "verified_user",
      label: "Claims to Review",
      value: claimsPending,
      sub: `${(claims.data ?? []).length} total claims`,
      loading: claims.isLoading,
      accent: claimsPending > 0,
    },
    {
      href: "/admin/dashboard/businesses",
      icon: "storefront",
      label: "Live Businesses",
      value: (businesses.data ?? []).length,
      sub: "Manage listings, permits & status",
      loading: businesses.isLoading,
      accent: false,
    },
  ];

  return (
    <>
      <PortalPageHeader
        title="Admin Dashboard"
        subtitle="Review new business applications, verify ownership claims, and manage live businesses."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={cn(
              "group flex flex-col gap-4 rounded-2xl border p-6 transition-subtle hover:shadow-tonal",
              card.accent
                ? "border-primary/40 bg-primary/5 hover:border-primary"
                : "border-outline-variant bg-surface-container-lowest hover:border-primary/40",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "material-symbols-outlined text-[28px]",
                card.accent ? "text-primary" : "text-on-surface-variant",
              )}
            >
              {card.icon}
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-display-lg-mobile text-display-lg-mobile text-primary">
                {card.loading ? "…" : card.value}
              </p>
              <p className="font-label-lg text-label-lg text-on-surface">
                {card.label}
              </p>
              <p className="font-caption text-caption text-on-surface-variant">
                {card.sub}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
