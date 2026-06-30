/**
 * Curated (validated) Unsplash photography per category. Photos are resolved
 * deterministically so a given category / experience always shows the same
 * image — stable across renders and reloads.
 */

const photo = (id: string, w = 900, q = 70) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${q}`;

// One pool of fitting photos per category (covers + galleries draw from these).
const POOLS: Record<string, string[]> = {
  restaurants: [
    "1517248135467-4c7edcad34c4",
    "1414235077428-338989a2e8c0",
    "1555396273-367ea4eb4db5",
    "1424847651672-bf20a4b0982b",
  ].map((id) => photo(id)),
  cafes: [
    "1495474472287-4d71bcdd2085",
    "1501339847302-ac426a4a7cbb",
    "1554118811-1e0d58224f24",
  ].map((id) => photo(id)),
  hiking: [
    "1551632811-561732d1e306",
    "1454496522488-7a8e488e8606",
    "1533240332313-0db49b459ad6",
  ].map((id) => photo(id)),
  nightlife: ["1566417713940-fe7c737a9ef2", "1514525253161-7a46d19cd819"].map(
    (id) => photo(id),
  ),
  staycations: [
    "1566073771259-6a8506099945",
    "1542314831-068cd1dbfeeb",
    "1571896349842-33c89424de2d",
  ].map((id) => photo(id)),
  "outdoor-adventures": [
    "1530866495561-507c9faab2ed",
    "1502680390469-be75c86b636f",
    "1533692328991-08159ff19fca",
  ].map((id) => photo(id)),
  picnics: ["1526401485004-46910ecc8e51", "1547471080-7cc2caa01a7e"].map((id) =>
    photo(id),
  ),
  "cultural-experiences": [
    "1533929736458-ca588d08c8be",
    "1504609773096-104ff2c73ba4",
    "1611348586804-61bf6c080437",
  ].map((id) => photo(id)),
  "road-trips": ["1469854523086-cc02fe5d8800", "1547471080-7cc2caa01a7e"].map(
    (id) => photo(id),
  ),
  "family-activities": [
    "1503454537195-1dcabb73ffb9",
    "1540555700478-4be289fbecef",
  ].map((id) => photo(id)),
};

const FALLBACK = [
  photo("1547471080-7cc2caa01a7e"),
  photo("1516426122078-c23e76319801"),
];

export const HERO_IMAGE = photo("1516426122078-c23e76319801", 1600, 70);

function hash(value: string): number {
  let h = 0;
  for (const char of value) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

export function categoryImage(slug: string): string {
  return (POOLS[slug] ?? FALLBACK)[0];
}

/** Stable gallery for an experience — rotated pool starting at a hashed index. */
export function experienceGallery(slug: string, id: string): string[] {
  const pool = POOLS[slug] ?? FALLBACK;
  const start = hash(id) % pool.length;
  return [...pool.slice(start), ...pool.slice(0, start)];
}

export function experienceCover(slug: string, id: string): string {
  return experienceGallery(slug, id)[0];
}
