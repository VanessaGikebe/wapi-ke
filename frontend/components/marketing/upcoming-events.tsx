"use client";

import Link from "next/link";

import { AutoScrollRow } from "@/components/categories/personalized-sections";
import { EventCard } from "@/components/events/event-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpcomingEvents } from "@/lib/queries/events";
import { cn } from "@/lib/utils";

// Matches the card cell sizing used by the personalized carousels.
const CELL = "w-[78vw] max-w-[300px] shrink-0 sm:w-[300px]";

/**
 * Upcoming Events homepage section. Renders as the same horizontal auto-scroll
 * carousel as the personalized rows, and collapses entirely when there are no
 * events (so the heading isn't stranded above empty space).
 */
export function UpcomingEvents() {
  const { data, isLoading, isError } = useUpcomingEvents(6);

  if (!isLoading && (isError || !data || data.length === 0)) return null;

  return (
    <section className="bg-surface px-margin-mobile pt-section-mobile md:px-margin-desktop md:pt-section">
      <div className="mx-auto max-w-container-max">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
          <div>
            <Badge variant="accent" className="mb-3">
              What&apos;s on
            </Badge>
            <h2 className="font-headline-md text-headline-md text-primary">
              Upcoming Events
            </h2>
            <p className="mt-2 max-w-xl font-body-md text-body-md text-on-surface-variant">
              A fresh line-up at Kenya&apos;s top-rated venues — updated every
              week.
            </p>
          </div>
          <Link
            href="/events"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "shrink-0",
            )}
          >
            All Events
          </Link>
        </div>

        {isLoading ? (
          <ul className="scrollbar-hide flex gap-gutter overflow-x-auto pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className={cn(CELL, "flex flex-col gap-4")}>
                <Skeleton className="aspect-[16/10] w-full rounded-xl" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </li>
            ))}
          </ul>
        ) : (
          <AutoScrollRow>
            {data!.map((event) => (
              <li key={event.id} className={CELL}>
                <EventCard event={event} />
              </li>
            ))}
          </AutoScrollRow>
        )}
      </div>
    </section>
  );
}
