import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign in",
};

/** Only allow same-origin relative redirects (avoid open-redirect). */
function safeRedirect(value: string | string[] | undefined): string {
  return typeof value === "string" && value.startsWith("/") ? value : "/";
}

function firstValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string | string[]; error?: string | string[] };
}) {
  return (
    <AuthForm
      mode="login"
      redirect={safeRedirect(searchParams.redirect)}
      initialError={firstValue(searchParams.error)}
    />
  );
}
