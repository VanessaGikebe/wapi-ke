import type { Experience } from "@/lib/types";

/** `$`–`$$$$` price indicator. */
export function priceLabel(tier: number): string {
  return "$".repeat(Math.max(1, Math.min(4, tier)));
}

/** Mock "from KSh" anchor price derived from the price tier (no payments yet). */
export function priceFromKsh(tier: number): number {
  return [0, 800, 2500, 6000, 12000][Math.max(1, Math.min(4, tier))];
}

function attrString(experience: Experience, key: string): string | undefined {
  const value = experience.attributes[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

/**
 * Headline price text — the real Google price range when present
 * (e.g. "KES 1,000–3,000"), else a "From KSh …" anchor from the tier.
 */
export function priceText(experience: Experience): string {
  const real = attrString(experience, "price_label");
  if (real) return real;
  return `From KSh ${priceFromKsh(experience.priceTier).toLocaleString()}`;
}

/** Short, meaningful tags for a card — real cuisine / place type. */
export function experienceTags(experience: Experience): string[] {
  const cuisine = attrString(experience, "cuisine");
  const type = attrString(experience, "type");
  const tags: string[] = [];
  if (cuisine) tags.push(cuisine);
  if (
    type &&
    !(cuisine && type.toLowerCase().startsWith(cuisine.toLowerCase()))
  ) {
    tags.push(type);
  }
  return tags;
}

function hash(value: string): number {
  let h = 0;
  for (const char of value) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

// Attribute key -> human label, for the real amenities derived from the data.
const AMENITY_LABELS: Record<string, string> = {
  outdoor_seating: "Outdoor seating",
  rooftop: "Rooftop seating",
  takeaway: "Takeaway",
  delivery: "Delivery",
  dine_in: "Dine-in",
  drive_through: "Drive-through",
  serves_alcohol: "Serves alcohol",
  cocktails: "Cocktails",
  craft_beer: "Craft beer",
  wine: "Wine",
  happy_hour: "Happy hour",
  live_music: "Live music",
  dancing: "Dancing / DJ",
  sports: "Sports on TV",
  karaoke: "Karaoke",
  great_coffee: "Great coffee",
  great_tea: "Great tea selection",
  brunch: "Brunch",
  breakfast: "Breakfast",
  desserts: "Desserts",
  vegetarian: "Vegetarian options",
  vegan: "Vegan options",
  halal: "Halal",
  healthy: "Healthy options",
  wifi: "Free Wi-Fi",
  work_friendly: "Work-friendly",
  bar_onsite: "Bar on site",
  good_for_kids: "Good for kids",
  kids_menu: "Kids' menu",
  high_chairs: "High chairs",
  playground: "Playground",
  swings: "Swings",
  slides: "Slides",
  picnic_tables: "Picnic tables",
  bbq: "Barbecue grill",
  hiking: "Hiking",
  cycling: "Cycling",
  camping: "Camping",
  dog_friendly: "Dog-friendly",
  wheelchair: "Wheelchair accessible",
  free_parking: "Free parking",
  reservations: "Accepts reservations",
  by_appointment: "By appointment",
  sauna: "Sauna",
  skincare: "Skincare treatments",
  women_owned: "Women-owned",
  romantic: "Romantic",
  cozy: "Cosy",
  trendy: "Trendy",
  upscale: "Upscale",
  quiet: "Quiet",
  groups: "Good for groups",
  family_friendly: "Family-friendly",
  late_night: "Late-night food",
  catering: "Catering",
  private_dining: "Private dining",
  fireplace: "Fireplace",
  free_breakfast: "Free breakfast",
};

const AMENITY_FALLBACK = ["Card payments", "Restrooms", "Parking"];

/** Real amenities from the scraped attributes (falls back to a safe default). */
export function experienceAmenities(experience: Experience): string[] {
  const real = Object.keys(AMENITY_LABELS)
    .filter((key) => experience.attributes[key] === true)
    .map((key) => AMENITY_LABELS[key])
    .slice(0, 9);
  return real.length > 0 ? real : AMENITY_FALLBACK;
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

export interface ExperienceContact {
  phone: string;
  website: string | null;
  mapsUrl: string;
}

/** Real contact details from the data, with sensible fallbacks. */
export function experienceContact(experience: Experience): ExperienceContact {
  const seed = hash(experience.id);
  const digits = String(700000000 + (seed % 99999999)).padStart(9, "0");
  const fallbackPhone = `+254 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
  const query = encodeURIComponent(
    `${experience.title}, ${experience.location ?? "Kenya"}`,
  );
  return {
    phone: attrString(experience, "phone") ?? fallbackPhone,
    website: attrString(experience, "website") ?? null,
    mapsUrl:
      attrString(experience, "google_url") ??
      `https://www.google.com/maps/search/?api=1&query=${query}`,
  };
}
