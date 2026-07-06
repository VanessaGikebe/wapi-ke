/** Business Manager API client (all routes require a business manager). */

import { apiFetch } from "@/lib/api/client";
import type { AdminListing, ClaimStatus, ListingStatus } from "@/lib/api/admin";

export type ManagerListing = AdminListing;

export interface ManagerClaim {
  id: string;
  experience_id: string;
  experience_title: string | null;
  manager_id: string;
  manager_email: string | null;
  message: string | null;
  status: ClaimStatus;
  created_at: string;
  reviewed_at: string | null;
}

export interface ListingCreatePayload {
  title: string;
  category_slug: string;
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  price_tier?: number;
  image_url?: string;
}

export type ListingEditPayload = Partial<ListingCreatePayload>;

export function createListing(
  payload: ListingCreatePayload,
): Promise<ManagerListing> {
  return apiFetch<ManagerListing>("/business/listings", {
    method: "POST",
    body: payload,
  });
}

export function fetchMyListings(): Promise<ManagerListing[]> {
  return apiFetch<ManagerListing[]>("/business/listings");
}

export function editListing(
  id: string,
  payload: ListingEditPayload,
): Promise<ManagerListing> {
  return apiFetch<ManagerListing>(`/business/listings/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export function submitClaim(
  experienceId: string,
  message?: string,
): Promise<ManagerClaim> {
  return apiFetch<ManagerClaim>("/business/claims", {
    method: "POST",
    body: { experience_id: experienceId, message },
  });
}

export function fetchMyClaims(): Promise<ManagerClaim[]> {
  return apiFetch<ManagerClaim[]>("/business/claims");
}

export type { ListingStatus };
