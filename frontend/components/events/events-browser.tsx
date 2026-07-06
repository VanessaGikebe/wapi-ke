"use client";

import * as React from "react";

import { EventCard } from "@/components/events/event-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvents } from "@/lib/queries/events";
import { useRecordInteraction } from "@/lib/queries/personalization";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Music",
  "Culture",
  "Sports",
  "Food",
  "Arts",
  "Lifestyle",
  "Expo",
];
const COUNTIES = ["Nairobi", "Nakuru", "Narok", "Lamu", "Kilifi", "Kwale"];

export function EventsBrowser() {
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState<string | null>(null);
  const [county, setCounty] = React.useState<string | null>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const recordInteraction = useRecordInteraction();

  const query = useEvents({
    q: q.trim() || undefined,
    category: category ?? undefined,
    county: county ?? undefined,
    limit: 24,
  });

  const events = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  React.useEffect(() => {
    const search = q.trim();
    if (!isAuthenticated || search.length < 3) return;
    const timeout = window.setTimeout(() => {
      recordInteraction.mutate({
        interactionType: "search",
        searchQuery: search,
        weight: 3,
        context: { surface: "events", category, county },
      });
    }, 800);
    return () => window.clearTimeout(timeout);
    // recordInteraction is intentionally omitted so stable searches record once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, county, isAuthenticated, q]);

  return (
    <>
      <div className="flex flex-col gap-4">
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search events by title, venue, county, category or organizer…"
          aria-label="Search events"
        />
        <ChipRow
          label="Category"
          options={CATEGORIES}
          value={category}
          onChange={setCategory}
        />
        <ChipRow
          label="County"
          options={COUNTIES}
          value={county}
          onChange={setCounty}
        />
      </div>

      <p className="mb-6 mt-6 font-caption text-caption uppercase tracking-wide text-on-surface-variant">
        {query.isLoading ? "Loading…" : `${total} ${total === 1 ? "event" : "events"}`}
      </p>

      {query.isLoading ? (
        <EventsGridSkeleton />
      ) : events.length > 0 ? (
        <ul
          className={cn(
            "grid grid-cols-1 gap-gutter transition-opacity sm:grid-cols-2 xl:grid-cols-3",
            query.isFetching && "opacity-60",
          )}
        >
          {events.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-20 text-center">
          <p className="font-headline-sm text-headline-sm text-primary">
            No events found
          </p>
          <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">
            Try a different search or clear the filters.
          </p>
        </div>
      )}
    </>
  );
}

function ChipRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 font-label-md text-label-md uppercase text-on-surface-variant">
        {label}
      </span>
      {options.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : option)}
            className={cn(
              "transition-subtle rounded-full border px-3 py-1.5 font-caption text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              active
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function EventsGridSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex flex-col gap-4">
          <Skeleton className="aspect-[16/10] w-full rounded-xl" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </li>
      ))}
    </ul>
  );
}
