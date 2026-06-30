
import type {
  Category,
  EnumOptions,
  Experience,
  FilterDefinition,
  RangeOptions,
} from "@/lib/types";

/*
 * Mock catalog — the single source of truth for categories, their filter
 * schemas (CLAUDE.md §6), and sample experiences.
 *
 * Phase 9 replaces the exported getters with real API calls
 * (`GET /api/v1/categories`, `.../{slug}/filters`, `.../{slug}/experiences`).
 * Nothing in the UI references this file directly except those getters, so the
 * swap is contained.
 *
 * Experiences are generated deterministically from each category's filter
 * schema (no random / Date), so attributes always line up with filter keys and
 * SSR matches the client.
 */

type CategoryDef = Omit<Category, "filters"> & {
  filters: FilterDefinition[];
  seeds: { title: string; location: string }[];
};

const CATEGORY_DEFS: CategoryDef[] = [
  {
    slug: "restaurants",
    name: "Restaurants",
    icon: "restaurant",
    description:
      "From fine dining to hidden local gems — culinary experiences that blend modern elegance with authentic heritage.",
    filters: [
      {
        key: "cuisine",
        label: "Cuisine",
        type: "enum",
        options: {
          values: [
            "Italian",
            "Swahili",
            "Indian",
            "Japanese",
            "Continental",
            "Ethiopian",
            "Seafood",
          ],
        },
      },
      {
        key: "price_tier",
        label: "Price range",
        type: "range",
        options: { min: 1, max: 4, step: 1, format: "currency" },
      },
      {
        key: "dining_style",
        label: "Dining style",
        type: "enum",
        options: { values: ["Fine dining", "Casual", "Rooftop", "Buffet"] },
      },
      {
        key: "dietary",
        label: "Dietary preference",
        type: "enum",
        options: { values: ["Vegetarian", "Vegan", "Halal", "Gluten-free"] },
      },
      {
        key: "seating",
        label: "Seating",
        type: "enum",
        options: { values: ["Indoor", "Outdoor"] },
      },
      {
        key: "ambience",
        label: "Atmosphere",
        type: "enum",
        options: { values: ["Romantic", "Family-friendly"] },
      },
    ],
    seeds: [
      { title: "The Savannah Room", location: "Nairobi" },
      { title: "Altitude Lounge", location: "Westlands" },
      { title: "Ocean Drift", location: "Mombasa" },
      { title: "Atelier 42", location: "Karen" },
      { title: "The Greenhouse", location: "Kilimani" },
      { title: "Mara Under Canvas", location: "Masai Mara" },
      { title: "Tamarind Terrace", location: "Diani" },
      { title: "Nyama Republic", location: "Nakuru" },
    ],
  },
  {
    slug: "hiking",
    name: "Hiking",
    icon: "hiking",
    description:
      "Trails for every level, from gentle forest loops to summit climbs — with waterfalls, camping, and big-sky views.",
    filters: [
      {
        key: "difficulty",
        label: "Difficulty",
        type: "enum",
        options: { values: ["Beginner", "Intermediate", "Advanced"] },
      },
      {
        key: "group",
        label: "Group type",
        type: "enum",
        options: { values: ["Solo", "Group"] },
      },
      {
        key: "duration_hours",
        label: "Duration",
        type: "range",
        options: { min: 1, max: 12, step: 1, unit: "hrs" },
      },
      {
        key: "distance_km",
        label: "Distance",
        type: "range",
        options: { min: 1, max: 30, step: 1, unit: "km" },
      },
      { key: "waterfalls", label: "Waterfalls", type: "boolean" },
      { key: "camping", label: "Camping available", type: "boolean" },
      { key: "pet_friendly", label: "Pet-friendly", type: "boolean" },
    ],
    seeds: [
      { title: "Karura Forest Loop", location: "Nairobi" },
      { title: "Ngong Hills Ridge", location: "Ngong" },
      { title: "Mount Longonot Crater", location: "Naivasha" },
      { title: "Aberdare Falls Trail", location: "Aberdares" },
      { title: "Elephant Hill Climb", location: "Nyandarua" },
      { title: "Hell's Gate Gorge", location: "Naivasha" },
      { title: "Mt Kenya Sirimon Route", location: "Nanyuki" },
      { title: "Karima Hill", location: "Nyeri" },
    ],
  },
  {
    slug: "picnics",
    name: "Picnics",
    icon: "deck",
    description:
      "Scenic spots to slow down — lakesides, parks, and viewpoints set up for lazy afternoons.",
    filters: [
      {
        key: "location_type",
        label: "Location",
        type: "enum",
        options: { values: ["Lakeside", "Park", "Scenic viewpoint"] },
      },
      { key: "picnic_setup", label: "Setup provided", type: "boolean" },
      { key: "bbq", label: "BBQ facilities", type: "boolean" },
      {
        key: "audience",
        label: "Best for",
        type: "enum",
        options: { values: ["Family-friendly", "Couples"] },
      },
      { key: "accessible", label: "Wheelchair accessible", type: "boolean" },
    ],
    seeds: [
      { title: "Lake Naivasha Shore", location: "Naivasha" },
      { title: "Karura Glade", location: "Nairobi" },
      { title: "Arboretum Lawns", location: "Nairobi" },
      { title: "Limuru Tea Fields", location: "Limuru" },
      { title: "Sagana Riverside", location: "Sagana" },
      { title: "Oloolua Clearing", location: "Karen" },
    ],
  },
  {
    slug: "nightlife",
    name: "Nightlife",
    icon: "nightlife",
    description:
      "Rooftop bars, lounges, and clubs — Kenya after dark, curated.",
    filters: [
      {
        key: "venue_type",
        label: "Venue",
        type: "enum",
        options: { values: ["Club", "Lounge", "Rooftop bar"] },
      },
      {
        key: "entertainment",
        label: "Entertainment",
        type: "enum",
        options: { values: ["Live music", "Karaoke", "DJ events"] },
      },
      { key: "cocktails", label: "Cocktail bar", type: "boolean" },
      {
        key: "age_restriction",
        label: "Age restriction",
        type: "enum",
        options: { values: ["18+", "21+", "All ages"] },
      },
      {
        key: "dress_code",
        label: "Dress code",
        type: "enum",
        options: { values: ["Casual", "Smart casual", "Formal"] },
      },
    ],
    seeds: [
      { title: "Skyline Rooftop", location: "Westlands" },
      { title: "The Alchemist", location: "Westlands" },
      { title: "Brew Bistro", location: "Lavington" },
      { title: "Kiza Lounge", location: "Kilimani" },
      { title: "Havana Nights", location: "Nairobi" },
      { title: "Tribe Terrace", location: "Gigiri" },
    ],
  },
  {
    slug: "outdoor-adventures",
    name: "Outdoor Adventures",
    icon: "kayaking",
    description:
      "Adrenaline on tap — ziplining, rafting, quad biking and more, across the country.",
    filters: [
      {
        key: "activity",
        label: "Activity",
        type: "enum",
        options: {
          values: [
            "Ziplining",
            "ATV riding",
            "Horse riding",
            "Kayaking",
            "Cycling",
            "Rock climbing",
            "Paintball",
            "Quad biking",
          ],
        },
      },
    ],
    seeds: [
      { title: "Sagana Rapids Rafting", location: "Sagana" },
      { title: "Hell's Gate Cycling", location: "Naivasha" },
      { title: "Kereita Forest Zipline", location: "Kereita" },
      { title: "Swara Quad Trails", location: "Athi River" },
      { title: "Oloolua Paintball", location: "Karen" },
      { title: "Mara Horseback Safari", location: "Masai Mara" },
    ],
  },
  {
    slug: "staycations",
    name: "Staycations",
    icon: "hotel",
    description: "Cabins, resorts, and city lofts for a reset close to home.",
    filters: [
      {
        key: "stay_type",
        label: "Stay type",
        type: "enum",
        options: { values: ["Hotel", "Cabin", "Airbnb", "Luxury resort"] },
      },
      {
        key: "amenities",
        label: "Amenities",
        type: "enum",
        options: { values: ["Spa package", "Swimming pool"] },
      },
      {
        key: "view",
        label: "View",
        type: "enum",
        options: { values: ["Mountain", "Lakeside"] },
      },
    ],
    seeds: [
      { title: "Acacia Cabins", location: "Nanyuki" },
      { title: "Lakeview Resort", location: "Naivasha" },
      { title: "Hilltop Hideaway", location: "Tigoni" },
      { title: "Urban Loft", location: "Westlands" },
      { title: "Mara Tented Camp", location: "Masai Mara" },
      { title: "Coral Beach Villa", location: "Diani" },
    ],
  },
  {
    slug: "cafes",
    name: "Cafés",
    icon: "local_cafe",
    description:
      "Specialty coffee, slow brunches, and aesthetic corners worth lingering in.",
    filters: [
      {
        key: "offerings",
        label: "Known for",
        type: "enum",
        options: { values: ["Specialty coffee", "Brunch", "Desserts"] },
      },
      { key: "work_friendly", label: "Work-friendly", type: "boolean" },
      { key: "outdoor_seating", label: "Outdoor seating", type: "boolean" },
      { key: "aesthetic", label: "Aesthetic spot", type: "boolean" },
    ],
    seeds: [
      { title: "Pallet Café", location: "Karen" },
      { title: "Spring Valley Coffee", location: "Westlands" },
      { title: "The Good Earth", location: "Kilimani" },
      { title: "Arbor Brew", location: "Lavington" },
      { title: "Connect Coffee", location: "Riverside" },
      { title: "Zucchini Greens", location: "Lavington" },
    ],
  },
  {
    slug: "cultural-experiences",
    name: "Cultural Experiences",
    icon: "museum",
    description:
      "Museums, markets, and living heritage — the stories behind the places.",
    filters: [
      {
        key: "type",
        label: "Type",
        type: "enum",
        options: {
          values: [
            "Museum",
            "Art gallery",
            "Historical site",
            "Cultural village",
            "Local market",
            "Festival",
          ],
        },
      },
    ],
    seeds: [
      { title: "Nairobi National Museum", location: "Nairobi" },
      { title: "Bomas of Kenya", location: "Langata" },
      { title: "Karen Blixen Museum", location: "Karen" },
      { title: "Maasai Market", location: "Nairobi" },
      { title: "Fort Jesus", location: "Mombasa" },
      { title: "Lamu Old Town", location: "Lamu" },
    ],
  },
  {
    slug: "road-trips",
    name: "Road Trips",
    icon: "directions_car",
    description: "Scenic routes and viewpoints, mapped for the long way round.",
    filters: [
      {
        key: "highlights",
        label: "Highlights",
        type: "enum",
        options: {
          values: ["Scenic routes", "Viewpoints", "Nearby attractions"],
        },
      },
      { key: "camping_spots", label: "Camping spots", type: "boolean" },
      { key: "fuel_stops", label: "Fuel stops en route", type: "boolean" },
    ],
    seeds: [
      { title: "Rift Valley Viewpoint Run", location: "Rift Valley" },
      { title: "Nairobi–Naivasha Escarpment", location: "Naivasha" },
      { title: "Mombasa Coastal Drive", location: "Mombasa" },
      { title: "Mount Kenya Circuit", location: "Nanyuki" },
      { title: "Magadi Soda Road", location: "Magadi" },
      { title: "Aberdare Loop", location: "Nyeri" },
    ],
  },
  {
    slug: "family-activities",
    name: "Family Activities",
    icon: "family_restroom",
    description:
      "Parks, animal encounters, and play areas the whole family will love.",
    filters: [
      {
        key: "type",
        label: "Type",
        type: "enum",
        options: {
          values: [
            "Children's park",
            "Amusement park",
            "Educational attraction",
            "Animal park",
            "Indoor play area",
          ],
        },
      },
    ],
    seeds: [
      { title: "Nairobi Safari Walk", location: "Langata" },
      { title: "Two Rivers Funscape", location: "Ruaka" },
      { title: "Giraffe Centre", location: "Karen" },
      { title: "Paradise Lost", location: "Kiambu" },
      { title: "GP Karting", location: "Langata" },
      { title: "Little Explorers Park", location: "Westlands" },
    ],
  },
];

