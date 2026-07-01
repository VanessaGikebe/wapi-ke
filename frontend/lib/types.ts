/**
 * Domain types shared by the mock catalog today and the real API client in
 * Phase 9. Mirrors the data model in CLAUDE.md §7.
 */

export type FilterType = "enum" | "range" | "boolean";

/** Options payload for an `enum` filter. */
export interface EnumOptions {
  values: string[];
}

/** Options payload for a `range` filter. */
export interface RangeOptions {
  min: number;
  max: number;
  step?: number;
  /** Unit suffix shown next to the value, e.g. "km", "hrs". */
  unit?: string;
  /** "currency" renders the value as `$` tiers instead of a number. */
  format?: "plain" | "currency";
}

/**
 * A single filter for a category. The frontend renders one generic control per
 * definition based on `type` — never hardcoded per `key`.
 */
export interface FilterDefinition {
  key: string;
  label: string;
  type: FilterType;
  options?: EnumOptions | RangeOptions;
}

export type AttributeValue = string | string[] | number | boolean;

export interface Experience {
  id: string;
  categorySlug: string;
  title: string;
  description: string;
  location: string;
  /** 1–4, rendered as `$`–`$$$$`. */
  priceTier: number;
  rating: number;
  /** Real business photos (from the scraped dataset); may be empty. */
  images: string[];
  /** Keyed by filter `key` — the values filters match against. */
  attributes: Record<string, AttributeValue>;
}

export interface Category {
  slug: string;
  name: string;
  /** Material Symbols icon name. */
  icon: string;
  description: string;
  filters: FilterDefinition[];
}
