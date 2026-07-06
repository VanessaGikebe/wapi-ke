"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

import { Brand } from "./brand";
import { NotificationsMenu } from "./notifications-menu";
import { UserMenu } from "./user-menu";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Categories", href: "/categories" },
  { label: "Events", href: "/events" },
  { label: "AI Assistant", href: "/assistant" },
  { label: "Business", href: "/business" },
  { label: "Account", href: "/account" },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

/**
 * Shared, auth-aware top navigation. Logged out: a Sign In button. Logged in:
 * a notifications bell + a user menu. Mobile collapses the nav into a panel.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-surface-variant bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-container-max items-center justify-between px-margin-mobile md:px-margin-desktop">
        <Link href="/" aria-label="wapiKE home" className={cn("rounded", focusRing)}>
          <Brand wordmarkClassName="text-[26px] md:text-display-lg" />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 font-label-md text-label-md uppercase tracking-wider md:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "transition-subtle rounded hover:text-secondary",
                isActive(link.href)
                  ? "text-primary"
                  : "text-on-surface-variant",
                focusRing,
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          {isAuthenticated ? (
            <>
              <div className="hidden sm:block">
                <NotificationsMenu />
              </div>
              <UserMenu />
            </>
          ) : (
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden sm:inline-flex",
              )}
            >
              Sign In
            </Link>
          )}

          <button
            type="button"
            aria-label="Menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
            className={cn(
              "transition-subtle flex h-10 w-10 items-center justify-center rounded-full text-primary hover:bg-surface-container-high md:hidden",
              focusRing,
            )}
          >
            <span aria-hidden className="material-symbols-outlined">
              {mobileOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Primary"
          className="flex flex-col gap-1 border-t border-surface-variant bg-surface px-margin-mobile py-3 md:hidden"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "transition-subtle rounded px-2 py-3 font-label-md text-label-md uppercase tracking-wider",
                isActive(link.href)
                  ? "text-primary"
                  : "text-on-surface-variant",
              )}
            >
              {link.label}
            </Link>
          ))}
          {!isAuthenticated && (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className={cn(
                buttonVariants({ variant: "primary", size: "sm" }),
                "mt-2",
              )}
            >
              Sign In
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
