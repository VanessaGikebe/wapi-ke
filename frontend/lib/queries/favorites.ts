import { useMutation } from "@tanstack/react-query";

import { addFavorite, removeFavorite } from "@/lib/api/favorites";
import { useFavoritesStore } from "@/lib/stores/favorites-store";

interface ToggleVars {
  id: string;
  favorite: boolean;
}

/**
 * Toggle a favorite on/off via the API, optimistically updating the favorites
 * store and reverting on error.
 */
export function useToggleFavorite() {
  const setFavorited = useFavoritesStore((s) => s.setFavorited);

  return useMutation({
    mutationFn: ({ id, favorite }: ToggleVars) =>
      favorite ? addFavorite(id) : removeFavorite(id),
    onMutate: ({ id, favorite }: ToggleVars) => {
      const previous = useFavoritesStore.getState().favorites[id] ?? false;
      setFavorited(id, favorite);
      return { id, previous };
    },
    onError: (_error, _vars, context) => {
      if (context) setFavorited(context.id, context.previous);
    },
  });
}
