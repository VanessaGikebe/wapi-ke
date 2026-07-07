/**
 * Category + experience API calls. Adapts the backend response shape
 * (snake_case, rating nested in `attributes`) to the frontend types.
 */

import { apiFetch } from "@/lib/api/client";
import type { Experience, FilterDefinition } from "@/lib/types";

export interface CategorySummary {
  slug: string;
  name: string;
  icon: string;
  heroImage: string | null;
}

interface ApiCategory {
  id: string;
  slug: string;
  name: string;
  hero_image: string | null;
  icon: string | null;
}

interface ApiFilterDefinition {
  id: string;
  key: string;
  label: string;
  type: FilterDefinition["type"];
  options: FilterDefinition["options"];
}

interface ApiExperience {
  id: string;
  category_id: string;
  category_slug: string;
  title: string;
  description: string | null;
  images: string[];
  location: string | null;
  lat: number | null;
  lng: number | null;
  price_tier: number;
  attributes: Record<string, unknown>;
}

interface ApiPaginatedExperiences {
  items: ApiExperience[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function toCategorySummary(c: ApiCategory): CategorySummary {
  return {
    slug: c.slug,
    name: c.name,
    icon: c.icon ?? "",
    heroImage: c.hero_image,
  };
}

function toExperience(e: ApiExperience): Experience {
  const rating = e.attributes?.rating;
  return {
    id: e.id,
    categorySlug: e.category_slug,
    title: e.title,
    description: e.description ?? "",
    location: e.location ?? "",
    priceTier: e.price_tier,
    rating: typeof rating === "number" ? rating : 0,
    images: Array.isArray(e.images) ? e.images : [],
    attributes: e.attributes as Experience["attributes"],
  };
}

export async function fetchExperience(id: string): Promise<Experience> {
  const data = await apiFetch<ApiExperience>(`/experiences/${id}`);
  return toExperience(data);
}

export async function fetchFeatured(limit = 8): Promise<Experience[]> {
  const data = await apiFetch<ApiExperience[]>("/experiences/featured", {
    query: `limit=${limit}`,
  });
  return data.map(toExperience);
}

export async function fetchCategories(): Promise<CategorySummary[]> {
  const data = await apiFetch<ApiCategory[]>("/categories");
  return data.map(toCategorySummary);
}

export async function fetchCategory(slug: string): Promise<CategorySummary> {
  const data = await apiFetch<ApiCategory>(`/categories/${slug}`);
  return toCategorySummary(data);
}

export async function fetchFilters(slug: string): Promise<FilterDefinition[]> {
  const data = await apiFetch<ApiFilterDefinition[]>(
    `/categories/${slug}/filters`,
  );
  return data.map((f) => ({
    key: f.key,
    label: f.label,
    type: f.type,
    options: f.options,
  }));
}

export interface ExperiencePage {
  items: Experience[];
  total: number;
}

export async function fetchExperiences(
  slug: string,
  query: string,
): Promise<ExperiencePage> {
  const data = await apiFetch<ApiPaginatedExperiences>(
    `/categories/${slug}/experiences`,
    { query },
  );
  return {
    items: data.items.map(toExperience),
    total: data.total,
  };
}

export interface CatalogSearchResults {
  categories: CategorySummary[];
  experiences: Experience[];
}

/** Cross-category quick search for the categories grid page. */
export async function fetchCatalogSearch(
  q: string,
): Promise<CatalogSearchResults> {
  const data = await apiFetch<{
    categories: ApiCategory[];
    experiences: ApiExperience[];
  }>("/categories/search", { query: `q=${encodeURIComponent(q)}` });
  return {
    categories: data.categories.map(toCategorySummary),
    experiences: data.experiences.map(toExperience),
  };
}
