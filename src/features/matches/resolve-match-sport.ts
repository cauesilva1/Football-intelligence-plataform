import type { Sport } from "@/lib/sport";

/**
 * Infer match sport from external key (e.g. espn:nba:401…, espn:nfl:…, espn:eng.1:…).
 * Prefer this over the sport cookie so deep links and sport switches do not 404.
 */
export function resolveSportFromMatchId(rawId: string): Sport | null {
  const id = decodeURIComponent(rawId);
  const match = /^espn:([^:]+):/i.exec(id);
  if (!match) return null;

  const slug = match[1].toLowerCase();
  if (slug === "nba" || slug === "nba-summer" || slug === "ncaa") {
    return "BASKETBALL";
  }
  if (slug === "nfl" || slug === "cfb") {
    return "AMERICAN_FOOTBALL";
  }
  return "SOCCER";
}
