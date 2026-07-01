import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchEvent,
  fetchEvents,
  fetchFeaturedEvents,
  fetchUpcomingEvents,
  type EventFilters,
} from "@/lib/api/events";

export function useUpcomingEvents(limit = 6) {
  return useQuery({
    queryKey: ["events", "upcoming", limit],
    queryFn: () => fetchUpcomingEvents(limit),
  });
}

export function useFeaturedEvents(limit = 6) {
  return useQuery({
    queryKey: ["events", "featured", limit],
    queryFn: () => fetchFeaturedEvents(limit),
  });
}

export function useEvent(slug: string) {
  return useQuery({
    queryKey: ["event", slug],
    queryFn: () => fetchEvent(slug),
    enabled: Boolean(slug),
  });
}

export function useEvents(filters: EventFilters) {
  return useQuery({
    queryKey: ["events", "list", filters],
    queryFn: () => fetchEvents(filters),
    placeholderData: keepPreviousData,
  });
}
