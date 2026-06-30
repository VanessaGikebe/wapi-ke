"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  countActiveFilters,
  filterStateToQuery,
  initFilterState,
  queryToFilterState,
  type FilterValue,
} from "@/lib/filtering";
import {
  useCategory,
  useExperiences,
  useFilters,
} from "@/lib/queries/categories";
import type { FilterDefinition } from "@/lib/types";
import { cn } from "@/lib/utils";

import { ExperienceCard } from "./experience-card";
import { FilterSidebar } from "./filter-sidebar";

/**
 * Generic category listing template — ONE component for all 10 categories.
 *
 * Loads the category header + filter schema from the API (TanStack Query).
 * Filtering is server-side: the active filter state is serialised to query
 * params and the experiences query refetches on change (no full reload).
 */
export function CategoryListing({ slug }: { slug: string }) {
  const categoryQuery = useCategory(slug);
  const filtersQuery = useFilters(slug);
  const notFound = categoryQuery.isError;

  return (
    <>
      <section className="mx-auto max-w-container-max px-margin-mobile pb-8 pt-16 md:px-margin-desktop md:pb-12 md:pt-24">
        {categoryQuery.data ? (
          <>
            <h1 className="mb-4 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
              {categoryQuery.data.name}
            </h1>
            <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
              Browse curated {categoryQuery.data.name.toLowerCase()} experiences
              across Kenya.
            </p>
          </>
        ) : notFound ? (
          <h1 className="font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
            Category not found
          </h1>
        ) : (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-96 max-w-full" />
          </div>
        )}
      </section>

      <div className="mx-auto max-w-container-max px-margin-mobile pb-section-mobile md:px-margin-desktop md:pb-section">
        {notFound ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-20 text-center">
            <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">
              We couldn&apos;t find that category.
            </p>
            <Link
              href="/categories"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Back to Categories
            </Link>
          </div>
        ) : filtersQuery.isError ? (
          <RetryBlock onRetry={() => filtersQuery.refetch()} />
        ) : !filtersQuery.data ? (
          <ListingSkeleton />
        ) : (
          <CategoryListingInner slug={slug} filters={filtersQuery.data} />
        )}
      </div>
    </>
  );
}

function CategoryListingInner({
  slug,
  filters,
}: {
  slug: string;
  filters: FilterDefinition[];
}) {
  // Seed from URL query params so the assistant can deep-link a pre-filtered
  // listing; falls back to defaults when there are none.
  const searchParams = useSearchParams();
  const [state, setState] = React.useState(() =>
    queryToFilterState(filters, searchParams),
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

  const query = React.useMemo(
    () => filterStateToQuery(filters, state),
    [filters, state],
  );
  const experiencesQuery = useExperiences(slug, query);

  const items = experiencesQuery.data?.items ?? [];
  const total = experiencesQuery.data?.total ?? 0;
  const activeCount = countActiveFilters(filters, state);
  const initialLoading = experiencesQuery.isLoading && !experiencesQuery.data;

  const setFilter = React.useCallback(
    (key: string, value: FilterValue) =>
      setState((prev) => ({ ...prev, [key]: value })),
    [],
  );
  const clearAll = React.useCallback(
    () => setState(initFilterState(filters)),
    [filters],
  );

  const resultLabel = (singular: string) =>
    `${total} ${total === 1 ? singular : `${singular}s`}`;

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4 lg:hidden">
        <Button
          variant="outline"
          size="sm"
          aria-expanded={mobileFiltersOpen}
          onClick={() => setMobileFiltersOpen((open) => !open)}
        >
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
        <span className="font-caption text-caption uppercase tracking-wide text-on-surface-variant">
          {resultLabel("result")}
        </span>
      </div>

      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
        <aside
          className={cn(
            "mb-8 lg:mb-0 lg:block",
            mobileFiltersOpen ? "block" : "hidden",
          )}
        >
          <div className="lg:sticky lg:top-24">
            <FilterSidebar
              filters={filters}
              state={state}
              activeCount={activeCount}
              onChange={setFilter}
              onClear={clearAll}
            />
          </div>
        </aside>

        <section>
          <div className="mb-6 hidden items-center justify-between lg:flex">
            <p className="font-caption text-caption uppercase tracking-wide text-on-surface-variant">
              {resultLabel("experience")}
            </p>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear all
              </Button>
            )}
          </div>

          {initialLoading ? (
            <ExperienceGridSkeleton />
          ) : items.length > 0 ? (
            <ul
              className={cn(
                "grid grid-cols-1 gap-gutter transition-opacity sm:grid-cols-2 xl:grid-cols-3",
                experiencesQuery.isFetching && "opacity-60",
              )}
            >
              {items.map((experience) => (
                <li key={experience.id}>
                  <ExperienceCard experience={experience} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-20 text-center">
              <p className="font-headline-sm text-headline-sm text-primary">
                No matches
              </p>
              <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">
                No experiences match your current filters. Try loosening a few.
              </p>
              {activeCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function ExperienceGridSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex flex-col gap-4">
          <Skeleton className="aspect-[4/5] w-full rounded-xl" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </li>
      ))}
    </ul>
  );
}

function ListingSkeleton() {
  return (
    <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <Skeleton className="mb-8 hidden h-96 w-full rounded-xl lg:block" />
      <ExperienceGridSkeleton />
    </div>
  );
}

function RetryBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-20 text-center">
      <p className="font-headline-sm text-headline-sm text-primary">
        Couldn&apos;t load this category
      </p>
      <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">
        Make sure the API is running, then try again.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
