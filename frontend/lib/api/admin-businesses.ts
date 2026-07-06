/** Admin Businesses API client (verified/live businesses). */

import { apiFetch } from "@/lib/api/client";
import type { DocumentOut } from "@/lib/api/applications";

export type BusinessStatus = "approved" | "suspended" | "archived";

export interface AdminBusiness {
  id: string;
  name: string;
  business_type: string;
  status: BusinessStatus;
  is_verified: boolean;
  verified_at: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  town: string | null;
  county: string | null;
  listing_count: number;
}

export interface AdminBusinessDetail extends AdminBusiness {
  registration_number: string | null;
  kra_pin: string | null;
  physical_address: string | null;
  source: string;
}

export interface OwnershipHistoryItem {
  user_name: string | null;
  user_email: string | null;
  role: string;
  since: string;
  source: string;
}

export function fetchBusinesses(
  status?: BusinessStatus,
  q?: string,
): Promise<AdminBusiness[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  return apiFetch<AdminBusiness[]>("/admin/businesses", {
    query: params.toString(),
  });
}

export function fetchBusiness(id: string): Promise<AdminBusinessDetail> {
  return apiFetch<AdminBusinessDetail>(`/admin/businesses/${id}`);
}

export function businessAction(
  id: string,
  action: "suspend" | "archive" | "reopen",
  note?: string,
): Promise<{ id: string; status: BusinessStatus; message: string }> {
  return apiFetch(`/admin/businesses/${id}`, {
    method: "PATCH",
    body: { action, note },
  });
}

export function fetchBusinessDocuments(
  id: string,
): Promise<{ source: string; documents: DocumentOut[] }> {
  return apiFetch(`/admin/businesses/${id}/documents`);
}

export function fetchBusinessDocumentUrl(
  id: string,
  documentId: string,
): Promise<{ url: string; expires_in: number }> {
  return apiFetch(`/admin/businesses/${id}/documents/${documentId}/url`);
}

export function fetchOwnershipHistory(
  id: string,
): Promise<OwnershipHistoryItem[]> {
  return apiFetch(`/admin/businesses/${id}/ownership-history`);
}
