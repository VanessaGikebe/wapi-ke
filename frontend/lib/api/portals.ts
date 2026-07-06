import { apiFetch } from "@/lib/api/client";

export type ReviewStatus =
  | "pending_verification"
  | "approved"
  | "rejected"
  | "more_info_requested";

export type AccountRole =
  | "regular_user"
  | "business_account"
  | "moderator"
  | "administrator"
  | "super_admin";

export interface DocumentInput {
  document_type: "registration" | "ownership" | "identity" | "other";
  file_name: string;
  storage_path: string;
  mime_type?: string | null;
}

export interface BusinessApplicationInput {
  business_name: string;
  business_email: string;
  business_phone?: string;
  category: string;
  county: string;
  city?: string;
  address?: string;
  owner_name: string;
  owner_email: string;
  owner_phone?: string;
  notes?: string;
  documents: DocumentInput[];
}

export interface BusinessApplication {
  id: string;
  business_name: string;
  business_email: string;
  business_phone: string | null;
  category: string;
  county: string;
  city: string | null;
  address: string | null;
  owner_name: string;
  owner_email: string;
  owner_phone: string | null;
  notes: string | null;
  status: ReviewStatus;
  review_message: string | null;
  created_business_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessAccount {
  id: string;
  account_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  category: string;
  county: string;
  city: string | null;
  address: string | null;
  status: "pending_activation" | "active" | "suspended" | "closed";
  verification_provider: string;
  verification_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessClaimInput {
  business_id: string;
  claimant_name: string;
  claimant_email: string;
  claimant_phone?: string;
  message?: string;
  documents: DocumentInput[];
}

export interface BusinessClaim {
  id: string;
  business_id: string;
  claimant_name: string;
  claimant_email: string;
  claimant_phone: string | null;
  message: string | null;
  status: ReviewStatus;
  review_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  auth_user_id: string;
  email: string;
  display_name: string;
  account_type: "regular" | "business" | "admin";
  role: AccountRole;
  status: "active" | "pending_onboarding" | "suspended" | "disabled";
  onboarding_completed: boolean;
  mfa_required: boolean;
}

export function createBusinessApplication(payload: BusinessApplicationInput) {
  return apiFetch<BusinessApplication>("/business/applications", {
    method: "POST",
    body: payload,
  });
}

export function searchBusinesses(q: string) {
  const params = new URLSearchParams({ q });
  return apiFetch<BusinessAccount[]>("/business/directory", {
    query: params.toString(),
  });
}

export function createBusinessClaim(payload: BusinessClaimInput) {
  return apiFetch<BusinessClaim>("/business/claims", {
    method: "POST",
    body: payload,
  });
}

export function requestBusinessMagicLink(email: string) {
  return apiFetch<{ message: string }>("/business/magic-link", {
    method: "POST",
    body: { email },
  });
}

export function requestAdminMagicLink(email: string) {
  return apiFetch<{ message: string }>("/admin/magic-link", {
    method: "POST",
    body: { email },
  });
}

export function fetchBusinessMe() {
  return apiFetch<BusinessAccount>("/business/me");
}

export function completeBusinessOnboarding() {
  return apiFetch<BusinessAccount>("/business/onboarding/complete", {
    method: "POST",
  });
}

export function fetchAdminMe() {
  return apiFetch<Account>("/admin/me");
}

export function completeAdminOnboarding() {
  return apiFetch<Account>("/admin/onboarding/complete", { method: "POST" });
}

export function fetchBusinessApplications() {
  return apiFetch<BusinessApplication[]>("/admin/business-applications");
}

export function fetchBusinessClaims() {
  return apiFetch<BusinessClaim[]>("/admin/business-claims");
}

export function fetchAdminBusinesses() {
  return apiFetch<BusinessAccount[]>("/admin/businesses");
}

export function reviewBusinessApplication(
  id: string,
  action: "approve" | "reject" | "request_more_info",
  message?: string,
) {
  return apiFetch<BusinessApplication>(
    `/admin/business-applications/${id}/review`,
    { method: "POST", body: { action, message } },
  );
}

export function reviewBusinessClaim(
  id: string,
  action: "approve" | "reject" | "request_more_info",
  message?: string,
) {
  return apiFetch<BusinessClaim>(`/admin/business-claims/${id}/review`, {
    method: "POST",
    body: { action, message },
  });
}
