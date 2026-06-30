import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createBooking, fetchBookings } from "@/lib/api/bookings";
import { fetchFavorites } from "@/lib/api/favorites";

export function useBookings(enabled: boolean) {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: fetchBookings,
    enabled,
  });
}

export function useFavoritesList(enabled: boolean) {
  return useQuery({
    queryKey: ["favorites", "list"],
    queryFn: fetchFavorites,
    enabled,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      experienceId,
      requestedDate,
    }: {
      experienceId: string;
      requestedDate: string | null;
    }) => createBooking(experienceId, requestedDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}
