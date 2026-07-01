"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppleSignInButton, GoogleSignInButton } from "@/components/auth/social-auth";
import { Brand } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { HERO_IMAGE } from "@/lib/images";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Shared login / signup surface. Real Google sign-in (GIS) + email/password,
 * with an Apple placeholder. On success it navigates to `redirect` (the path
 * the user came from), threaded through the login/signup cross-link.
 */
export function AuthForm({
  mode,
  redirect,
}: {
  mode: "login" | "signup";
  redirect: string;
}) {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const isSignup = mode === "signup";
  const passwordsMismatch =
    isSignup && confirm.length > 0 && confirm !== password;

  const fail = (err: unknown, fallback: string) => {
    setError(err instanceof ApiError ? err.message : fallback);
    setSubmitting(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (isSignup) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords don't match.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isSignup) await signup(email, password, name);
      else await login(email, password);
      router.push(redirect);
    } catch (err) {
      fail(err, "Something went wrong. Please try again.");
    }
  };

  const handleGoogle = async (credential: string) => {
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      await loginWithGoogle(credential);
      router.push(redirect);
    } catch (err) {
      fail(err, "Google sign-in failed. Please try again.");
    }
  };

  const handleApple = () => {
    setError(null);
    setInfo(
      "Sign in with Apple is coming soon — it needs a deployed site. Use Google or email for now.",
    );
  };

  const switchHref = `/${isSignup ? "login" : "signup"}${
    redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : ""
  }`;

  return (
    <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-tonal-lg md:grid-cols-2">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-on-primary md:flex">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          sizes="440px"
          className="object-cover opacity-30"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/80 to-primary"
        />
        <div className="relative z-10">
          <Brand
            wordmarkClassName="text-[30px] text-on-primary [&_.text-secondary]:text-secondary-fixed-dim"
          />
        </div>
        <div className="relative z-10">
          <h2 className="font-headline-md text-headline-md text-on-primary">
            Discover Kenya, your way.
          </h2>
          <ul className="mt-6 flex flex-col gap-4">
            {[
              "Save your favourite places",
              "Book experiences in seconds",
              "Get AI-picked recommendations",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckIcon className="h-5 w-5 shrink-0 text-secondary-fixed-dim" />
                <span className="font-body-md text-body-md text-on-primary/90">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-8 md:p-10">
        {/* Mobile brand */}
        <div className="mb-6 md:hidden">
          <Brand wordmarkClassName="text-[26px]" />
        </div>

        <div className="mb-6 flex flex-col gap-1.5">
          <h1 className="font-headline-md text-headline-md text-primary">
            {isSignup ? "Create your wapiKE account" : "Welcome back"}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {isSignup
              ? "Join wapiKE to save places and book experiences across Kenya."
              : "Sign in to pick up where you left off."}
          </p>
        </div>

        {/* Social */}
        <div className="flex flex-col gap-3">
          <GoogleSignInButton onCredential={handleGoogle} onError={setError} />
          <AppleSignInButton onUnavailable={handleApple} />
        </div>

        <div className="my-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-surface-variant" />
          <span className="font-caption text-caption uppercase tracking-wide text-on-surface-variant">
            or continue with email
          </span>
          <span className="h-px flex-1 bg-surface-variant" />
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

          <Field
            label="Password"
            htmlFor="password"
            hint={isSignup ? "At least 8 characters" : undefined}
          >
            <PasswordInput
              id="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              minLength={isSignup ? 8 : undefined}
            />
          </Field>

          {isSignup && (
            <Field label="Confirm password" htmlFor="confirm">
              <PasswordInput
                id="confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={setConfirm}
                show={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                invalid={passwordsMismatch}
              />
              {passwordsMismatch && (
                <p className="font-caption text-caption text-error">
                  Passwords don&apos;t match.
                </p>
              )}
            </Field>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
            >
              {error}
            </p>
          )}
          {info && !error && (
            <p
              role="status"
              className="rounded-lg bg-secondary-container px-4 py-3 font-body-md text-body-md text-on-secondary-container"
            >
              {info}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="mt-1 w-full"
            disabled={submitting || passwordsMismatch}
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
          {isSignup ? "Already have an account? " : "New to wapiKE? "}
          <Link
            href={switchHref}
            className="transition-subtle font-medium text-secondary hover:opacity-70"
          >
            {isSignup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </form>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="font-label-md text-label-md uppercase text-on-surface-variant"
        >
          {label}
        </label>
        {hint && (
          <span className="font-caption text-caption text-on-surface-variant/80">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  minLength,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
  minLength?: number;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        name={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder="••••••••"
        required
        minLength={minLength}
        aria-invalid={invalid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-11"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="transition-subtle absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-on-surface-variant hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary"
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M5 12.5l4 4 10-10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.9 5.2A9.6 9.6 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.3 4M6.3 6.3A17 17 0 002 12s3.6 7 10 7a9.6 9.6 0 003.5-.66"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
