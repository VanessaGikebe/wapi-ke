"use client";

import type { FilterState, FilterValue } from "@/lib/filtering";
import type { FilterDefinition } from "@/lib/types";

import { FilterControl } from "./filter-control";

/**
 * The filter sidebar — just maps the category's `FilterDefinition[]` to generic
 * {@link FilterControl}s. It has no knowledge of any specific category.
 */
export function FilterSidebar({
  filters,
  state,
  activeCount,
  onChange,
  onClear,
}: {
  filters: FilterDefinition[];
  state: FilterState;
  activeCount: number;
  onChange: (key: string, value: FilterValue) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-tonal">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-label-md text-label-md uppercase tracking-wider text-primary">
          Filters
        </h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="transition-subtle font-label-md text-label-md uppercase text-secondary hover:opacity-70"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-col divide-y divide-surface-variant">
        {filters.map((filter) => (
          <div key={filter.key} className="py-5 first:pt-3 last:pb-0">
            <FilterControl
              filter={filter}
              value={state[filter.key]}
              onChange={(value) => onChange(filter.key, value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
