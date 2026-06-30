import type { Experience, FilterDefinition, RangeOptions } from "@/lib/types";

/**
 * Client-side filtering — fully generic over a `FilterDefinition[]` schema, so
 * it works for any category without modification. In Phase 9 this moves
 * server-side (query params on `GET .../experiences`), but the state shape and
 * UI stay the same.
 */

/** Per-filter UI state: enum -> selected values, range -> threshold, boolean -> on/off. */
export type FilterValue = string[] | number | boolean;
export type FilterState = Record<string, FilterValue>;

/** Build the "nothing applied" state for a schema (all results visible). */
export function initFilterState(filters: FilterDefinition[]): FilterState {
  const state: FilterState = {};
  for (const filter of filters) {
    if (filter.type === "enum") {
      state[filter.key] = [];
    } else if (filter.type === "range") {
      state[filter.key] = (filter.options as RangeOptions).max;
    } else {
      state[filter.key] = false;
    }
  }
  return state;
}

/** True if an experience passes every active filter (filters AND together). */
export function experienceMatches(
  experience: Experience,
  filters: FilterDefinition[],
  state: FilterState,
): boolean {
  for (const filter of filters) {
    const value = state[filter.key];
    const attribute = experience.attributes[filter.key];

    if (filter.type === "enum" && Array.isArray(value) && value.length > 0) {
      // Selection is an OR set; the attribute may be one value or several.
      const attrs = Array.isArray(attribute) ? attribute : [attribute];
      if (!value.some((selected) => attrs.includes(selected))) return false;
    } else if (filter.type === "range" && typeof value === "number") {
      // Range acts as a "max" threshold.
      if (typeof attribute === "number" && attribute > value) return false;
    } else if (filter.type === "boolean" && value === true) {
      if (attribute !== true) return false;
    }
  }
  return true;
}

/**
 * Serialise the active filter state into a backend query string. Mirrors the
 * server-side matching semantics: enum -> repeated params, range -> a single
 * "max" value (only when below the cap), boolean -> "true" only when on.
 */
export function filterStateToQuery(
  filters: FilterDefinition[],
  state: FilterState,
): string {
  const params = new URLSearchParams();
  for (const filter of filters) {
    const value = state[filter.key];
    if (filter.type === "enum" && Array.isArray(value)) {
      for (const v of value) params.append(filter.key, v);
    } else if (filter.type === "range" && typeof value === "number") {
      if (value < (filter.options as RangeOptions).max) {
        params.set(filter.key, String(value));
      }
    } else if (filter.type === "boolean" && value === true) {
      params.set(filter.key, "true");
    }
  }
  return params.toString();
}

/** Minimal read interface satisfied by both URLSearchParams and Next's ReadonlyURLSearchParams. */
export interface ReadableParams {
  get(key: string): string | null;
  getAll(key: string): string[];
}

/**
 * Seed filter state from URL query params (the inverse of
 * {@link filterStateToQuery}). Used to land on a listing pre-filtered — e.g.
 * from the AI assistant's suggestion. Unknown/invalid params fall back to the
 * filter's default.
 */
export function queryToFilterState(
  filters: FilterDefinition[],
  params: ReadableParams,
): FilterState {
  const state = initFilterState(filters);
  for (const filter of filters) {
    if (filter.type === "enum") {
      const values = params.getAll(filter.key);
      if (values.length > 0) state[filter.key] = values;
    } else if (filter.type === "range") {
      const raw = params.get(filter.key);
      if (raw !== null && raw !== "" && !Number.isNaN(Number(raw))) {
        state[filter.key] = Number(raw);
      }
    } else if (filter.type === "boolean") {
      if (params.get(filter.key) === "true") state[filter.key] = true;
    }
  }
  return state;
}

/** How many filters are currently narrowing results (for badges / "Clear"). */
export function countActiveFilters(
  filters: FilterDefinition[],
  state: FilterState,
): number {
  let count = 0;
  for (const filter of filters) {
    const value = state[filter.key];
    if (filter.type === "enum" && Array.isArray(value) && value.length > 0) {
      count += 1;
    } else if (
      filter.type === "range" &&
      typeof value === "number" &&
      value < (filter.options as RangeOptions).max
    ) {
      count += 1;
    } else if (filter.type === "boolean" && value === true) {
      count += 1;
    }
  }
  return count;
}
