import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <div className="flex w-full max-w-4xl flex-col items-center gap-4">
      <AuthForm mode="signup" redirect={safeRedirect(searchParams.redirect)} />
      <div className="w-full rounded-2xl border border-outline-variant bg-surface-container-lowest/70 px-6 py-5 text-center shadow-tonal">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Here to set up a business, not to shop?
        </p>
        <Link
          href="/business"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
        >
          List or Claim a Business
        </Link>
      </div>
    </div>
  );
}
