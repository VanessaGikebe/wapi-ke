import { apiFetch } from "@/lib/api/client";
import type { ExperienceSummary } from "@/lib/api/bookings";

export interface FavoriteItem {
  created_at: string;
  experience: ExperienceSummary;
}

/** Favorite an experience (requires auth — 401 otherwise). */
export async function addFavorite(experienceId: string): Promise<void> {
  await apiFetch(`/favorites/${experienceId}`, { method: "POST" });
}

/** Remove a favorite (requires auth). */
export async function removeFavorite(experienceId: string): Promise<void> {
  await apiFetch(`/favorites/${experienceId}`, { method: "DELETE" });
}

/** List the current user's favorites (requires auth). */
export async function fetchFavorites(): Promise<FavoriteItem[]> {
  return apiFetch<FavoriteItem[]>("/favorites");
}
