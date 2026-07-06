"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Brand } from "@/components/site/brand";
import { useAuthStore, type AccountType } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

/**
 * A self-contained portal layout: independent sidebar navigation + header, with
 * its own auth gate. Used by the Business and Admin portals — deliberately NOT
 * the public site chrome. Portal confinement (redirects) is handled globally by
 * {@link PortalGuard}; this shell just avoids rendering portal content until the
 * correct account type is confirmed.
 */
export function PortalShell({
  accountType,
  portalName,
  nav,
  children,
}: {
  accountType: Exclude<AccountType, "user">;
  portalName: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const current = useAuthStore((s) => s.accountType);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const ready = status === "authenticated" && current === accountType;

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface font-body-md text-body-md text-on-surface-variant">
        Loading…
      </div>
    );
  }

  const isActive = (href: string) =>
    href === pathname ||
    (href !== nav[0].href && pathname.startsWith(href + "/")) ||
    href === pathname;

  return (
    <div className="min-h-screen bg-surface-container-low md:grid md:grid-cols-[16rem_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="hidden border-r border-outline-variant bg-surface-container-lowest md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-outline-variant px-6">
          <Brand wordmarkClassName="text-xl" />
          <span className="font-caption text-caption uppercase tracking-wider text-secondary">
            {portalName}
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-0.5">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 font-label-md text-label-md transition-subtle",
                    isActive(item.href)
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary",
                  )}
                >
                  <span aria-hidden className="material-symbols-outlined text-[20px]">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-outline-variant p-3">
          <button
            type="button"
            onClick={() => {
              void logout();
              router.push("/");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 font-label-md text-label-md text-on-surface-variant transition-subtle hover:bg-surface-container-high hover:text-error"
          >
            <span aria-hidden className="material-symbols-outlined text-[20px]">
              logout
            </span>
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <header className="flex h-16 items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-lowest px-4 md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Brand wordmarkClassName="text-lg" />
            <span className="font-caption text-caption uppercase tracking-wider text-secondary">
              {portalName}
            </span>
          </div>
          <span className="hidden font-body-md text-body-md text-on-surface-variant md:block">
            {portalName} Portal
          </span>
          <span className="truncate font-label-md text-label-md text-on-surface">
            {user?.email}
          </span>
        </header>

        {/* Mobile nav (horizontal) */}
        <nav className="flex gap-1 overflow-x-auto border-b border-outline-variant bg-surface-container-lowest px-2 py-2 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 font-caption text-caption",
                isActive(item.href)
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}

/** Standard page header inside a portal. */
export function PortalPageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="font-display-lg-mobile text-display-lg-mobile text-primary md:font-headline-lg md:text-headline-lg">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
          {subtitle}
        </p>
      )}
    </div>
  );
}
