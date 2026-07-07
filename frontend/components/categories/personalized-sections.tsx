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
                variant="subtle"
                size="sm"
                className="shrink-0"
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
const AUTO_SCROLL_SPEED = 0.4; // px per frame — a slow, ambient drift (~24px/s)
const AUTO_SCROLL_RESUME_DELAY = 1800; // ms of no interaction before it resumes

export function AutoScrollRow({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLUListElement>(null);
  // Shared across the drift loop and the arrow buttons so a click pauses the
  // auto-scroll for a beat, then it resumes.
  const pausedRef = React.useRef(false);
  const resumeTimerRef = React.useRef(0);
  const [canLeft, setCanLeft] = React.useState(false);
  const [canRight, setCanRight] = React.useState(false);

  const updateArrows = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // setState bails out when the boolean is unchanged, so the auto-scroll's
    // continuous scroll events don't cause per-frame re-renders.
    setCanLeft(el.scrollLeft > 1);
    setCanRight(max > 1 && el.scrollLeft < max - 1);
  }, []);

  const pause = React.useCallback(() => {
    pausedRef.current = true;
    window.clearTimeout(resumeTimerRef.current);
  }, []);
  const scheduleResume = React.useCallback(() => {
    window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      pausedRef.current = false;
    }, AUTO_SCROLL_RESUME_DELAY);
  }, []);

  const scrollByPage = React.useCallback(
    (dir: 1 | -1) => {
      const el = ref.current;
      if (!el) return;
      pause();
      scheduleResume();
      // Advance by roughly a viewport-width of cards per click.
      const amount = Math.max(el.clientWidth * 0.85, 260);
      el.scrollBy({ left: dir * amount, behavior: "smooth" });
    },
    [pause, scheduleResume],
  );

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let visible = true;
    let direction = 1;

    const step = () => {
      raf = requestAnimationFrame(step);
      if (pausedRef.current || !visible) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return; // content fits — nothing to scroll
      el.scrollLeft += AUTO_SCROLL_SPEED * direction;
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
    const onScroll = () => updateArrows();

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);
    el.addEventListener("scroll", onScroll, { passive: true });

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0.1 },
    );
    io.observe(el);

    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);

    const onReduceChange = () => (reduce.matches ? stop() : start());
    reduce.addEventListener?.("change", onReduceChange);

    updateArrows();
    start();

    return () => {
      stop();
      window.clearTimeout(resumeTimerRef.current);
      io.disconnect();
      ro.disconnect();
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
      el.removeEventListener("scroll", onScroll);
      reduce.removeEventListener?.("change", onReduceChange);
    };
  }, [pause, scheduleResume, updateArrows]);

  return (
    <div className="relative">
      <ScrollButton
        direction="left"
        visible={canLeft}
        onClick={() => scrollByPage(-1)}
      />
      <ul
        ref={ref}
        className="scrollbar-hide flex gap-gutter overflow-x-auto pb-2"
      >
        {children}
      </ul>
      <ScrollButton
        direction="right"
        visible={canRight}
        onClick={() => scrollByPage(1)}
      />
    </div>
  );
}

/** Circular prev/next control overlaid on the carousel edges (sm+ only). */
function ScrollButton({
  direction,
  visible,
  onClick,
}: {
  direction: "left" | "right";
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={onClick}
      className={cn(
        "absolute top-[38%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant bg-surface/90 text-on-surface shadow-md backdrop-blur transition hover:bg-surface hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:flex",
        direction === "left" ? "left-2" : "right-2",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <ChevronIcon className={cn("h-5 w-5", direction === "left" && "rotate-180")} />
    </button>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
