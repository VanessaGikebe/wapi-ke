"use client";

import * as React from "react";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { useCatalogSearch } from "@/lib/queries/categories";
import { cn } from "@/lib/utils";

/**
 * Cross-category quick search for the Browse Categories page. Searches across
 * all categories + experiences (not scoped to one category) and shows results
 * as a dropdown quick-list that links straight into a category or experience.
 * Debounced so it fires at most once per pause in typing, not per keystroke.
 */
export function CategorySearch() {
  const [raw, setRaw] = React.useState("");
  const [term, setTerm] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Debounce: only push the query 250ms after the last keystroke.
  React.useEffect(() => {
    const id = setTimeout(() => setTerm(raw), 250);
    return () => clearTimeout(id);
  }, [raw]);

  // Close on click / focus outside.
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const query = useCatalogSearch(term);
  const active = term.trim().length >= 2;
  const categories = query.data?.categories ?? [];
  const experiences = query.data?.experiences ?? [];
  const hasResults = categories.length > 0 || experiences.length > 0;
  const showDropdown = open && active;

  return (
    <div ref={containerRef} className="relative max-w-xl">
      <span
        aria-hidden
        className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
      >
        search
      </span>
      <Input
        type="search"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search all experiences and categories…"
        aria-label="Search all experiences and categories"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="category-search-results"
        className="pl-10"
      />

      {showDropdown && (
        <div
          id="category-search-results"
          role="listbox"
          className="absolute z-30 mt-2 max-h-[70vh] w-full overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-2 shadow-tonal-lg"
        >
          {query.isLoading ? (
            <p className="px-3 py-4 font-body-md text-body-md text-on-surface-variant">
              Searching…
            </p>
          ) : !hasResults ? (
            <p className="px-3 py-4 font-body-md text-body-md text-on-surface-variant">
              No matches for “{term.trim()}”.
            </p>
          ) : (
            <>
              {categories.length > 0 && (
                <Section label="Categories">
                  {categories.map((c) => (
                    <ResultLink
                      key={c.slug}
                      href={`/categories/${c.slug}`}
                      icon={c.icon || "category"}
                      title={c.name}
                      subtitle="Category"
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </Section>
              )}
              {experiences.length > 0 && (
                <Section label="Experiences">
                  {experiences.map((e) => (
                    <ResultLink
                      key={e.id}
                      href={`/experiences/${e.id}`}
                      icon="place"
                      title={e.title}
                      subtitle={e.location || "Experience"}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1 last:mb-0">
      <p className="px-3 pb-1 pt-2 font-caption text-caption uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>
      <ul>{children}</ul>
    </div>
  );
}

function ResultLink({
  href,
  icon,
  title,
  subtitle,
  onNavigate,
}: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        role="option"
        aria-selected={false}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5",
          "hover:bg-surface-container focus-visible:bg-surface-container focus-visible:outline-none",
        )}
      >
        <span
          aria-hidden
          className="material-symbols-outlined text-[20px] text-primary"
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-label-md text-label-md text-on-surface">
            {title}
          </span>
          <span className="block truncate font-caption text-caption text-on-surface-variant">
            {subtitle}
          </span>
        </span>
      </Link>
    </li>
  );
}
