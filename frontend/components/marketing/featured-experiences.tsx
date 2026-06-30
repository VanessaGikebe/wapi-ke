"use client";

import { ExperienceCard } from "@/components/categories/experience-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatured } from "@/lib/queries/categories";

export function FeaturedExperiences() {
  const { data, isLoading, isError } = useFeatured(8);

  if (isLoading) {
    return (
      <ul className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="flex flex-col gap-4">
            <Skeleton className="aspect-[4/5] w-full rounded-xl" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </li>
        ))}
      </ul>
    );
  }

  if (isError || !data || data.length === 0) return null;

  return (
    <ul className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
      {data.map((experience) => (
        <li key={experience.id}>
          <ExperienceCard experience={experience} />
        </li>
      ))}
    </ul>
  );
}
