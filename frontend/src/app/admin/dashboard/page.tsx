import type { Metadata } from "next";

import { AdminReviewBoard } from "@/components/admin/admin-review-board";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { requireAdminPortal } from "@/lib/portal-server";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  await requireAdminPortal();
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-container-max flex-1 px-margin-mobile py-12 md:px-margin-desktop">
        <p className="mb-3 font-label-md text-label-md uppercase tracking-wider text-secondary">
          Administrator
        </p>
        <h1 className="font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
          Admin Dashboard
        </h1>
        <AdminReviewBoard />
      </main>
      <SiteFooter />
    </div>
  );
}
