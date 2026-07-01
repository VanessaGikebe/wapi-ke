"use client";

import * as React from "react";

/**
 * Social sign-in buttons.
 *
 * Google is REAL: it uses Google Identity Services (GIS). Set
 * `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (a Google OAuth 2.0 Web client ID) to enable
 * it; the rendered button returns an ID token we hand to `POST /auth/google`.
 * Without the env var the button is shown disabled with a hint.
 *
 * Apple is a PLACEHOLDER: "Sign in with Apple" needs an Apple Developer account
 * and a deployed HTTPS domain (it can't complete on localhost), so the button
 * is present but calls `onUnavailable` instead of starting a real flow.
 */

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GSI_SRC = "https://accounts.google.com/gsi/client";

// Minimal shape of the GIS global we use.
interface GsiId {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GsiId } };
  }
}

let gsiPromise: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("gsi-load-failed"));
    document.head.appendChild(script);
  });
  return gsiPromise;
}

export function GoogleSignInButton({
  onCredential,
  onError,
  disabled,
}: {
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const callbackRef = React.useRef(onCredential);
  callbackRef.current = onCredential;

  React.useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    loadGsi()
      .then(() => {
        const id = window.google?.accounts?.id;
        if (cancelled || !hostRef.current || !id) return;
        id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) callbackRef.current(response.credential);
          },
        });
        const width = Math.min(
          Math.max(hostRef.current.clientWidth, 240),
          400,
        );
        id.renderButton(hostRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "center",
          width,
        });
      })
      .catch(() => onError?.("Couldn't load Google sign-in. Try again."));

    return () => {
      cancelled = true;
    };
  }, [onError]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <SocialButton
        icon={<GoogleIcon />}
        label="Continue with Google"
        disabled
        title="Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign-in"
      />
    );
  }

  return (
    <div
      ref={hostRef}
      className="flex min-h-[44px] w-full justify-center [color-scheme:light]"
      aria-disabled={disabled}
    />
  );
}

export function AppleSignInButton({
  onUnavailable,
}: {
  onUnavailable: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onUnavailable}
      className="transition-subtle flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary font-body-md text-body-md font-medium text-on-primary hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
    >
      <AppleIcon />
      Continue with Apple
    </button>
  );
}

function SocialButton({
  icon,
  label,
  disabled,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="transition-subtle flex h-11 w-full items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest font-body-md text-body-md font-medium text-on-surface hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon}
      {label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5">
      <path d="M16.36 12.9c.03 3.2 2.8 4.26 2.83 4.28-.02.07-.44 1.53-1.46 3.03-.88 1.3-1.8 2.6-3.24 2.62-1.42.03-1.88-.84-3.5-.84-1.63 0-2.13.82-3.47.87-1.4.05-2.46-1.4-3.35-2.7-1.82-2.65-3.2-7.48-1.34-10.75.92-1.62 2.57-2.65 4.37-2.68 1.37-.02 2.66.92 3.5.92.83 0 2.4-1.14 4.05-.97.69.03 2.62.28 3.87 2.1-.1.06-2.3 1.35-2.27 4.02M13.9 3.9c.74-.9 1.24-2.15 1.1-3.4-1.07.05-2.36.72-3.13 1.62-.69.8-1.29 2.07-1.13 3.29 1.19.09 2.41-.61 3.16-1.51" />
    </svg>
  );
}
