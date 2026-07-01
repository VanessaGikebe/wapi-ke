import type { Metadata } from "next";
import Link from "next/link";

import { BackLink } from "@/components/site/back-link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Help",
  description:
    "Answers to common questions about discovering and booking experiences on Wapike.",
};

const FAQS = [
  {
    q: "How do I discover experiences?",
    a: "Two ways: browse by category from the Categories page, or tell the AI Assistant what you're after and let it recommend the perfect match.",
  },
  {
    q: "Do I need an account to browse?",
    a: "No. You can explore categories, listings, experience details, and chat with the assistant as a guest. You'll only be asked to sign in when you save a place or request a booking.",
  },
  {
    q: "How does booking work?",
    a: "Open an experience and tap Book Now. We'll record your request — there's no payment at this stage; the venue follows up to confirm.",
  },
  {
    q: "Where are my saved places and bookings?",
    a: "Everything lives under your Account — Saved Places for your hearts, and My Bookings for your requests.",
  },
];

export default function HelpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-margin-mobile pb-section-mobile pt-16 md:px-margin-desktop md:pb-section md:pt-24">
          <BackLink href="/" label="Back to Home" className="mb-6" />
          <h1 className="mb-3 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
            Help &amp; FAQ
          </h1>
          <p className="mb-10 font-body-lg text-body-lg text-on-surface-variant">
            Everything you need to get the most out of Wapike.
          </p>

          <dl className="flex flex-col divide-y divide-surface-variant">
            {FAQS.map((faq) => (
              <div key={faq.q} className="py-6 first:pt-0">
                <dt className="mb-2 font-headline-sm text-headline-sm text-primary">
                  {faq.q}
                </dt>
                <dd className="font-body-md text-body-md text-on-surface-variant">
                  {faq.a}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 flex flex-wrap items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
            <p className="flex-1 font-body-md text-body-md text-on-surface-variant">
              Still stuck? Reach us at{" "}
              <a
                href="mailto:hello@wapike.co.ke"
                className="rounded text-secondary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                hello@wapike.co.ke
              </a>
              .
            </p>
            <Link
              href="/assistant"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Ask the AI Assistant
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
