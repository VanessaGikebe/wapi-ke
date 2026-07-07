import type { Metadata } from "next";

import { BackLink } from "@/components/site/back-link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { NewsletterContent } from "@/components/company-files/newsletter";

export const metadata: Metadata = {
  title: "Newsletter",
  description:
    "Stay updated with the latest experiences, hidden gems, and exclusive offers from Wapike.",
};

export default function NewsletterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-margin-mobile pb-section-mobile pt-16 md:px-margin-desktop md:pb-section md:pt-24">
          <BackLink href="/" label="Back to Home" className="mb-6" />
          <NewsletterContent />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
