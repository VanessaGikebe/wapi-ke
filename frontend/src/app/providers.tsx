"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { DiscoverVibeOnboarding } from "@/components/personalization/discover-vibe-onboarding";
import { PortalGuard } from "@/components/portal/portal-guard";
import { addFavorite, fetchFavorites } from "@/lib/api/favorites";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useFavoritesStore } from "@/lib/stores/favorites-store";

/**
 * Restores the session from the refresh cookie on load, and replays a
 * "pending favorite" once the user becomes authenticated (the favorite they
 * attempted while logged out, before the login redirect).
 */
function AuthInitializer() {
  const initialize = useAuthStore((s) => s.initialize);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pendingFavoriteId = useFavoritesStore((s) => s.pendingFavoriteId);
  const setFavorited = useFavoritesStore((s) => s.setFavorited);
  const clearPendingFavorite = useFavoritesStore((s) => s.clearPendingFavorite);

  React.useEffect(() => {
    void initialize();
  }, [initialize]);

  // Hydrate the favorites set once authenticated so saved hearts persist
  // across reloads.
  React.useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    fetchFavorites()
      .then((items) => {
        if (cancelled) return;
        for (const item of items) setFavorited(item.experience.id, true);
      })
      .catch(() => {
        // ignore — hearts just won't be pre-filled
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setFavorited]);

  React.useEffect(() => {
    if (!isAuthenticated || !pendingFavoriteId) return;
    const id = pendingFavoriteId;
    clearPendingFavorite();
    addFavorite(id)
      .then(() => setFavorited(id, true))
      .catch(() => {
        // leave it unfavorited if the replay fails
      });
  }, [isAuthenticated, pendingFavoriteId, setFavorited, clearPendingFavorite]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      <PortalGuard />
      <DiscoverVibeOnboarding />
      {children}
    </QueryClientProvider>
  );
}
