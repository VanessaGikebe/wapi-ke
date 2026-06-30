import type { Experience } from "@/lib/types";

/** `$`–`$$$$` price indicator. */
export function priceLabel(tier: number): string {
  return "$".repeat(Math.max(1, Math.min(4, tier)));
}

/** Mock "from KSh" anchor price derived from the price tier (no payments yet). */
export function priceFromKsh(tier: number): number {
  return [0, 800, 2500, 6000, 12000][Math.max(1, Math.min(4, tier))];
}

/** String attribute values (cuisine, difficulty, …) shown as tags. */
export function experienceTags(experience: Experience): string[] {
  return Object.entries(experience.attributes)
    .filter(([key]) => key !== "rating")
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === "string");
}

function hash(value: string): number {
  let h = 0;
  for (const char of value) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

const AMENITY_POOL = [
  "Parking",
  "Free Wi-Fi",
  "Card payments",
  "Wheelchair access",
  "Outdoor seating",
  "Restrooms",
  "Family friendly",
  "Reservations",
];

/** Deterministic amenity list (mock — no amenities table yet). */
export function experienceAmenities(experience: Experience): string[] {
  const seed = hash(experience.id);
  return AMENITY_POOL.filter((_, i) => (seed >> i) & 1).slice(0, 6);
}

export interface MockReview {
  name: string;
  rating: number;
  date: string;
  text: string;
}

const REVIEW_NAMES = [
  "Wanjiru",
  "Brian",
  "Aisha",
  "Kevin",
  "Naomi",
  "Otieno",
  "Zawadi",
  "Mwangi",
];
const REVIEW_TEXTS = [
  "Absolutely loved it — exactly what we were hoping for. Will be back.",
  "Great vibe and friendly staff. A little busy on weekends but worth it.",
  "Hidden gem. The views alone made the trip worthwhile.",
  "Solid experience overall. Easy to find and well organised.",
  "Perfect for a relaxed afternoon. Highly recommend to anyone visiting.",
];

/** Deterministic mock reviews for the detail page. */
export function experienceReviews(experience: Experience): MockReview[] {
  const seed = hash(experience.id);
  return Array.from({ length: 3 }).map((_, i) => {
    const n = (seed + i * 7) % REVIEW_NAMES.length;
    const t = (seed + i * 3) % REVIEW_TEXTS.length;
    const rating = 4 + ((seed + i) % 2);
    return {
      name: `${REVIEW_NAMES[n]} ${String.fromCharCode(65 + ((seed + i) % 26))}.`,
      rating,
      date: ["Last week", "2 weeks ago", "Last month"][i] ?? "Recently",
      text: REVIEW_TEXTS[t],
    };
  });
}

export interface MockContact {
  phone: string;
  email: string;
  mapsUrl: string;
}

export function experienceContact(experience: Experience): MockContact {
  const seed = hash(experience.id);
  const digits = String(700000000 + (seed % 99999999)).padStart(9, "0");
  const phone = `+254 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
  const handle = experience.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
  const query = encodeURIComponent(
    `${experience.title}, ${experience.location ?? "Kenya"}`,
  );
  return {
    phone,
    email: `hello@${handle || "wapike"}.co.ke`,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${query}`,
  };
}
