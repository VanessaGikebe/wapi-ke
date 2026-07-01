import Image from "next/image";
import Link from "next/link";

import type { CategorySummary } from "@/lib/api/categories";
import { categoryImage } from "@/lib/images";
import { cn } from "@/lib/utils";

/** Photo-led category tile, shared by the homepage carousel and the grid. */
export function CategoryCard({
  category,
  className,
}: {
  category: CategorySummary;
  className?: string;
}) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className={cn(
        "transition-subtle group relative block aspect-[3/4] overflow-hidden rounded-xl shadow-tonal hover:shadow-tonal-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        className,
      )}
    >
      <Image
        src={category.heroImage ?? categoryImage(category.slug)}
        alt={category.name}
        fill
        referrerPolicy="no-referrer"
        sizes="(max-width: 640px) 70vw, 320px"
        className="object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
        <div>
          {category.icon && (
            <span
              aria-hidden
              className="material-symbols-outlined mb-1 block text-[28px] text-on-primary/90"
            >
              {category.icon}
            </span>
          )}
          <h3 className="font-headline-sm text-headline-sm text-on-primary">
            {category.name}
          </h3>
        </div>
        <span
          aria-hidden
          className="material-symbols-outlined transition-subtle shrink-0 text-on-primary group-hover:translate-x-1"
        >
          arrow_forward
        </span>
      </div>
    </Link>
  );
}
