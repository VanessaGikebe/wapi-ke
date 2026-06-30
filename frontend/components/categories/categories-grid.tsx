"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/lib/queries/categories";

import { CategoryCard } from "./category-card";

export function CategoriesGrid() {
  const { data: categories, isLoading, isError, refetch } = useCategories();

  if (isLoading) {
    return (
      <ul className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i}>
            <Skeleton className="aspect-[3/4] w-full rounded-xl" />
          </li>
        ))}
      </ul>
    );
  }

  if (isError || !categories) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center">
        <p className="font-headline-sm text-headline-sm text-primary">
          Couldn&apos;t load categories
        </p>
        <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">
          Make sure the API is running, then try again.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {categories.map((category) => (
        <li key={category.slug}>
          <CategoryCard category={category} />
        </li>
      ))}
    </ul>
  );
}
