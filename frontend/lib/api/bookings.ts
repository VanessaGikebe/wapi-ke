import { apiFetch } from "@/lib/api/client";

export interface ExperienceSummary {
  id: string;
  title: string;
  location: string | null;
  price_tier: number;
  category_slug: string;
  attributes: Record<string, unknown>;
}

export interface Booking {
  id: string;
  status: string;
  requested_date: string | null;
  created_at: string;
  experience: ExperienceSummary;
}

/** Create a booking (status "requested"). Requires auth. */
export async function createBooking(
  experienceId: string,
  requestedDate: string | null,
): Promise<Booking> {
  return apiFetch<Booking>("/bookings", {
    method: "POST",
    body: { experience_id: experienceId, requested_date: requestedDate },
  });
}

export async function fetchBookings(): Promise<Booking[]> {
  return apiFetch<Booking[]>("/bookings");
}
