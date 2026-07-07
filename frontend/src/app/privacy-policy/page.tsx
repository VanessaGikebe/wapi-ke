import type { Metadata } from "next";

import { BackLink } from "@/components/site/back-link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { PrivacyPolicyContent } from "@/components/company-files/privacy-policy";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Wapike collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-margin-mobile pb-section-mobile pt-16 md:px-margin-desktop md:pb-section md:pt-24">
          <BackLink href="/" label="Back to Home" className="mb-6" />
          <PrivacyPolicyContent />
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
