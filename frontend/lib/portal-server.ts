import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchWithSession<T>(path: string): Promise<T | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export async function requireBusinessPortal() {
  const business = await fetchWithSession<{ id: string }>("/business/me");
  if (!business) redirect("/business/login");
  return business;
}

export async function requireAdminPortal() {
  const admin = await fetchWithSession<{ id: string }>("/admin/me");
  if (!admin) redirect("/admin/login");
  return admin;
}
