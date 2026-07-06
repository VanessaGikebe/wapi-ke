"use client";

import * as React from "react";

import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecommendationSection } from "@/lib/api/personalization";
import { useRecordInteraction } from "@/lib/queries/personalization";

import { ExperienceCard } from "./experience-card";

export function PersonalizedSections({
  sections,
  loading,
}: {
  sections: RecommendationSection[] | undefined;
  loading: boolean;
}) {
  const recordInteraction = useRecordInteraction();
  const [dismissed, setDismissed] = React.useState<Record<string, boolean>>({});

  if (loading) return <PersonalizedSkeleton />;
  const visible = (sections ?? [])
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const id = item.experience?.id ?? item.event?.id;
        return id ? !dismissed[id] : true;
      }),
    }))
    .filter((section) => section.items.length > 0);
  if (visible.length === 0) return null;

  const markNotInterested = (item: RecommendationSection["items"][number]) => {
    const id = item.experience?.id ?? item.event?.id;
    if (id) setDismissed((current) => ({ ...current, [id]: true }));
    recordInteraction.mutate({
      interactionType: "not_interested",
      experienceId: item.experience?.id,
      categorySlug: item.experience?.categorySlug ?? item.event?.category ?? undefined,
      weight: 10,
      context: {
        kind: item.kind,
        eventId: item.event?.id,
        reason: item.reason,
      },
    });
  };

  return (
    <div className="mb-10 flex flex-col gap-10">
      {visible.map((section) => (
        <section key={section.key} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-headline-sm text-headline-sm text-primary">
              {section.title}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {section.explanation}
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-3">
            {section.items.slice(0, 4).map((item, index) => (
              <li
                key={`${section.key}-${item.kind}-${item.experience?.id ?? item.event?.id ?? index}`}
                className="flex flex-col gap-2"
              >
                {item.kind === "experience" && item.experience ? (
                  <ExperienceCard experience={item.experience} />
                ) : item.kind === "event" && item.event ? (
                  <EventCard event={item.event} />
                ) : null}
                <div className="flex items-start justify-between gap-3 px-1">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="font-caption text-caption text-on-surface-variant">
                      {item.reason}
                    </p>
                    {item.confidence ? (
                      <span className="w-fit rounded-full bg-secondary-container px-2 py-1 font-caption text-caption text-on-secondary-container">
                        {item.confidence}% Match
                      </span>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 px-2"
                    onClick={() => markNotInterested(item)}
                  >
                    Not Interested
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function PersonalizedSkeleton() {
  return (
    <div className="mb-10 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3">
            <Skeleton className="aspect-[4/5] w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
