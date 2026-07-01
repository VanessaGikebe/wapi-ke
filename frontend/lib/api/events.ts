/** Events API client — real, DB-backed events. */

import { apiFetch } from "@/lib/api/client";

export type EventStatus = "upcoming" | "ongoing" | "ended" | "archived";

export interface WapikeEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  venue: string | null;
  county: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  organizer: string | null;
  contact: string | null;
  ticketUrl: string | null;
  ticketPrice: number | null;
  currency: string;
  startDatetime: string;
  endDatetime: string | null;
  featured: boolean;
  status: EventStatus;
}

interface ApiEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  venue: string | null;
  county: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  organizer: string | null;
  contact: string | null;
  ticket_url: string | null;
  ticket_price: number | null;
  currency: string;
  start_datetime: string;
  end_datetime: string | null;
  featured: boolean;
  status: EventStatus;
}

interface ApiPaginatedEvents {
  items: ApiEvent[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function toEvent(e: ApiEvent): WapikeEvent {
  return {
    id: e.id,
    title: e.title,
    slug: e.slug,
    description: e.description,
    category: e.category,
    venue: e.venue,
    county: e.county,
    city: e.city,
    address: e.address,
    latitude: e.latitude,
    longitude: e.longitude,
    imageUrl: e.image_url,
    organizer: e.organizer,
    contact: e.contact,
    ticketUrl: e.ticket_url,
    ticketPrice: e.ticket_price,
    currency: e.currency,
    startDatetime: e.start_datetime,
    endDatetime: e.end_datetime,
    featured: e.featured,
    status: e.status,
  };
}

export interface EventFilters {
  q?: string;
  county?: string;
  category?: string;
  date?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}

export interface EventPage {
  items: WapikeEvent[];
  total: number;
  page: number;
  pages: number;
}

function buildQuery(filters: EventFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.county) params.set("county", filters.county);
  if (filters.category) params.set("category", filters.category);
  if (filters.date) params.set("date", filters.date);
  if (filters.featured != null) params.set("featured", String(filters.featured));
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  return params.toString();
}

export async function fetchUpcomingEvents(limit = 6): Promise<WapikeEvent[]> {
  const data = await apiFetch<ApiEvent[]>("/events/upcoming", {
    query: `limit=${limit}`,
  });
  return data.map(toEvent);
}

export async function fetchFeaturedEvents(limit = 6): Promise<WapikeEvent[]> {
  const data = await apiFetch<ApiEvent[]>("/events/featured", {
    query: `limit=${limit}`,
  });
  return data.map(toEvent);
}

export async function fetchEvent(slug: string): Promise<WapikeEvent> {
  const data = await apiFetch<ApiEvent>(`/events/${slug}`);
  return toEvent(data);
}

export async function fetchEvents(filters: EventFilters = {}): Promise<EventPage> {
  const data = await apiFetch<ApiPaginatedEvents>("/events", {
    query: buildQuery(filters),
  });
  return {
    items: data.items.map(toEvent),
    total: data.total,
    page: data.page,
    pages: data.pages,
  };
}

/** Presentation helpers ---------------------------------------------------- */

export function formatEventPrice(event: WapikeEvent): string {
  if (event.ticketPrice == null) return "See tickets";
  if (event.ticketPrice === 0) return "Free";
  return `${event.currency} ${event.ticketPrice.toLocaleString()}`;
}

export function formatEventDate(iso: string): { day: string; time: string } {
  const date = new Date(iso);
  return {
    day: date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
    time: date.toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

export function formatEventDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
