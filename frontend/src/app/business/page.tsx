import Link from "next/link";
import type { Metadata } from "next";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Business Portal" };

const actions = [
  {
    title: "List a New Business",
    body: "Submit your business details and documents for manual verification.",
    href: "/business/signup",
    icon: "add_business",
  },
  {
    title: "Claim an Existing Business",
    body: "Find an existing listing and submit ownership proof for admin review.",
    href: "/business/claim",
    icon: "verified",
  },
  {
    title: "Business Sign In",
    body: "Access your dashboard after your business account has been approved.",
    href: "/business/login",
    icon: "login",
  },
];

export default function BusinessPortalPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
          <div className="max-w-3xl">
            <p className="mb-3 font-label-md text-label-md uppercase tracking-wider text-secondary">
              WapiKE Business
            </p>
            <h1 className="font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
              Manage how travellers discover your business.
            </h1>
            <p className="mt-4 max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
              Business access is reviewed manually. Accounts are created only
              after approval, so listings stay trusted and ownership is clear.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {actions.map((action) => (
              <Card key={action.href} className="flex h-full flex-col p-6">
                <span
                  aria-hidden
                  className="material-symbols-outlined mb-5 text-[32px] text-secondary"
                >
                  {action.icon}
                </span>
                <h2 className="font-headline-sm text-headline-sm text-primary">
                  {action.title}
                </h2>
                <p className="mt-2 flex-1 font-body-md text-body-md text-on-surface-variant">
                  {action.body}
                </p>
                <Link
                  href={action.href}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-6")}
                >
                  Continue
                </Link>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
