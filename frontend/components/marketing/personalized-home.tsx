"use client";

import Link from "next/link";

import { PersonalizedSections } from "@/components/categories/personalized-sections";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecommendationSection } from "@/lib/api/personalization";
import { useRecommendations } from "@/lib/queries/personalization";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

// The homepage feed rows, in display order. "Trending Near You"
// (trending_near_you) is intentionally excluded. The personalized "Upcoming
// Events You'll Love" (upcoming_events) is also excluded here — the standalone
// Upcoming Events section renders below Explore Categories instead.
const SECTION_ORDER = ["recommended", "hidden_gems", "discover_new"] as const;

export function PersonalizedHome() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accountType = useAuthStore((s) => s.accountType);
  const enabled = isAuthenticated && accountType === "user";
  const recommendations = useRecommendations("", "", enabled);

  if (!enabled) return null;

  const data = recommendations.data;
  const sections = data
    ? SECTION_ORDER.map((key) => data.find((s) => s.key === key)).filter(
        (s): s is RecommendationSection => Boolean(s),
      )
    : undefined;

  return (
    <section className="bg-surface px-margin-mobile pt-section-mobile md:px-margin-desktop md:pt-section">
      <div className="mx-auto max-w-container-max">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary">
              For You
            </h2>
            <p className="mt-2 max-w-2xl font-body-md text-body-md text-on-surface-variant">
              Personalized picks that adapt to your vibe, saves, searches, time
              of day and what is happening nearby.
            </p>
          </div>
          <Link
            href="/categories"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Browse with filters
          </Link>
        </div>

        {recommendations.isLoading ? (
          <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-3">
                <Skeleton className="aspect-[4/5] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <PersonalizedSections
            sections={sections}
            loading={recommendations.isLoading}
            autoScroll
          />
        )}
      </div>
    </section>
  );
}
