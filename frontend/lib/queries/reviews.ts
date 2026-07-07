import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createReview, fetchReviews } from "@/lib/api/reviews";

export function useReviews(experienceId: string, enabled = true) {
  return useQuery({
    queryKey: ["reviews", experienceId],
    queryFn: () => fetchReviews(experienceId),
    enabled: enabled && Boolean(experienceId),
  });
}

export function useCreateReview(experienceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { rating: number; text: string | null }) =>
      createReview(experienceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", experienceId] });
    },
  });
}
