"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PasswordStrength } from "@/components/auth/password-strength";
import { Brand } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assessPassword } from "@/lib/password";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Reached via the reset email link (which routes through /auth/callback and
 * leaves a temporary recovery session). The user sets a new password here.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const updatePassword = useAuthStore((s) => s.updatePassword);

  const [ready, setReady] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Confirm we actually have a (recovery) session before showing the form.
  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setError("This reset link is invalid or has expired. Request a new one.");
      }
      setReady(true);
    });
  }, []);

  const assessment = assessPassword(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!assessment.valid) {
      setError(assessment.errors[0] ?? "Choose a stronger password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => router.push("/account"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update password.");
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-tonal-lg md:p-10">
      <div className="mb-6">
        <Brand wordmarkClassName="text-[26px]" />
      </div>

      {done ? (
        <div className="flex flex-col gap-3">
          <h1 className="font-headline-md text-headline-md text-primary">
            Password updated
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            You&apos;re all set — taking you to your account…
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-headline-md text-headline-md text-primary">
              Choose a new password
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Make it strong — you won&apos;t need to remember the old one.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="font-label-md text-label-md uppercase text-on-surface-variant">
              New password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide password" : "Show password"}
                className="transition-subtle absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-on-surface-variant hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary"
              >
                {show ? "🙈" : "👁"}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-1">
                <PasswordStrength password={password} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="confirm" className="font-label-md text-label-md uppercase text-on-surface-variant">
              Confirm password
            </label>
            <Input
              id="confirm"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              required
              aria-invalid={mismatch}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {mismatch && (
              <p className="font-caption text-caption text-error">
                Passwords don&apos;t match.
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting || !ready || !assessment.valid || mismatch}
          >
            {submitting ? "Updating…" : "Update password"}
          </Button>

          <p className="text-center font-body-md text-body-md text-on-surface-variant">
            <Link href="/login" className="font-medium text-secondary hover:opacity-70">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
