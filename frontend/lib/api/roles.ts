import { apiFetch } from "@/lib/api/client";
import type { AccountType, AdminRole } from "@/lib/stores/auth-store";

export interface MeResponse {
  id: string;
  email: string;
  name: string;
  // Account type is assigned server-side only — never self-service.
  account_type: AccountType;
  admin_role: AdminRole | null;
  created_at: string;
}

export function fetchMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/auth/me");
}

export function reportExperience(
  experienceId: string,
  reason: string,
): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>(`/experiences/${experienceId}/report`, {
    method: "POST",
    body: { reason },
  });
}
