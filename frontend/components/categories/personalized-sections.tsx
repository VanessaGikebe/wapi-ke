"use client";

import * as React from "react";

import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecommendationSection } from "@/lib/api/personalization";
import { useRecordInteraction } from "@/lib/queries/personalization";
import { cn } from "@/lib/utils";

import { ExperienceCard } from "./experience-card";

export function PersonalizedSections({
  sections,
  loading,
  autoScroll = false,
}: {
  sections: RecommendationSection[] | undefined;
  loading: boolean;
  /**
   * Render each section as an auto-scrolling horizontal carousel instead of the
   * default grid. Opt-in (homepage feed only) so the category pages that also
   * use this component keep their existing grid layout.
   */
  autoScroll?: boolean;
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
      {visible.map((section) => {
        // Carousel shows the full row (it scrolls); the grid caps at four.
        const items = autoScroll ? section.items : section.items.slice(0, 4);
        const cards = items.map((item, index) => (
          <li
            key={`${section.key}-${item.kind}-${item.experience?.id ?? item.event?.id ?? index}`}
            className={cn(
              "flex flex-col gap-2",
              autoScroll && "w-[78vw] max-w-[300px] shrink-0 sm:w-[300px]",
            )}
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
        ));

        return (
          <section key={section.key} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="font-headline-sm text-headline-sm text-primary">
                {section.title}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {section.explanation}
              </p>
            </div>
            {autoScroll ? (
              <AutoScrollRow>{cards}</AutoScrollRow>
            ) : (
              <ul className="grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-3">
                {cards}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

/**
 * A horizontally scrolling row that slowly auto-advances on its own. Native
 * scroll/drag/swipe keep working; the auto-scroll simply yields while the user
 * interacts and resumes after a short pause. Each instance runs independently.
 *
 * - ping-pong advance (reverses at each end) → continuous, no jump-cut, and no
 *   duplicated cards (so every card stays interactive)
 * - pauses on hover / touch / focus / wheel; resumes after a short delay
 * - disabled entirely under prefers-reduced-motion (manual scrolling only)
 * - pauses while off-screen (IntersectionObserver)
 */
export function AutoScrollRow({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLUListElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const SPEED = 0.4; // px per frame — a slow, ambient drift (~24px/s)
    const RESUME_DELAY = 1800; // ms of no interaction before auto-scroll resumes

    let raf = 0;
    let resumeTimer = 0;
    let paused = false;
    let visible = true;
    let direction = 1;

    const step = () => {
      raf = requestAnimationFrame(step);
      if (paused || !visible) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return; // content fits — nothing to scroll
      el.scrollLeft += SPEED * direction;
      if (el.scrollLeft >= max - 0.5) {
        el.scrollLeft = max;
        direction = -1;
      } else if (el.scrollLeft <= 0.5) {
        el.scrollLeft = 0;
        direction = 1;
      }
    };

    const start = () => {
      if (reduce.matches) return; // manual-only
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(step);
    };
    const stop = () => cancelAnimationFrame(raf);

    const pause = () => {
      paused = true;
      window.clearTimeout(resumeTimer);
    };
    const scheduleResume = () => {
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        paused = false;
      }, RESUME_DELAY);
    };

    const onEnter = () => pause();
    const onLeave = () => scheduleResume();
    const onDown = () => pause();
    const onUp = () => scheduleResume();
    const onTouchStart = () => pause();
    const onTouchEnd = () => scheduleResume();
    const onWheel = () => {
      pause();
      scheduleResume();
    };
    const onFocusIn = () => pause();
    const onFocusOut = () => scheduleResume();

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0.1 },
    );
    io.observe(el);

    const onReduceChange = () => (reduce.matches ? stop() : start());
    reduce.addEventListener?.("change", onReduceChange);

    start();

    return () => {
      stop();
      window.clearTimeout(resumeTimer);
      io.disconnect();
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
      reduce.removeEventListener?.("change", onReduceChange);
    };
  }, []);

  return (
    <ul
      ref={ref}
      className="scrollbar-hide flex gap-gutter overflow-x-auto pb-2"
    >
      {children}
    </ul>
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