/** Deterministically derive an experience's attributes from the filter schema. */
function buildExperience(
  def: CategoryDef,
  seed: { title: string; location: string },
  index: number,
): Experience {
  const priceTier = (index % 4) + 1;
  const attributes: Experience["attributes"] = {};

  def.filters.forEach((filter, fi) => {
    if (filter.type === "enum") {
      const values = (filter.options as EnumOptions).values;
      const a = values[(index + fi) % values.length];
      const b = values[(index + fi + 1) % values.length];
      // Occasionally assign two values to exercise multi-value matching.
      attributes[filter.key] =
        index % 3 === 0 && values.length > 1 ? [a, b] : a;
    } else if (filter.type === "range") {
      if (filter.key === "price_tier") {
        attributes[filter.key] = priceTier;
      } else {
        const o = filter.options as RangeOptions;
        const span = o.max - o.min;
        attributes[filter.key] = o.min + ((index * 3 + fi * 2) % (span + 1));
      }
    } else {
      attributes[filter.key] = (index + fi) % 2 === 0;
    }
  });

  return {
    id: `${def.slug}-${index + 1}`,
    categorySlug: def.slug,
    title: seed.title,
    description: `A curated ${def.name.toLowerCase()} experience in ${seed.location}.`,
    location: seed.location,
    priceTier,
    rating: Math.round((4.4 + ((index * 7) % 6) / 10) * 10) / 10,
    attributes,
  };
}

const EXPERIENCES: Record<string, Experience[]> = Object.fromEntries(
  CATEGORY_DEFS.map((def) => [
    def.slug,
    def.seeds.map((seed, i) => buildExperience(def, seed, i)),
  ]),
);

function toCategory(def: CategoryDef): Category {
  const { seeds: _seeds, ...category } = def;
  void _seeds;
  return category;
}

/** All categories (slug, name, icon, description, filters). */
export function getAllCategories(): Category[] {
  return CATEGORY_DEFS.map(toCategory);
}

/** A single category by slug, or `undefined` if unknown. */
export function getCategory(slug: string): Category | undefined {
  const def = CATEGORY_DEFS.find((c) => c.slug === slug);
  return def ? toCategory(def) : undefined;
}

/** Mock experiences for a category (empty array for an unknown slug). */
export function getExperiences(slug: string): Experience[] {
  return EXPERIENCES[slug] ?? [];
}
