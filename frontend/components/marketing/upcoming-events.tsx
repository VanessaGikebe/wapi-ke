"use client";

import Link from "next/link";

import { EventCard } from "@/components/events/event-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpcomingEvents } from "@/lib/queries/events";
import { cn } from "@/lib/utils";

/**
 * Upcoming Events homepage section. Owns its own header + wrapper so it can
 * collapse entirely when there are no events — otherwise the heading would be
 * left stranded above the section's bottom padding (an awkward empty gap).
 */
export function UpcomingEvents() {
  const { data, isLoading, isError } = useUpcomingEvents(6);

  // Nothing to show (and not still loading) → render nothing at all.
  if (!isLoading && (isError || !data || data.length === 0)) return null;

  return (
    <section className="bg-surface px-margin-mobile pb-section-mobile md:px-margin-desktop md:pb-section">
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

        <ul className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="flex flex-col gap-4">
                  <Skeleton className="aspect-[16/10] w-full rounded-xl" />
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </li>
              ))
            : data!.map((event) => (
                <li key={event.id}>
                  <EventCard event={event} />
                </li>
              ))}
        </ul>
      </div>
    </section>
  );
}
