"use client";

import { PersonalizedSections } from "@/components/categories/personalized-sections";
import type { RecommendationSection } from "@/lib/api/personalization";
import { useRecommendations } from "@/lib/queries/personalization";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Personalized homepage rows. These are split into two separately-placed
 * carousels (Recommended For You near the top, Discover Hidden Gems lower down)
 * so the homepage can interleave the non-personalized sections between them.
 *
 * Both read the same recommendations query (React Query dedupes to a single
 * fetch), and both are gated to signed-in consumer accounts — anonymous or
 * admin/business visitors render nothing here. Each renders using the shared
 * auto-scrolling carousel (`PersonalizedSections autoScroll`).
 */
function usePersonalizedFeed() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accountType = useAuthStore((s) => s.accountType);
  const enabled = isAuthenticated && accountType === "user";
  const query = useRecommendations("", "", enabled);
  return { enabled, data: query.data, isLoading: query.isLoading };
}

function FeedRow({
  loading,
  sections,
}: {
  loading: boolean;
  sections: RecommendationSection[];
}) {
  // Collapse the whole row (padding included) when there's nothing to show.
  if (!loading && sections.length === 0) return null;
  return (
    <section className="bg-surface px-margin-mobile pt-section-mobile md:px-margin-desktop md:pt-section">
      <div className="mx-auto max-w-container-max">
        <PersonalizedSections sections={sections} loading={loading} autoScroll />
      </div>
    </section>
  );
}

export function RecommendedForYou() {
  const { enabled, data, isLoading } = usePersonalizedFeed();
  if (!enabled) return null;
  const recommended = data?.find((s) => s.key === "recommended");
  return <FeedRow loading={isLoading} sections={recommended ? [recommended] : []} />;
}

export function DiscoverHiddenGems() {
  const { enabled, data, isLoading } = usePersonalizedFeed();
  if (!enabled) return null;
  const merged = mergeHiddenGems(data);
  return <FeedRow loading={isLoading} sections={merged ? [merged] : []} />;
}

/**
 * Combine the backend's separate "hidden_gems" and "discover_new" sections into
 * one "Discover Hidden Gems" carousel (de-duped by experience/event id). This is
 * a presentation-only merge — the scoring/recommendations math is untouched.
 */
function mergeHiddenGems(
  data: RecommendationSection[] | undefined,
): RecommendationSection | null {
  if (!data) return null;
  const combined = [
    ...(data.find((s) => s.key === "hidden_gems")?.items ?? []),
    ...(data.find((s) => s.key === "discover_new")?.items ?? []),
  ];
  const seen = new Set<string>();
  const items = combined.filter((item) => {
    const id = item.experience?.id ?? item.event?.id;
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  if (items.length === 0) return null;
  return {
    key: "discover_hidden_gems",
    title: "Discover Hidden Gems",
    explanation:
      "Under-the-radar spots and fresh picks, chosen to broaden what you explore.",
    items,
  };
}
