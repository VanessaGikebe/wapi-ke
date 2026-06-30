import { create } from "zustand";

import { apiFetch, setAccessToken } from "@/lib/api/client";
import { useFavoritesStore } from "@/lib/stores/favorites-store";

/**
 * Global auth state (Zustand), per CLAUDE.md §9.
 *
 * Wired to the real `/api/v1/auth/*` endpoints. The short-lived **access
 * token lives in memory only** (this store + the api client) — never
 * localStorage. The refresh token is an httpOnly cookie the browser manages;
 * `initialize()` silently exchanges it for a new access token on app load so a
 * page refresh keeps the user signed in.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthResponseDto {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export type AuthStatus =
  "idle" | "loading" | "authenticated" | "unauthenticated";

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

function applySession(
  set: (partial: Partial<AuthState>) => void,
  data: AuthResponseDto,
): void {
  setAccessToken(data.access_token);
  set({
    isAuthenticated: true,
    user: data.user,
    token: data.access_token,
    status: "authenticated",
  });
}

function clearSession(set: (partial: Partial<AuthState>) => void): void {
  setAccessToken(null);
  set({
    isAuthenticated: false,
    user: null,
    token: null,
    status: "unauthenticated",
  });
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  status: "idle",

  login: async (email, password) => {
    const data = await apiFetch<AuthResponseDto>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    applySession(set, data);
  },

  signup: async (email, password, name) => {
    const data = await apiFetch<AuthResponseDto>("/auth/signup", {
      method: "POST",
      body: { email, password, name },
    });
    applySession(set, data);
  },

  logout: async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // best-effort; clear local state regardless
    }
    clearSession(set);
    useFavoritesStore.getState().reset();
  },

  initialize: async () => {
    set({ status: "loading" });
    try {
      const data = await apiFetch<AuthResponseDto>("/auth/refresh", {
        method: "POST",
      });
      applySession(set, data);
    } catch {
      clearSession(set);
    }
  },
}));
