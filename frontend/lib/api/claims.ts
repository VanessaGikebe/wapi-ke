/**
 * Business claim API client (public search + submit + proof upload) and the
 * admin claim-review endpoints. Mirrors backend ``app/schemas/claim.py``.
 */

import { apiFetch } from "@/lib/api/client";
import type { DocumentOut, DocumentType, SignedUpload } from "@/lib/api/applications";

export type ClaimStatus =
  | "pending"
  | "more_info_requested"
  | "approved"
  | "rejected";

export interface BusinessSearchItem {
  id: string;
  title: string;
  location: string | null;
  category_slug: string;
  image_url: string | null;
}

export interface ClaimPayload {
  experience_id: string;
  claimant_name: string;
  claimant_email: string;
  claimant_phone?: string;
  claimant_national_id?: string;
  message?: string;
}

export interface ClaimSubmitResponse {
  id: string;
  status: ClaimStatus;
  message: string;
}

// --- Public -----------------------------------------------------------------

export function searchBusinesses(q: string): Promise<BusinessSearchItem[]> {
  return apiFetch<BusinessSearchItem[]>("/claims/search", {
    query: `q=${encodeURIComponent(q)}`,
  });
}

export function submitClaim(payload: ClaimPayload): Promise<ClaimSubmitResponse> {
  return apiFetch<ClaimSubmitResponse>("/claims", {
    method: "POST",
    body: payload,
  });
}

export function requestClaimUploadUrl(
  claimId: string,
  input: { doc_type: DocumentType; filename: string; content_type?: string },
): Promise<SignedUpload> {
  return apiFetch<SignedUpload>(`/claims/${claimId}/documents/sign`, {
    method: "POST",
    body: input,
  });
}

export function recordClaimDocument(
  claimId: string,
  input: {
    doc_type: DocumentType;
    bucket: string;
    storage_path: string;
    original_filename?: string;
    content_type?: string;
  },
): Promise<DocumentOut> {
  return apiFetch<DocumentOut>(`/claims/${claimId}/documents`, {
    method: "POST",
    body: input,
  });
}

// --- Admin ------------------------------------------------------------------

export interface AdminClaimListItem {
  id: string;
  claimant_name: string;
  claimant_email: string;
  listing_title: string | null;
  status: ClaimStatus;
  created_at: string;
}

export interface AdminClaimDetail {
  id: string;
  experience_id: string | null;
  listing_title: string | null;
  listing_location: string | null;
  claimant_name: string;
  claimant_email: string;
  claimant_phone: string | null;
  claimant_national_id: string | null;
  message: string | null;
  status: ClaimStatus;
  review_notes: string | null;
  reviewed_at: string | null;
  business_id: string | null;
  created_at: string;
  documents: DocumentOut[];
}

export interface ClaimReviewResponse {
  id: string;
  status: ClaimStatus;
  business_id: string | null;
  activation_link: string | null;
  message: string;
}

export function fetchAdminClaims(
  status?: ClaimStatus,
): Promise<AdminClaimListItem[]> {
  return apiFetch<AdminClaimListItem[]>("/admin/claims", {
    query: status ? `status=${encodeURIComponent(status)}` : undefined,
  });
}

export function fetchAdminClaim(id: string): Promise<AdminClaimDetail> {
  return apiFetch<AdminClaimDetail>(`/admin/claims/${id}`);
}

export function fetchClaimDocumentUrl(
  claimId: string,
  documentId: string,
): Promise<{ url: string; expires_in: number }> {
  return apiFetch<{ url: string; expires_in: number }>(
    `/admin/claims/${claimId}/documents/${documentId}/url`,
  );
}

export function reviewClaim(
  id: string,
  input: { action: "approve" | "reject" | "request_info"; notes?: string },
): Promise<ClaimReviewResponse> {
  return apiFetch<ClaimReviewResponse>(`/admin/claims/${id}`, {
    method: "PATCH",
    body: input,
  });
}
