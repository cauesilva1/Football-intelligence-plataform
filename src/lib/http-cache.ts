/** Shared CDN/browser cache policy for ISR-friendly routes. */
export const HUB_CACHE_CONTROL =
  "public, s-maxage=180, stale-while-revalidate=600";

/** Align route segment revalidate with unstable_cache TTLs (Phase B). */
export const HOT_PATH_REVALIDATE_SECONDS = 180;
