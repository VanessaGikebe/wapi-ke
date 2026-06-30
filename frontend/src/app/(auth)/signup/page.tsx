import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Create your account",
};

/** Only allow same-origin relative redirects (avoid open-redirect). */
function safeRedirect(value: string | string[] | undefined): string {
  return typeof value === "string" && value.startsWith("/") ? value : "/";
}

export default function SignupPage({
  searchParams,
}: {
  searchParams: { redirect?: string | string[] };
}) {
  return (
    <AuthForm mode="signup" redirect={safeRedirect(searchParams.redirect)} />
  );
}
