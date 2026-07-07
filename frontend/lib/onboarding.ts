/**
 * Client-side storage for the "Discover Your Vibe" onboarding answers.
 *
 * An anonymous visitor has no `user_preferences` row yet, so their answers live
 * in localStorage until they sign in — at which point they're merged into their
 * account's preferences (see DiscoverVibeOnboarding). The `completed` flag gates
 * the "ask only once per person" rule for anon visitors (the signed-in side is
 * gated by the backend `completed_onboarding` flag instead).
 */

import type { PreferenceProfileInput } from "@/lib/api/personalization";

const KEY = "wapike:discover-vibe";

export interface AnonOnboarding {
  completed: boolean;
  answers?: PreferenceProfileInput;
}

export function readAnonOnboarding(): AnonOnboarding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AnonOnboarding) : null;
  } catch {
    return null;
  }
}

function write(value: AnonOnboarding): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode / quota) — non-fatal */
  }
}

/** Record a finished anonymous onboarding, keeping the answers for a later merge. */
export function markAnonCompleted(answers: PreferenceProfileInput): void {
  write({ completed: true, answers });
}

/** After merging anon answers into a signed-in account, drop the payload but
 *  keep the completed flag so the anon flow never re-triggers in this browser. */
export function clearAnonAnswers(): void {
  write({ completed: true });
}
