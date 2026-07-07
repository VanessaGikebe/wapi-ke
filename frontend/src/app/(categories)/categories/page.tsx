import type { Metadata } from "next";

import { CategoriesGrid } from "@/components/categories/categories-grid";
import { CategorySearch } from "@/components/categories/category-search";
import { BackLink } from "@/components/site/back-link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/*
 * Category index — the Browse Categories entry point. The grid is a client
 * component that loads categories from `GET /api/v1/categories` via TanStack
 * Query.
 */

export const metadata: Metadata = {
  title: "Browse Categories",
  description:
    "Explore Wapike's curated experience categories — from fine dining to outdoor adventures.",
};

export default function CategoriesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-container-max px-margin-mobile pb-8 pt-16 md:px-margin-desktop md:pb-12 md:pt-24">
          <BackLink href="/" label="Back to Home" className="mb-6" />
          <h1 className="mb-4 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
            Browse Categories
          </h1>
          <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
            Pick a category to explore curated experiences across Kenya, or let
            the AI assistant point you to the right one.
          </p>
          <div className="mt-8">
            <CategorySearch />
          </div>
        </section>

        <section className="mx-auto max-w-container-max px-margin-mobile pb-section-mobile md:px-margin-desktop md:pb-section">
          <CategoriesGrid />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
