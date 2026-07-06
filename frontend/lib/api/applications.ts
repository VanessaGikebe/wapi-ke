/**
 * Business application API client (public submit + document upload) and the
 * admin review endpoints. Mirrors backend ``app/schemas/business.py``.
 */

import { apiFetch } from "@/lib/api/client";

export type BusinessType =
  | "sole_proprietorship"
  | "partnership"
  | "limited_company"
  | "ngo"
  | "cbo"
  | "cooperative"
  | "other";

export type ApplicationStatus =
  | "submitted"
  | "pending_verification"
  | "verified"
  | "verification_failed"
  | "pending_approval"
  | "more_info_requested"
  | "approved"
  | "rejected";

export type DocumentType =
  | "registration_certificate"
  | "business_logo"
  | "cover_image"
  | "national_id"
  | "business_permit"
  | "tourism_licence"
  | "ownership_proof";

export interface ApplicationPayload {
  business_email: string;
  business_name: string;
  business_type: BusinessType;
  registration_number?: string;
  kra_pin?: string;
  year_established?: number;
  owner_full_name: string;
  owner_national_id: string;
  owner_phone: string;
  owner_email: string;
  county?: string;
  town?: string;
  physical_address?: string;
  lat?: number;
  lng?: number;
  primary_category_slug: string;
  secondary_category_slug?: string;
}

export interface SubmitResponse {
  id: string;
  status: ApplicationStatus;
  message: string;
}

export interface SignedUpload {
  bucket: string;
  path: string;
  token: string;
  is_private: boolean;
}

export interface DocumentOut {
  id: string;
  doc_type: DocumentType;
  bucket: string;
  original_filename: string | null;
  content_type: string | null;
  uploaded_at: string;
}

export interface ApplicationStatusOut {
  id: string;
  business_name: string;
  status: ApplicationStatus;
  review_notes: string | null;
  created_at: string;
}

// --- Public -----------------------------------------------------------------

export function submitApplication(
  payload: ApplicationPayload,
): Promise<SubmitResponse> {
  return apiFetch<SubmitResponse>("/applications", {
    method: "POST",
    body: payload,
  });
}

export function requestUploadUrl(
  applicationId: string,
  input: { doc_type: DocumentType; filename: string; content_type?: string },
): Promise<SignedUpload> {
  return apiFetch<SignedUpload>(
    `/applications/${applicationId}/documents/sign`,
    { method: "POST", body: input },
  );
}

export function recordDocument(
  applicationId: string,
  input: {
    doc_type: DocumentType;
    bucket: string;
    storage_path: string;
    original_filename?: string;
    content_type?: string;
  },
): Promise<DocumentOut> {
  return apiFetch<DocumentOut>(`/applications/${applicationId}/documents`, {
    method: "POST",
    body: input,
  });
}

export function getApplicationStatus(
  applicationId: string,
): Promise<ApplicationStatusOut> {
  return apiFetch<ApplicationStatusOut>(`/applications/${applicationId}`);
}

// --- Admin ------------------------------------------------------------------

export interface AdminApplicationListItem {
  id: string;
  business_name: string;
  business_email: string;
  business_type: BusinessType;
  owner_full_name: string;
  county: string | null;
  town: string | null;
  status: ApplicationStatus;
  created_at: string;
}

export interface AdminApplicationDetail {
  id: string;
  business_email: string;
  business_name: string;
  business_type: BusinessType;
  registration_number: string | null;
  kra_pin: string | null;
  year_established: number | null;
  owner_full_name: string;
  owner_national_id: string;
  owner_phone: string;
  owner_email: string;
  county: string | null;
  town: string | null;
  physical_address: string | null;
  lat: number | null;
  lng: number | null;
  status: ApplicationStatus;
  review_notes: string | null;
  reviewed_at: string | null;
  business_id: string | null;
  created_at: string;
  documents: DocumentOut[];
  verification: {
    provider: string;
    status: string;
    notes: string | null;
  } | null;
}

export interface ReviewResponse {
  id: string;
  status: ApplicationStatus;
  business_id: string | null;
  activation_link: string | null;
  message: string;
}

export function fetchAdminApplications(
  status?: ApplicationStatus,
): Promise<AdminApplicationListItem[]> {
  return apiFetch<AdminApplicationListItem[]>("/admin/applications", {
    query: status ? `status=${encodeURIComponent(status)}` : undefined,
  });
}

export function fetchAdminApplication(
  id: string,
): Promise<AdminApplicationDetail> {
  return apiFetch<AdminApplicationDetail>(`/admin/applications/${id}`);
}

export function fetchDocumentUrl(
  applicationId: string,
  documentId: string,
): Promise<{ url: string; expires_in: number }> {
  return apiFetch<{ url: string; expires_in: number }>(
    `/admin/applications/${applicationId}/documents/${documentId}/url`,
  );
}

export function reviewApplication(
  id: string,
  input: { action: "approve" | "reject" | "request_info"; notes?: string },
): Promise<ReviewResponse> {
  return apiFetch<ReviewResponse>(`/admin/applications/${id}`, {
    method: "PATCH",
    body: input,
  });
}
