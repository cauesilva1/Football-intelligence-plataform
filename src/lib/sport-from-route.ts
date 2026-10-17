import { resolveSportFromMatchId } from "@/features/matches/resolve-match-sport";
import type { Sport } from "@/lib/sport";
import { isAmericanFootballCompetitionSlug } from "@/lib/tournaments/american-football-competitions";
import { isBasketballCompetitionSlug } from "@/lib/tournaments/basketball-competitions";
import { isSoccerCompetitionSlug } from "@/lib/tournaments/soccer-competitions";

/** Request header set by middleware when the URL already names a sport. */
export const SPORT_HEADER = "x-omni-sport";

/** Sport implied by the competition slug — avoids cookies on hub pages. */
export function resolveSportFromCompetitionSlug(slug: string): Sport | null {
  if (isBasketballCompetitionSlug(slug)) return "BASKETBALL";
  if (isAmericanFootballCompetitionSlug(slug)) return "AMERICAN_FOOTBALL";
  if (isSoccerCompetitionSlug(slug)) return "SOCCER";
  return null;
}

export function deskParamForSport(sport: Sport): "soccer" | "basketball" | "football" {
  if (sport === "BASKETBALL") return "basketball";
  if (sport === "AMERICAN_FOOTBALL") return "football";
  return "soccer";
}

export function sportFromDeskParam(value: string | null | undefined): Sport | null {
  const token = (value ?? "").trim().toLowerCase();
  if (token === "soccer") return "SOCCER";
  if (token === "basketball") return "BASKETBALL";
  if (token === "football" || token === "american-football" || token === "american_football") {
    return "AMERICAN_FOOTBALL";
  }
  return null;
}

/** Player and team profiles carry sport on the record, not in the path. */
export function isEntitySportPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return /^\/players\/[^/]+/.test(pathname) || /^\/teams\/[^/]+/.test(pathname);
}

function isDeskScopedPath(pathname: string): boolean {
  if (isEntitySportPath(pathname)) return false;
  return [
    "/dashboard",
    "/players",
    "/scouting",
    "/tournaments",
    "/teams",
    "/rankings",
    "/shortlist",
    "/compare",
    "/recruitment",
    "/reports",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function readSearch(search: string | URLSearchParams | null | undefined): URLSearchParams {
  if (!search) return new URLSearchParams();
  if (typeof search !== "string") return search;
  const raw = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(raw);
}

/**
 * Sport named by this URL. Null when the page has no sport of its own
 * (cookie may still scope a generic directory).
 */
export function sportFromLocation(
  pathname: string | null | undefined,
  search?: string | URLSearchParams | null
): Sport | null {
  if (!pathname) return null;
  const params = readSearch(search);

  if (pathname.startsWith("/matches/")) {
    const raw = decodeURIComponent(pathname.slice("/matches/".length).split("/")[0] ?? "");
    return raw ? resolveSportFromMatchId(raw) : null;
  }

  const tournament = /^\/tournaments\/([^/]+)\/?$/.exec(pathname);
  if (tournament) {
    return resolveSportFromCompetitionSlug(decodeURIComponent(tournament[1]));
  }

  if (!isDeskScopedPath(pathname)) return null;

  const fromDesk = sportFromDeskParam(params.get("desk"));
  if (fromDesk) return fromDesk;

  if (pathname === "/teams") {
    const league = (params.get("league") ?? "").toLowerCase();
    if (league === "nfl" || league === "cfb" || league === "college-football") {
      return "AMERICAN_FOOTBALL";
    }
    if (league === "nba" || league === "ncaa" || league === "euroleague") return "BASKETBALL";
  }

  return null;
}

/** Keep the current sport on directory links so a reload opens the same desk. */
export function withSportDesk(href: string, sport: Sport): string {
  const url = new URL(href, "http://local");
  if (!isDeskScopedPath(url.pathname) && url.pathname !== "/tournaments") return href;
  if (isEntitySportPath(url.pathname)) return href;
  if (/^\/tournaments\/[^/]+/.test(url.pathname)) return href;
  if (!url.searchParams.has("desk")) {
    url.searchParams.set("desk", deskParamForSport(sport));
  }
  const qs = url.searchParams.toString();
  return qs ? `${url.pathname}?${qs}` : url.pathname;
}
