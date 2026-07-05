"use client";

import * as React from "react";
import Link from "next/link";

import { Brand } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function ForgotPasswordPage() {
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-tonal-lg md:p-10">
      <div className="mb-6">
        <Brand wordmarkClassName="text-[26px]" />
      </div>

      {sent ? (
        <div className="flex flex-col gap-4">
          <h1 className="font-headline-md text-headline-md text-primary">
            Check your email
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a
            password-reset link. Follow it to choose a new password.
          </p>
          <Link href="/login" className="font-medium text-secondary hover:opacity-70">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-headline-md text-headline-md text-primary">
              Reset your password
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="font-label-md text-label-md uppercase text-on-surface-variant">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </Button>

          <p className="text-center font-body-md text-body-md text-on-surface-variant">
            Remembered it?{" "}
            <Link href="/login" className="font-medium text-secondary hover:opacity-70">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
