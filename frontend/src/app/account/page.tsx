"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { BackLink } from "@/components/site/back-link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { ExperienceSummary } from "@/lib/api/bookings";
import { useBookings, useFavoritesList } from "@/lib/queries/account";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "saved", label: "Saved Places" },
  { id: "bookings", label: "My Bookings" },
  { id: "settings", label: "Settings" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AccountPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1">
        <React.Suspense fallback={<AccountSkeleton />}>
          <AccountContent />
        </React.Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = useAuthStore((s) => s.status);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const rawTab = searchParams.get("tab");
  const tab: TabId = TABS.some((t) => t.id === rawTab)
    ? (rawTab as TabId)
    : "profile";

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?redirect=/account");
    }
  }, [status, router]);

  const bookings = useBookings(isAuthenticated);
  const favorites = useFavoritesList(isAuthenticated);

  const setTab = (id: TabId) =>
    router.replace(`/account?tab=${id}`, { scroll: false });

  return (
    <>
      <section className="mx-auto max-w-container-max px-margin-mobile pb-8 pt-16 md:px-margin-desktop md:pb-10 md:pt-24">
        <BackLink href="/" label="Back to Home" className="mb-6" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-2 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
              My Account
            </h1>
            {user && (
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                Welcome back, {user.name.split(" ")[0]}.
              </p>
            )}
          </div>
          {isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void logout();
                router.push("/");
              }}
            >
              Sign out
            </Button>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-container-max px-margin-mobile pb-section-mobile md:px-margin-desktop md:pb-section">
        {!isAuthenticated ? (
          <div className="flex flex-col gap-6">
            <Skeleton className="h-8 w-64" />
            <ListSkeleton />
          </div>
        ) : (
          <>
            <div
              role="tablist"
              aria-label="Account sections"
              className="mb-8 flex gap-1 overflow-x-auto border-b border-surface-variant"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "transition-subtle -mb-px shrink-0 border-b-2 px-3 pb-3 font-label-md text-label-md uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                    tab === t.id
                      ? "border-primary text-primary"
                      : "border-transparent text-on-surface-variant hover:text-primary",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
            >
              {tab === "profile" && user && (
                <ProfilePanel name={user.name} email={user.email} />
              )}
              {tab === "saved" && <SavedPanel query={favorites} />}
              {tab === "bookings" && <BookingsPanel query={bookings} />}
              {tab === "settings" && (
                <SettingsPanel
                  onSignOut={() => {
                    void logout();
                    router.push("/");
                  }}
                />
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}

function ProfilePanel({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex max-w-xl flex-col gap-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary font-headline-sm text-headline-sm text-on-primary"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <div>
          <h2 className="font-headline-sm text-headline-sm text-primary">
            {name}
          </h2>
          <Badge variant="subtle" className="mt-1">
            Member
          </Badge>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" value={name} />
        <Field label="Email" value={email} />
      </dl>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-label-md text-label-md uppercase text-on-surface-variant">
        {label}
      </dt>
      <dd className="mt-1 font-body-md text-body-md text-on-surface">
        {value}
      </dd>
    </div>
  );
}

function SettingsPanel({ onSignOut }: { onSignOut: () => void }) {
  const [prefs, setPrefs] = React.useState({
    confirmations: true,
    reminders: true,
    recommendations: false,
  });
  const toggle = (key: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const rows: { key: keyof typeof prefs; label: string }[] = [
    { key: "confirmations", label: "Booking confirmations" },
    { key: "reminders", label: "Booking reminders" },
    { key: "recommendations", label: "New recommendations" },
  ];

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          Notifications
        </h2>
        <ul className="flex flex-col divide-y divide-surface-variant">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <span className="font-body-md text-body-md text-on-surface">
                {row.label}
              </span>
              <Switch
                checked={prefs[row.key]}
                onCheckedChange={() => toggle(row.key)}
                aria-label={row.label}
              />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <Button variant="outline" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

function ExperienceRow({
  experience,
  trailing,
}: {
  experience: ExperienceSummary;
  trailing?: React.ReactNode;
}) {
  const meta = [
    experience.location,
    "$".repeat(experience.price_tier),
    experience.category_slug.replace(/-/g, " "),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <Link
        href={`/experiences/${experience.id}`}
        className="transition-subtle flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-tonal hover:shadow-tonal-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <div className="min-w-0">
          <h3 className="truncate font-headline-sm text-headline-sm text-primary">
            {experience.title}
          </h3>
          <p className="mt-1 font-caption text-caption uppercase tracking-wide text-on-surface-variant">
            {meta}
          </p>
        </div>
        {trailing}
      </Link>
    </li>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center">
      <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">
        {message}
      </p>
      <Link
        href="/categories"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Browse Categories
      </Link>
    </div>
  );
}

function BookingsPanel({ query }: { query: ReturnType<typeof useBookings> }) {
  if (query.isLoading) return <ListSkeleton />;
  if (query.isError) return <PanelError onRetry={() => query.refetch()} />;
  const bookings = query.data ?? [];
  if (bookings.length === 0) {
    return (
      <EmptyState message="No bookings yet. Find an experience and request a booking — no payment needed yet." />
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {bookings.map((booking) => (
        <ExperienceRow
          key={booking.id}
          experience={booking.experience}
          trailing={
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant="accent">{booking.status}</Badge>
              {booking.requested_date && (
                <span className="font-caption text-caption text-on-surface-variant">
                  {booking.requested_date}
                </span>
              )}
            </div>
          }
        />
      ))}
    </ul>
  );
}

function SavedPanel({ query }: { query: ReturnType<typeof useFavoritesList> }) {
  if (query.isLoading) return <ListSkeleton />;
  if (query.isError) return <PanelError onRetry={() => query.refetch()} />;
  const favorites = query.data ?? [];
  if (favorites.length === 0) {
    return (
      <EmptyState message="No saved places yet. Tap the heart on any experience to save it here." />
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {favorites.map((favorite) => (
        <ExperienceRow
          key={favorite.experience.id}
          experience={favorite.experience}
        />
      ))}
    </ul>
  );
}

function PanelError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center">
      <p className="font-body-md text-body-md text-on-surface-variant">
        Couldn&apos;t load this just now.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <Skeleton className="h-20 w-full rounded-xl" />
        </li>
      ))}
    </ul>
  );
}

function AccountSkeleton() {
  return (
    <div className="mx-auto max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
      <Skeleton className="mb-8 h-10 w-64" />
      <ListSkeleton />
    </div>
  );
}
