"use client";

import { EventCard } from "@/components/events/event-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpcomingEvents } from "@/lib/queries/events";

export function UpcomingEvents() {
  const { data, isLoading, isError } = useUpcomingEvents(6);

  if (isLoading) {
    return (
      <ul className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="flex flex-col gap-4">
            <Skeleton className="aspect-[16/10] w-full rounded-xl" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </li>
        ))}
      </ul>
    );
  }

  if (isError || !data || data.length === 0) return null;

  return (
    <ul className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
      {data.map((event) => (
        <li key={event.id}>
          <EventCard event={event} />
        </li>
      ))}
    </ul>
  );
}
