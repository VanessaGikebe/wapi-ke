"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PasswordStrength } from "@/components/auth/password-strength";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Business account activation. The owner arrives here via the one-time magic
 * link; Supabase sets the session from the URL automatically. They optionally
 * set a password, accept terms, and land in the dashboard.
 */
export default function BusinessActivatePage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const refreshAccount = useAuthStore((s) => s.refreshAccount);

  const [password, setPassword] = React.useState("");
  const [terms, setTerms] = React.useState(false);
  const [notify, setNotify] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const settling = status === "idle" || status === "loading";

  const finish = async () => {
    if (!terms) {
      setError("Please accept the terms to activate your account.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (password) await updatePassword(password);
      await refreshAccount();
      router.replace("/business/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not activate.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-container-max flex-1 items-center justify-center px-margin-mobile py-12 md:px-margin-desktop">
        <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-tonal">
          {settling ? (
            <p className="text-center font-body-md text-body-md text-on-surface-variant">
              Activating your account…
            </p>
          ) : !isAuth ? (
            <div className="flex flex-col gap-4 text-center">
              <h1 className="font-headline-md text-headline-md text-primary">
                Activation link invalid or expired
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Activation links expire after 24 hours. Please sign in, or ask an
                administrator to re-issue your link.
              </p>
              <Link
                href="/business/login"
                className="font-label-md text-label-md text-primary underline-offset-2 hover:underline"
              >
                Business Sign In
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="font-headline-md text-headline-md text-primary">
                  Welcome to WapiKE Business
                </h1>
                <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                  Finish setting up your account.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-md text-label-md uppercase text-on-surface-variant">
                  Set a password (optional)
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a strong password"
                />
                {password && <PasswordStrength password={password} />}
                <p className="font-caption text-caption text-on-surface-variant">
                  You can skip this and keep signing in with a magic link.
                </p>
              </div>

              <label className="flex items-start gap-3 font-body-md text-body-md text-on-surface">
                <input
                  type="checkbox"
                  checked={notify}
                  onChange={(e) => setNotify(e.target.checked)}
                  className="mt-1"
                />
                Email me about bookings, reviews, and platform updates.
              </label>

              <label className="flex items-start gap-3 font-body-md text-body-md text-on-surface">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="mt-1"
                />
                I accept the WapiKE{" "}
                <Link href="/terms" className="text-primary underline">
                  Business Terms
                </Link>
                .
              </label>

              {error && (
                <p role="alert" className="rounded-lg bg-error-container px-4 py-2.5 font-body-md text-body-md text-on-error-container">
                  {error}
                </p>
              )}

              <Button size="lg" className="w-full" disabled={busy} onClick={finish}>
                {busy ? "Activating…" : "Enter my dashboard"}
              </Button>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
