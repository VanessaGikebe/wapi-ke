import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchPreferenceProfile,
  fetchRecommendations,
  recordInteraction,
  savePreferenceProfile,
  type InteractionInput,
  type PreferenceProfileInput,
} from "@/lib/api/personalization";

export function usePreferenceProfile(enabled: boolean) {
  return useQuery({
    queryKey: ["preference-profile"],
    queryFn: fetchPreferenceProfile,
    enabled,
    retry: false,
  });
}

export function useSavePreferenceProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PreferenceProfileInput) => savePreferenceProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(["preference-profile"], profile);
      void queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
}

export function useRecommendations(
  categorySlug: string,
  filterQuery: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["recommendations", categorySlug, filterQuery],
    queryFn: () => fetchRecommendations(categorySlug, filterQuery),
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}

export function useRecordInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InteractionInput) => recordInteraction(input),
    onSuccess: (_data, input) => {
      if (input.interactionType === "not_interested") {
        void queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      }
    },
  });
}
