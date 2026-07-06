import { apiFetch } from "@/lib/api/client";
import type { Role } from "@/lib/stores/auth-store";

export interface MeResponse {
  id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
}

export function fetchMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/auth/me");
}

export function registerBusinessManager(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/auth/register-business-manager", {
    method: "POST",
  });
}

export function registerAdmin(code: string): Promise<MeResponse> {
  return apiFetch<MeResponse>("/auth/register-admin", {
    method: "POST",
    body: { code },
  });
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
