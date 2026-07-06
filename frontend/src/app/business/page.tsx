"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { buttonVariants } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    icon: "add_business",
    title: "List a New Business",
    body: "Not on WapiKE yet? Submit your business for verification and reach travellers exploring Kenya.",
    cta: "List a New Business",
    href: "/business/signup",
    primary: true,
  },
  {
    icon: "verified",
    title: "Claim an Existing Business",
    body: "Already listed on WapiKE? Claim your business to manage its profile, photos, and bookings.",
    cta: "Claim Your Business",
    href: "/business/claim",
    primary: false,
  },
] as const;

export default function BusinessLandingPage() {
  const router = useRouter();
  const accountType = useAuthStore((s) => s.accountType);

  // A signed-in business account belongs in the dashboard, not the landing.
  React.useEffect(() => {
    if (accountType === "business") router.replace("/business/dashboard");
  }, [accountType, router]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
          <p className="font-label-md text-label-md uppercase tracking-wider text-secondary">
            WapiKE for Business
          </p>
          <h1 className="mt-3 max-w-3xl font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
            Grow your business with Kenya&apos;s premium discovery platform.
          </h1>
          <p className="mt-4 max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
            List or claim your restaurant, hotel, tour, or experience. Verified
            businesses get a trusted badge, a management dashboard, and exposure
            to travellers actively planning their trips.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {OPTIONS.map((o) => (
              <div
                key={o.title}
                className="flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-tonal"
              >
                <span
                  aria-hidden
                  className="material-symbols-outlined mb-4 text-[32px] text-primary"
                >
                  {o.icon}
                </span>
                <h2 className="font-headline-md text-headline-md text-primary">
                  {o.title}
                </h2>
                <p className="mt-2 flex-1 font-body-md text-body-md text-on-surface-variant">
                  {o.body}
                </p>
                <Link
                  href={o.href}
                  className={cn(
                    buttonVariants({
                      size: "lg",
                      variant: o.primary ? "primary" : "outline",
                    }),
                    "mt-6 w-full",
                  )}
                >
                  {o.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-2 font-body-md text-body-md text-on-surface-variant">
            Already have a Business Account?
            <Link
              href="/business/login"
              className="font-label-md text-label-md text-primary underline-offset-2 hover:underline"
            >
              Business Sign In
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
