import { apiSportsPlayerPhotoUrl, parseApiSportsPlayerId } from "@/lib/api-sports";

/** Player photo CDN URLs — API `/players` media lookups use season 2024 (free tier). See `API_FOOTBALL_PLAYER_MEDIA_SEASON`. */

/** True when the URL is a known player image endpoint (API-Sports CDN or common image ext). */
export function isUsablePlayerPhotoUrl(url?: string | null): boolean {
  const value = url?.trim();
  if (!value) return false;
  return (
    value.includes("media.api-sports.io/football/players/") ||
    /\.(png|jpe?g|webp|gif)(\?|$)/i.test(value)
  );
}

/**
 * Maps external API photo fields to the domain `photoUrl` used by the UI.
 * API-Football returns `photo`; our Player type uses `photoUrl`.
 */
export function resolvePlayerPhotoUrl(input: {
  photoUrl?: string | null;
  apiSportsId?: number | null;
  /** Raw `photo` field from API-Football player payloads */
  externalPhoto?: string | null;
}): string | undefined {
  const persisted = input.photoUrl?.trim();
  const external = input.externalPhoto?.trim();

  if (persisted && isUsablePlayerPhotoUrl(persisted)) return persisted;
  if (external && isUsablePlayerPhotoUrl(external)) return external;

  const apiSportsId =
    input.apiSportsId ??
    parseApiSportsPlayerId(persisted) ??
    parseApiSportsPlayerId(external);

  if (apiSportsId != null) return apiSportsPlayerPhotoUrl(apiSportsId);

  return undefined;
}

/** Initials for avatar fallback — prefers first + last name (e.g. "Lionel Messi" → "LM"). */
export function getPlayerInitials(displayName: string, fullName?: string): string {
  const source = fullName?.trim() || displayName.trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}
