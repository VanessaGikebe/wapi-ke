"use client";

import * as React from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerAdmin, registerBusinessManager } from "@/lib/api/roles";
import { useAuthStore, type Role } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

/**
 * Guards a role-restricted area. Shows a sign-in prompt when logged out, a
 * one-time role-upgrade card when the user lacks the role (admin needs an
 * invite code; business manager is self-service), and the content once allowed.
 * Administrators can access every area.
 */
export function RoleGate({
  role,
  loginHref,
  children,
}: {
  role: Exclude<Role, "user">;
  loginHref: string;
  children: React.ReactNode;
}) {
  const status = useAuthStore((s) => s.status);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const currentRole = useAuthStore((s) => s.role);
  const refreshRole = useAuthStore((s) => s.refreshRole);

  if (status === "idle" || status === "loading") {
    return <Centered>Loading…</Centered>;
  }
  if (!isAuth) {
    return <NeedSignIn role={role} loginHref={loginHref} />;
  }
  if (currentRole === null) {
    return <Centered>Checking access…</Centered>;
  }
  if (currentRole === role || currentRole === "administrator") {
    return <>{children}</>;
  }
  return <Upgrade role={role} onDone={refreshRole} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center font-body-md text-body-md text-on-surface-variant">
      {children}
    </div>
  );
}

function NeedSignIn({ role, loginHref }: { role: Role; loginHref: string }) {
  return (
    <Card
      title={role === "administrator" ? "Administrator area" : "Business area"}
      body="Please sign in to continue."
    >
      <Link href={loginHref} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
        Sign in
      </Link>
    </Card>
  );
}

function Upgrade({
  role,
  onDone,
}: {
  role: Exclude<Role, "user">;
  onDone: () => Promise<void>;
}) {
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (role === "administrator") await registerAdmin(code);
      else await registerBusinessManager();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upgrade access.");
      setLoading(false);
    }
  };

  if (role === "business_manager") {
    return (
      <Card
        title="Become a business manager"
        body="List and manage businesses on wapiKE. This upgrades your account — you can start listing right away."
      >
        {error && <ErrorLine text={error} />}
        <Button size="lg" className="w-full" disabled={loading} onClick={submit}>
          {loading ? "Setting up…" : "Continue as a business manager"}
        </Button>
      </Card>
    );
  }

  return (
    <Card
      title="Administrator access"
      body="Enter the administrator invite code to unlock the moderation dashboard."
    >
      <form onSubmit={submit} className="flex w-full flex-col gap-3">
        <Input
          type="password"
          placeholder="Admin invite code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        {error && <ErrorLine text={error} />}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Verifying…" : "Unlock admin access"}
        </Button>
      </form>
    </Card>
  );
}

function Card({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto mt-16 flex w-full max-w-md flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-tonal">
      <h1 className="font-headline-md text-headline-md text-primary">{title}</h1>
      <p className="font-body-md text-body-md text-on-surface-variant">{body}</p>
      {children}
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg bg-error-container px-4 py-2.5 font-body-md text-body-md text-on-error-container"
    >
      {text}
    </p>
  );
}
