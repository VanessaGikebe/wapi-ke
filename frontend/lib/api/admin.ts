/** Admin moderation API client (all routes require an administrator). */

import { apiFetch } from "@/lib/api/client";

export type ListingStatus = "pending" | "approved" | "flagged" | "removed";
export type ReportStatus = "open" | "reviewed" | "dismissed";

export interface AdminListing {
  id: string;
  title: string;
  category_slug: string;
  location: string | null;
  image_url: string | null;
  price_tier: number;
  status: ListingStatus;
  owner_id: string | null;
  rating: number | null;
}

export interface Report {
  id: string;
  experience_id: string;
  experience_title: string | null;
  reason: string;
  reporter_email: string | null;
  status: ReportStatus;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  actor_email: string | null;
  experience_id: string | null;
  experience_title: string | null;
  action: string;
  note: string | null;
  created_at: string;
}

export function fetchAdminListings(
  status?: ListingStatus,
  q?: string,
): Promise<AdminListing[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  return apiFetch<AdminListing[]>("/admin/listings", {
    query: params.toString(),
  });
}

export function updateListingStatus(
  id: string,
  status: ListingStatus,
  note?: string,
): Promise<AdminListing> {
  return apiFetch<AdminListing>(`/admin/listings/${id}`, {
    method: "PATCH",
    body: { status, note },
  });
}

export function fetchReports(status?: ReportStatus): Promise<Report[]> {
  return apiFetch<Report[]>("/admin/reports", {
    query: status ? `status=${status}` : "",
  });
}

export function updateReport(id: string, status: ReportStatus): Promise<Report> {
  return apiFetch<Report>(`/admin/reports/${id}`, {
    method: "PATCH",
    body: { status },
  });
}

export function fetchAudit(): Promise<AuditEntry[]> {
  return apiFetch<AuditEntry[]>("/admin/audit");
}
