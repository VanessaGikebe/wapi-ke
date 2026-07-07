/**
 * Curated, license-safe Unsplash photography — used for clean, professional
 * listing covers instead of the raw scraped photos. Pools are keyed by the live
 * category slugs, with cuisine-specific pools for restaurants so covers look
 * intentional (an Italian place gets pasta, a sushi place gets sushi, …).
 *
 * Every ID below was validated to return HTTP 200. Selection is deterministic
 * per experience id, so a listing always shows the same cover.
 */

import type { Experience } from "@/lib/types";

const photo = (id: string, w = 800, q = 65) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${q}`;

// Cover/gallery pools per category slug (Unsplash photo IDs).
const POOLS: Record<string, string[]> = {
  restaurants: [
    "1517248135467-4c7edcad34c4",
    "1414235077428-338989a2e8c0",
    "1424847651672-bf20a4b0982b",
    "1552566626-52f8b828add9",
    "1559339352-11d035aa65de",
  ],
  cafes: [
    "1495474472287-4d71bcdd2085",
    "1501339847302-ac426a4a7cbb",
    "1554118811-1e0d58224f24",
    "1509042239860-f550ce710b93",
  ],
  nightlife: [
    "1566417713940-fe7c737a9ef2",
    "1514525253161-7a46d19cd819",
    "1470337458703-46ad1756a187",
    "1514362545857-3bc16c4c7d1b",
  ],
  "outdoor-activities": [
    "1551632811-561732d1e306",
    "1454496522488-7a8e488e8606",
    "1533240332313-0db49b459ad6",
    "1530866495561-507c9faab2ed",
    "1502680390469-be75c86b636f",
  ],
  "family-activities": [
    "1503454537195-1dcabb73ffb9",
    "1540555700478-4be289fbecef",
    "1526401485004-46910ecc8e51",
  ],
  wellness: [
    "1600334089648-b0d9d3028eb2",
    "1571019613454-1cb2f99b2d8b",
    "1540555700478-4be289fbecef",
  ],
  picnics: [
    "1526401485004-46910ecc8e51",
    "1595856619767-ab739fa7daae",
    "1533174072545-7a4b6ad7a6c3",
  ],
  "museums-art": [
    "1533929736458-ca588d08c8be",
    "1611348586804-61bf6c080437",
    "1554907984-15263bfd63bd",
  ],
  coastal: [
    "1571896349842-33c89424de2d",
    "1507525428034-b723cf961d3e",
    "1519046904884-53103b34b206",
  ],
};

// Cuisine-specific pools for restaurants (matched from attributes.cuisine).
const CUISINE_POOLS: Record<string, string[]> = {
  italian: ["1551183053-bf91a1d81141", "1595295333158-4742f28fbd85"],
  pizza: ["1513104890138-7c749659a591", "1565299624946-b28f40a0ae38"],
  japanese: ["1579584425555-c3ce17fd4351", "1553621042-f6e147245754"],
  indian: ["1585937421612-70a008356fbe", "1631452180519-c014fe946bc7"],
  chinese: ["1585032226651-759b368d7246", "1563245372-f21724e3856d"],
  seafood: ["1559737558-2f5a35f4523b", "1615141982883-c7ad0e69fd62"],
  barbecue: ["1544025162-d76694265947", "1558030006-450675393462"],
  fastfood: ["1568901346375-23c9450c58cd", "1550547660-d9450f859349"],
};

const FALLBACK_IDS = [
  "1516426122078-c23e76319801",
  "1517248135467-4c7edcad34c4",
];

export const HERO_IMAGE = photo("1516426122078-c23e76319801", 1280, 70);

function hash(value: string): number {
  let h = 0;
  for (const char of value) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

function cuisineKey(cuisine: string): string | null {
  const c = cuisine.toLowerCase();
  if (c.includes("pizza")) return "pizza";
  if (c.includes("italian")) return "italian";
  if (c.includes("japanese") || c.includes("sushi") || c.includes("ramen"))
    return "japanese";
  if (c.includes("indian")) return "indian";
  if (c.includes("chinese")) return "chinese";
  if (c.includes("seafood") || c.includes("fish")) return "seafood";
  if (
    c.includes("barbecue") ||
    c.includes("bbq") ||
    c.includes("grill") ||
    c.includes("nyama")
  )
    return "barbecue";
  if (c.includes("fast food") || c.includes("burger") || c.includes("chicken"))
    return "fastfood";
  return null;
}

/** The right pool of photo IDs for an experience (cuisine-aware). */
function poolFor(experience: Experience): string[] {
  if (experience.categorySlug === "restaurants") {
    const raw = experience.attributes?.cuisine;
    const key = typeof raw === "string" ? cuisineKey(raw) : null;
    if (key && CUISINE_POOLS[key]) return CUISINE_POOLS[key];
  }
  return POOLS[experience.categorySlug] ?? FALLBACK_IDS;
}

/** The listing's real (scraped) photos from the DB, filtered to usable URLs. */
function realImages(experience: Experience): string[] {
  const imgs = experience.images;
  if (!Array.isArray(imgs)) return [];
  return imgs.filter(
    (url) => typeof url === "string" && /^https?:\/\//.test(url.trim()),
  );
}

/**
 * Cover image for a listing. Prefers the experience's own scraped photo (each
 * business has a distinct one — see backend import), so cards don't all share a
 * handful of stock images. Falls back to the curated Unsplash pool when a
 * listing has no real photo (e.g. the synthetic dev seed).
 */
export function coverImage(experience: Experience): string {
  const real = realImages(experience);
  if (real.length > 0) return real[0];
  const ids = poolFor(experience);
  return photo(ids[hash(experience.id) % ids.length], 800, 65);
}

/**
 * Multi-image gallery for the detail page. Leads with the listing's real
 * photo(s), then pads with the curated pool so the gallery still has several
 * thumbnails. Falls back entirely to the pool when there are no real photos.
 */
export function galleryForExperience(experience: Experience): string[] {
  const ids = poolFor(experience);
  const start = hash(experience.id) % ids.length;
  const rotated = [...ids.slice(start), ...ids.slice(0, start)];
  const pool = rotated.map((id) => photo(id, 1200, 68));

  const real = realImages(experience);
  if (real.length === 0) return pool;
  return [...real, ...pool].slice(0, Math.max(real.length, 5));
}

/** Category tile image (used by the category cards/carousel). */
export function categoryImage(slug: string): string {
  const ids = POOLS[slug] ?? FALLBACK_IDS;
  return photo(ids[0], 800, 65);
}
