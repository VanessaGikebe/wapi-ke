import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

import { setAccessToken } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { useFavoritesStore } from "@/lib/stores/favorites-store";

/**
 * Global auth state (Zustand), backed by **Supabase Auth**.
 *
 * Supabase persists + auto-refreshes the session via cookies (see the SSR
 * middleware). We mirror the current session into this store for the UI, and
 * push the Supabase access token into the API client so the (bridged) FastAPI
 * endpoints can authorize requests via the Supabase JWKS.
 */

// Lazy singleton so importing this module never touches browser APIs on the server.
let _client: ReturnType<typeof createClient> | null = null;
function sb() {
  return (_client ??= createClient());
}

function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated";

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ needsVerification: boolean }>;
  loginWithGoogle: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

function toUser(user: User | null): AuthUser | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const name =
    meta.full_name ||
    meta.name ||
    (user.email ? user.email.split("@")[0] : "Explorer");
  return {
    id: user.id,
    email: user.email ?? "",
    name,
    avatarUrl: meta.avatar_url || meta.picture || null,
  };
}

/** Map Supabase auth errors to friendly, user-facing messages. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Incorrect email or password.";
  if (m.includes("email not confirmed"))
    return "Please verify your email first — check your inbox for the link.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Try signing in.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("network") || m.includes("fetch"))
    return "Network error — check your connection and try again.";
  return message || "Something went wrong. Please try again.";
}

function applySession(
  set: (partial: Partial<AuthState>) => void,
  session: Session | null,
): void {
  setAccessToken(session?.access_token ?? null);
  if (!session) {
    useFavoritesStore.getState().reset();
  }
  set({
    isAuthenticated: Boolean(session),
    user: toUser(session?.user ?? null),
    token: session?.access_token ?? null,
    status: session ? "authenticated" : "unauthenticated",
  });
}

let listenerAttached = false;

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  status: "idle",

  login: async (email, password) => {
    const { error } = await sb().auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendly(error.message));
  },

  signup: async (email, password, name) => {
    const { data, error } = await sb().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${siteUrl()}/auth/callback`,
      },
    });
    if (error) throw new Error(friendly(error.message));
    // With email confirmation on, there's no session until the user verifies.
    return { needsVerification: !data.session };
  },

  loginWithGoogle: async () => {
    const { error } = await sb().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${siteUrl()}/auth/callback` },
    });
    if (error) throw new Error(friendly(error.message));
    // Browser redirects to Google here; nothing else runs.
  },

  requestPasswordReset: async (email) => {
    const { error } = await sb().auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
    });
    if (error) throw new Error(friendly(error.message));
  },

  updatePassword: async (password) => {
    const { error } = await sb().auth.updateUser({ password });
    if (error) throw new Error(friendly(error.message));
  },

  logout: async () => {
    await sb().auth.signOut();
    setAccessToken(null);
    useFavoritesStore.getState().reset();
    set({
      isAuthenticated: false,
      user: null,
      token: null,
      status: "unauthenticated",
    });
  },

  initialize: async () => {
    set({ status: "loading" });
    const {
      data: { session },
    } = await sb().auth.getSession();
    applySession(set, session);

    if (!listenerAttached) {
      listenerAttached = true;
      sb().auth.onAuthStateChange((_event, nextSession) => {
        applySession(set, nextSession);
      });
    }
  },
}));
