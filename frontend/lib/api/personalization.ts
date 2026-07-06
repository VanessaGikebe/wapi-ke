import { apiFetch } from "@/lib/api/client";
import type { WapikeEvent } from "@/lib/api/events";
import type { Experience } from "@/lib/types";

export interface PreferenceProfile {
  completedOnboarding: boolean;
  interests: string[];
  categories: string[];
  budgetTiers: number[];
  vibes: string[];
  preferences: Record<string, unknown>;
}

export interface PreferenceProfileInput {
  interests: string[];
  categories: string[];
  budgetTiers: number[];
  vibes: string[];
  preferences: Record<string, unknown>;
}

export type InteractionType =
  | "search"
  | "view"
  | "save"
  | "booking"
  | "review"
  | "dwell"
  | "filter"
  | "not_interested";

export interface InteractionInput {
  interactionType: InteractionType;
  experienceId?: string;
  categorySlug?: string;
  searchQuery?: string;
  weight?: number;
  context?: Record<string, unknown>;
}

export interface RecommendationItem {
  kind: "experience" | "event";
  reason: string;
  confidence: number | null;
  experience: Experience | null;
  event: WapikeEvent | null;
}

export interface RecommendationSection {
  key: string;
  title: string;
  explanation: string;
  items: RecommendationItem[];
}

interface ApiProfile {
  completed_onboarding: boolean;
  interests: string[];
  categories: string[];
  budget_tiers: number[];
  vibes: string[];
  preferences: Record<string, unknown>;
}

interface ApiRecommendationResponse {
  sections: Array<{
    key: string;
    title: string;
    explanation: string;
    items: Array<{
      kind: "experience" | "event";
      reason: string;
      confidence: number | null;
      experience: ApiExperience | null;
      event: ApiEvent | null;
    }>;
  }>;
}

interface ApiExperience {
  id: string;
  category_slug: string;
  title: string;
  description: string | null;
  images: string[];
  location: string | null;
  price_tier: number;
  attributes: Record<string, unknown>;
}

interface ApiEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  venue: string | null;
  county: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  organizer: string | null;
  contact: string | null;
  ticket_url: string | null;
  ticket_price: number | null;
  currency: string;
  start_datetime: string;
  end_datetime: string | null;
  featured: boolean;
  status: WapikeEvent["status"];
}

function toProfile(profile: ApiProfile): PreferenceProfile {
  return {
    completedOnboarding: profile.completed_onboarding,
    interests: profile.interests,
    categories: profile.categories,
    budgetTiers: profile.budget_tiers,
    vibes: profile.vibes,
    preferences: profile.preferences,
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

function toEvent(e: ApiEvent): WapikeEvent {
  return {
    id: e.id,
    title: e.title,
    slug: e.slug,
    description: e.description,
    category: e.category,
    venue: e.venue,
    county: e.county,
    city: e.city,
    address: e.address,
    latitude: e.latitude,
    longitude: e.longitude,
    imageUrl: e.image_url,
    organizer: e.organizer,
    contact: e.contact,
    ticketUrl: e.ticket_url,
    ticketPrice: e.ticket_price,
    currency: e.currency,
    startDatetime: e.start_datetime,
    endDatetime: e.end_datetime,
    featured: e.featured,
    status: e.status,
  };
}

export async function fetchPreferenceProfile(): Promise<PreferenceProfile> {
  const data = await apiFetch<ApiProfile>("/personalization/profile");
  return toProfile(data);
}

export async function savePreferenceProfile(
  input: PreferenceProfileInput,
): Promise<PreferenceProfile> {
  const data = await apiFetch<ApiProfile>("/personalization/profile", {
    method: "PUT",
    body: {
      interests: input.interests,
      categories: input.categories,
      budget_tiers: input.budgetTiers,
      vibes: input.vibes,
      preferences: input.preferences,
    },
  });
  return toProfile(data);
}

export async function recordInteraction(input: InteractionInput): Promise<void> {
  await apiFetch("/personalization/interactions", {
    method: "POST",
    body: {
      interaction_type: input.interactionType,
      experience_id: input.experienceId,
      category_slug: input.categorySlug,
      search_query: input.searchQuery,
      weight: input.weight ?? 1,
      context: input.context ?? {},
    },
  });
}

export async function fetchRecommendations(
  categorySlug: string,
  filterQuery: string,
): Promise<RecommendationSection[]> {
  const params = new URLSearchParams(filterQuery);
  params.set("category_slug", categorySlug);
  const data = await apiFetch<ApiRecommendationResponse>(
    "/personalization/recommendations",
    { query: params.toString() },
  );
  return data.sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      kind: item.kind,
      reason: item.reason,
      confidence: item.confidence,
      experience: item.experience ? toExperience(item.experience) : null,
      event: item.event ? toEvent(item.event) : null,
    })),
  }));
}
