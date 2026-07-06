import { RoleGate } from "@/components/auth/role-gate";
import { BusinessDashboard } from "@/components/business/business-dashboard";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function BusinessPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-container-max flex-1 px-margin-mobile py-12 md:px-margin-desktop">
        <RoleGate role="business_manager" loginHref="/business/login">
          <h1 className="mb-2 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
            Business Dashboard
          </h1>
          <p className="mb-8 font-body-lg text-body-lg text-on-surface-variant">
            List new businesses, manage the ones you own, and track your claims.
          </p>
          <BusinessDashboard />
        </RoleGate>
      </main>
      <SiteFooter />
    </div>
  );
}
