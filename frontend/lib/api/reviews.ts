import { apiFetch } from "@/lib/api/client";

export interface Review {
  id: string;
  rating: number;
  text: string | null;
  author_name: string;
  created_at: string;
}

/** Public list of first-party reviews for an experience, newest first. */
export async function fetchReviews(experienceId: string): Promise<Review[]> {
  return apiFetch<Review[]>(`/experiences/${experienceId}/reviews`);
}

/** Leave (or update) the current user's review. Requires auth. */
export async function createReview(
  experienceId: string,
  input: { rating: number; text: string | null },
): Promise<Review> {
  return apiFetch<Review>(`/experiences/${experienceId}/reviews`, {
    method: "POST",
    body: { rating: input.rating, text: input.text },
  });
}
