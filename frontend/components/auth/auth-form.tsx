"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Shared login / signup form. Calls the real auth endpoints; on success it
 * navigates to `redirect` (the path the user came from). `redirect` is threaded
 * through the cross-link so the return-path survives a switch between login and
 * signup.
 */
export function AuthForm({
  mode,
  redirect,
}: {
  mode: "login" | "signup";
  redirect: string;
}) {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const signup = useAuthStore((state) => state.signup);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const isSignup = mode === "signup";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isSignup) {
        await signup(email, password, name);
      } else {
        await login(email, password);
      }
      router.push(redirect);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  };

  const switchHref = `/${isSignup ? "login" : "signup"}${
    redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : ""
  }`;

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-tonal md:p-10"
    >
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-headline-md text-headline-md text-primary">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {isSignup
            ? "Join Wapike to save and book experiences."
            : "Sign in to continue."}
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {isSignup && (
          <Field label="Name" htmlFor="name">
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Your name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        )}

        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full"
          disabled={submitting}
        >
          {submitting
            ? isSignup
              ? "Creating account…"
              : "Signing in…"
            : isSignup
              ? "Create account"
              : "Sign in"}
        </Button>
      </div>

      <p className="mt-6 text-center font-body-md text-body-md text-on-surface-variant">
        {isSignup ? "Already have an account? " : "New to Wapike? "}
        <Link
          href={switchHref}
          className="transition-subtle font-medium text-secondary hover:opacity-70"
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="font-label-md text-label-md uppercase text-on-surface-variant"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
