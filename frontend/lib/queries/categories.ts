import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchCatalogSearch,
  fetchCategories,
  fetchCategory,
  fetchExperience,
  fetchExperiences,
  fetchFeatured,
  fetchFilters,
} from "@/lib/api/categories";

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
}

export function useCategory(slug: string) {
  return useQuery({
    queryKey: ["category", slug],
    queryFn: () => fetchCategory(slug),
  });
}

export function useFilters(slug: string) {
  return useQuery({
    queryKey: ["filters", slug],
    queryFn: () => fetchFilters(slug),
  });
}

/** Experiences for a category, refetched whenever the filter query changes. */
export function useExperiences(slug: string, query: string, enabled = true) {
  return useQuery({
    queryKey: ["experiences", slug, query],
    queryFn: () => fetchExperiences(slug, query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Cross-category quick search (categories grid page). Debounce `q` upstream. */
export function useCatalogSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: ["catalog-search", term],
    queryFn: () => fetchCatalogSearch(term),
    enabled: term.length >= 2,
    placeholderData: keepPreviousData,
  });
}

export function useExperience(id: string) {
  return useQuery({
    queryKey: ["experience", id],
    queryFn: () => fetchExperience(id),
  });
}

export function useFeatured(limit = 8) {
  return useQuery({
    queryKey: ["featured", limit],
    queryFn: () => fetchFeatured(limit),
  });
}
