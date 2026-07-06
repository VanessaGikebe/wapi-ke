"use client";

import * as React from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { useAuthStore, type AccountType } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

/**
 * Guards an account-type-restricted area. Pure guard — there is NO self-service
 * role upgrade. States: loading → sign-in prompt (logged out) → not-authorized
 * (wrong account type) → the content.
 *
 * Account types are separate: a business account cannot open the admin portal
 * and vice-versa. Authorization is also enforced server-side on every API call;
 * this gate is only about what the UI shows.
 */
export function RoleGate({
  accountType,
  loginHref,
  children,
}: {
  accountType: Exclude<AccountType, "user">;
  loginHref: string;
  children: React.ReactNode;
}) {
  const status = useAuthStore((s) => s.status);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const current = useAuthStore((s) => s.accountType);

  if (status === "idle" || status === "loading") {
    return <Centered>Loading…</Centered>;
  }
  if (!isAuth) {
    return <NeedSignIn accountType={accountType} loginHref={loginHref} />;
  }
  if (current === null) {
    return <Centered>Checking access…</Centered>;
  }
  if (current === accountType) {
    return <>{children}</>;
  }
  return <NotAuthorized accountType={accountType} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center font-body-md text-body-md text-on-surface-variant">
      {children}
    </div>
  );
}

function NeedSignIn({
  accountType,
  loginHref,
}: {
  accountType: Exclude<AccountType, "user">;
  loginHref: string;
}) {
  return (
    <Card
      title={accountType === "admin" ? "Administrator area" : "Business area"}
      body="Please sign in to continue."
    >
      <Link
        href={loginHref}
        className={cn(buttonVariants({ size: "lg" }), "w-full")}
      >
        Sign in
      </Link>
    </Card>
  );
}

function NotAuthorized({
  accountType,
}: {
  accountType: Exclude<AccountType, "user">;
}) {
  const isAdmin = accountType === "admin";
  return (
    <Card
      title="Access restricted"
      body={
        isAdmin
          ? "This is the administrator portal. Your account doesn't have admin access."
          : "This is the business portal, for verified WapiKE business accounts. To list a business, submit an application first."
      }
    >
      <div className="flex flex-col gap-2">
        <Link
          href="/"
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          Back to WapiKE
        </Link>
        {!isAdmin && (
          <Link
            href="/business"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "w-full",
            )}
          >
            WapiKE for Business
          </Link>
        )}
      </div>
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
