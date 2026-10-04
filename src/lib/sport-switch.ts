import { resolveSportFromMatchId } from "@/features/matches/resolve-match-sport";
import type { Sport } from "@/lib/sport";
import { isAmericanFootballCompetitionSlug } from "@/lib/tournaments/american-football-competitions";
import { isBasketballCompetitionSlug } from "@/lib/tournaments/basketball-competitions";
import { isSoccerCompetitionSlug } from "@/lib/tournaments/soccer-competitions";

function competitionSlugBelongsToSport(slug: string, sport: Sport): boolean {
  if (sport === "BASKETBALL") return isBasketballCompetitionSlug(slug);
  if (sport === "AMERICAN_FOOTBALL") return isAmericanFootballCompetitionSlug(slug);
  return isSoccerCompetitionSlug(slug);
}

function matchSportFromPath(path: string | null): Sport | null {
  if (!path?.startsWith("/matches/")) return null;
  const raw = path.slice("/matches/".length).split("/")[0] ?? "";
  if (!raw) return null;
  return resolveSportFromMatchId(raw);
}

/**
 * Sport-specific deep links must not stay open after a sport switch.
 * Returns a directory path, or null when the current URL already belongs to the sport.
 */
export function resolveSportSwitchHref(pathname: string | null, nextSport: Sport): string | null {
  if (!pathname) return null;

  if (pathname.startsWith("/players/")) return "/players";
  if (pathname.startsWith("/rankings/")) return "/rankings";
  if (/^\/teams\/[^/]+/.test(pathname)) return "/teams";

  if (pathname.startsWith("/matches/")) {
    const matchSport = matchSportFromPath(pathname);
    if (matchSport && nextSport === matchSport) return null;
    return "/tournaments";
  }

  const match = /^\/tournaments\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  const slug = decodeURIComponent(match[1]);
  if (competitionSlugBelongsToSport(slug, nextSport)) return null;
  return "/tournaments";
}

/** Full document URL for a sport change so server components re-read the cookie. */
export function sportSwitchTarget(pathname: string, search: string, nextSport: Sport): string {
  return resolveSportSwitchHref(pathname, nextSport) ?? `${pathname}${search}`;
}
