"use client";

import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/lib/queries/categories";

import { CategoryCard } from "./category-card";

/**
 * Auto-scrolling, infinitely looping category carousel. Pauses on hover and
 * while the user is dragging, supports native swipe, and respects
 * `prefers-reduced-motion` (no auto-scroll, still manually scrollable).
 */
export function CategoriesCarousel() {
  const { data: categories, isLoading, isError } = useCategories();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const pausedRef = React.useRef(false);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el || !categories || categories.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const tick = () => {
      if (!pausedRef.current) {
        el.scrollLeft += 0.5;
        const half = el.scrollWidth / 2;
        if (half > 0 && el.scrollLeft >= half) el.scrollLeft -= half;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [categories]);

  const pause = () => {
    pausedRef.current = true;
  };
  const resume = () => {
    pausedRef.current = false;
  };

  if (isLoading) return <CarouselSkeleton />;
  if (isError || !categories || categories.length === 0) return null;

  // Duplicate the list so the scroll can loop seamlessly.
  const loop = [...categories, ...categories];

  return (
    <div
      ref={scrollRef}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onPointerDown={pause}
      onPointerUp={resume}
      className="scrollbar-hide flex gap-gutter overflow-x-auto pb-2"
    >
      {loop.map((category, index) => (
        <CategoryCard
          key={`${category.slug}-${index}`}
          category={category}
          className="w-60 shrink-0 sm:w-72"
        />
      ))}
    </div>
  );
}

function CarouselSkeleton() {
  return (
    <div className="flex gap-gutter overflow-hidden pb-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton
          key={i}
          className="aspect-[3/4] w-60 shrink-0 rounded-xl sm:w-72"
        />
      ))}
    </div>
  );
}
