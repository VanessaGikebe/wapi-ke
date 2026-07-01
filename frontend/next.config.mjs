/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Served directly (no server-side optimization) for reliability in dev/demo.
    // Real business photos come from many CDNs (Google, TripAdvisor, Booking,
    // …), so we allow any HTTPS host — safe because images are unoptimized.
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  webpack: (config, { dev }) => {
    // This project lives under OneDrive, which syncs/locks the on-disk webpack
    // cache (.next/cache/webpack/*.pack.gz) and corrupts it — surfacing as
    // "Caching failed … ENOENT" warnings and ChunkLoadError in the browser.
    // Use an in-memory cache in dev to avoid the corruption entirely.
    if (dev) config.cache = { type: "memory" };
    return config;
  },
};

export default nextConfig;
