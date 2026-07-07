"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { BackLink } from "@/components/site/back-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  useRecommendations,
  useRecordInteraction,
} from "@/lib/queries/personalization";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { FilterDefinition } from "@/lib/types";
import { cn } from "@/lib/utils";

import { ExperienceCard } from "./experience-card";
import { FilterSidebar } from "./filter-sidebar";
import { PersonalizedSections } from "./personalized-sections";

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
        <BackLink
          href="/categories"
          label="Back to Categories"
          className="mb-6"
        />
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

  // Free-text search within this category. Debounced, and composed onto the
  // filter query so `q` narrows the same filtered result set (the personalized
  // recommendations query below stays on the filters-only query).
  const [rawSearch, setRawSearch] = React.useState("");
  const [search, setSearch] = React.useState("");
  React.useEffect(() => {
    const id = setTimeout(() => setSearch(rawSearch), 300);
    return () => clearTimeout(id);
  }, [rawSearch]);

  const query = React.useMemo(
    () => filterStateToQuery(filters, state),
    [filters, state],
  );
  const experiencesQueryString = React.useMemo(() => {
    const term = search.trim();
    if (!term) return query;
    const params = new URLSearchParams(query);
    params.set("q", term);
    return params.toString();
  }, [query, search]);

  const experiencesQuery = useExperiences(slug, experiencesQueryString);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const recommendationsQuery = useRecommendations(slug, query, isAuthenticated);
  const recordInteraction = useRecordInteraction();

  const items = experiencesQuery.data?.items ?? [];
  const total = experiencesQuery.data?.total ?? 0;
  const activeCount = countActiveFilters(filters, state);
  const initialLoading = experiencesQuery.isLoading && !experiencesQuery.data;

  React.useEffect(() => {
    if (!isAuthenticated || activeCount === 0) return;
    recordInteraction.mutate({
      interactionType: "filter",
      categorySlug: slug,
      weight: Math.min(6, activeCount + 1),
      context: { query },
    });
    // recordInteraction is intentionally omitted so each stable query records once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCount, isAuthenticated, query, slug]);

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
          <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)]">
            <SidebarSearch value={rawSearch} onChange={setRawSearch} />
            {/* On desktop the filter list scrolls independently so a long set
                of filters never runs off the bottom of the sticky column. */}
            <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
              <FilterSidebar
                filters={filters}
                state={state}
                activeCount={activeCount}
                onChange={setFilter}
                onClear={clearAll}
              />
            </div>
          </div>
        </aside>

        <section>
          {isAuthenticated && (
            <PersonalizedSections
              sections={recommendationsQuery.data}
              loading={recommendationsQuery.isLoading}
            />
          )}

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
                {search.trim()
                  ? "No experiences match your search and filters. Try a different term or loosen a few filters."
                  : "No experiences match your current filters. Try loosening a few."}
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

function SidebarSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
      >
        search
      </span>
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search this category…"
        aria-label="Search within this category"
        className="pl-10"
      />
    </div>
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
