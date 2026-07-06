import type { Metadata } from "next";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Card } from "@/components/ui/card";
import { requireBusinessPortal } from "@/lib/portal-server";

export const metadata: Metadata = { title: "Business Dashboard" };

export default async function BusinessDashboardPage() {
  await requireBusinessPortal();
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-container-max flex-1 px-margin-mobile py-12 md:px-margin-desktop">
        <h1 className="font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
          Business Dashboard
        </h1>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ["Verification", "Track account activation and ownership status."],
            ["Listing", "Manage public business details after onboarding."],
            ["Insights", "Analytics-ready space for future reporting."],
          ].map(([title, body]) => (
            <Card key={title} className="p-6">
              <h2 className="font-headline-sm text-headline-sm text-primary">{title}</h2>
              <p className="mt-2 font-body-md text-body-md text-on-surface-variant">{body}</p>
            </Card>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
