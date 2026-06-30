import { create } from "zustand";

/**
 * Favorite state (Zustand). There's no "list favorites" endpoint yet, so this
 * tracks which experiences the user has favorited this session (in memory).
 *
 * `pendingFavoriteId` carries a favorite the user attempted while logged out:
 * the card stashes it before redirecting to /login, and after a successful
 * login the AuthInitializer replays it (POST /favorites) so the user lands
 * back on the listing with the favorite applied.
 */
export interface FavoritesState {
  favorites: Record<string, boolean>;
  pendingFavoriteId: string | null;
  setFavorited: (experienceId: string, value: boolean) => void;
  setPendingFavorite: (experienceId: string) => void;
  clearPendingFavorite: () => void;
  reset: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set) => ({
  favorites: {},
  pendingFavoriteId: null,
  setFavorited: (experienceId, value) =>
    set((state) => ({
      favorites: { ...state.favorites, [experienceId]: value },
    })),
  setPendingFavorite: (experienceId) =>
    set({ pendingFavoriteId: experienceId }),
  clearPendingFavorite: () => set({ pendingFavoriteId: null }),
  reset: () => set({ favorites: {}, pendingFavoriteId: null }),
}));
