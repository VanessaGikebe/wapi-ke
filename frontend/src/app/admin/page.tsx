import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { RoleGate } from "@/components/auth/role-gate";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function AdminPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-container-max flex-1 px-margin-mobile py-12 md:px-margin-desktop">
        <RoleGate role="administrator" loginHref="/admin/login">
          <h1 className="mb-2 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
            Admin Dashboard
          </h1>
          <p className="mb-8 font-body-lg text-body-lg text-on-surface-variant">
            Moderate listings, review reports, and verify business claims.
          </p>
          <AdminDashboard />
        </RoleGate>
      </main>
      <SiteFooter />
    </div>
  );
}
