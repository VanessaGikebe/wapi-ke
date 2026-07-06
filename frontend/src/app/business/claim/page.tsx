import Link from "next/link";

import { ClaimWizard } from "@/components/business/claim-wizard";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function BusinessClaimPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-container-max flex-1 px-margin-mobile py-12 md:px-margin-desktop">
        <div className="mx-auto mb-8 max-w-2xl">
          <Link
            href="/business"
            className="font-label-md text-label-md text-on-surface-variant underline-offset-2 hover:text-primary hover:underline"
          >
            ← WapiKE for Business
          </Link>
          <h1 className="mt-3 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
            Claim your business
          </h1>
          <p className="mt-2 font-body-lg text-body-lg text-on-surface-variant">
            Already listed on WapiKE? Prove ownership to take control of your
            profile. No account is created until your claim is approved.
          </p>
        </div>
        <ClaimWizard />
      </main>
      <SiteFooter />
    </div>
  );
}
