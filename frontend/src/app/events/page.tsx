import type { Metadata } from "next";

import { EventsBrowser } from "@/components/events/events-browser";
import { BackLink } from "@/components/site/back-link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export const metadata: Metadata = {
  title: "Events",
  description:
    "What's on across Kenya — concerts, festivals, sports and cultural events. Search by title, venue, county, category or organizer.",
};

export default function EventsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-container-max px-margin-mobile pb-8 pt-16 md:px-margin-desktop md:pb-10 md:pt-24">
          <BackLink href="/" label="Back to Home" className="mb-6" />
          <h1 className="mb-4 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
            Upcoming Events
          </h1>
          <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
            What&apos;s on across Kenya — concerts, festivals, sports and
            culture. Search or filter to find your next outing.
          </p>
        </section>

        <section className="mx-auto max-w-container-max px-margin-mobile pb-section-mobile md:px-margin-desktop md:pb-section">
          <EventsBrowser />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
