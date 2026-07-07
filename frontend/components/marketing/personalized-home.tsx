"use client";

import Link from "next/link";

import { PersonalizedSections } from "@/components/categories/personalized-sections";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecommendations } from "@/lib/queries/personalization";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

export function PersonalizedHome() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accountType = useAuthStore((s) => s.accountType);
  const user = useAuthStore((s) => s.user);
  const enabled = isAuthenticated && accountType === "user";
  const recommendations = useRecommendations("", "", enabled);

  if (!enabled) return null;

  return (
    <section className="bg-surface px-margin-mobile py-section-mobile md:px-margin-desktop md:py-section">
      <div className="mx-auto max-w-container-max">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
          <div>
            <Badge variant="accent" className="mb-3">
              For you
            </Badge>
            <h2 className="font-headline-md text-headline-md text-primary">
              {user?.name ? `${user.name}'s WapiKE` : "Your WapiKE"}
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
            sections={recommendations.data}
            loading={recommendations.isLoading}
            autoScroll
          />
        )}
      </div>
    </section>
  );
}
