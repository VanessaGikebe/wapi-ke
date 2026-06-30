import { CategoryListing } from "@/components/categories/category-listing";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/*
 * Generic category listing route — ONE page for every category.
 *
 * Thin shell: the client `<CategoryListing>` loads the category, filter schema,
 * and (server-side-filtered) experiences from the API via TanStack Query.
 */
export default function CategoryListingPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1">
        <CategoryListing slug={params.slug} />
      </main>
      <SiteFooter />
    </div>
  );
}
