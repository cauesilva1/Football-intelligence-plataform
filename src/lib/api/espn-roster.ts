import { resolveEspnLeague } from "@/lib/crests/espn-standings";
import { namesLikelyMatch } from "@/lib/sync/data-staleness";
import { resolveEspnSeasonYear } from "@/lib/seasons";

const ESPN_SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

export interface EspnRosterSeasonStats {
  appearances: number;
  subIns: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  yellowCards: number;
  redCards: number;
  /** ESPN roster often omits minutes — estimated from appearances/subs. */
  minutesPlayed: number;
}

export interface EspnRosterPlayer {
  espnAthleteId: string;
  fullName: string;
  position: string;
  nationality: string;
  dateOfBirth?: string;
  jersey?: string;
  photoUrl?: string;
  seasonStats?: EspnRosterSeasonStats;
}

interface EspnStatEntry {
  name?: string;
  value?: number;
  displayValue?: string;
}

interface EspnRosterResponse {
  athletes?: Array<{
    id?: string;
    displayName?: string;
    fullName?: string;
    jersey?: string;
    age?: number;
    dateOfBirth?: string;
    citizenship?: string;
    headshot?: { href?: string } | null;
    position?: { abbreviation?: string; name?: string; displayName?: string };
    statistics?: {
      splits?: {
        categories?: Array<{
          name?: string;
          stats?: EspnStatEntry[];
        }>;
      };
    };
  }>;
}

interface EspnTeamListResponse {
  sports?: Array<{
    leagues?: Array<{
      teams?: Array<{
        team?: {
          id?: string;
          displayName?: string;
          name?: string;
          shortDisplayName?: string;
        };
      }>;
    }>;
  }>;
}

const teamIdCache = new Map<string, string>();

function mapEspnPosition(raw?: string): string {
  const value = (raw ?? "").toLowerCase();
  if (!value) return "CM";
  if (value === "g" || value.includes("goal")) return "GK";
  if (value === "d" || value.includes("defender") || value.includes("back")) {
    if (value.includes("left")) return "LB";
    if (value.includes("right")) return "RB";
    return "CB";
  }
  if (value === "m" || value.includes("mid")) {
    if (value.includes("defensive")) return "CDM";
    if (value.includes("attacking")) return "CAM";
    return "CM";
  }
  if (value === "f" || value.includes("forward") || value.includes("striker")) return "ST";
  if (value.includes("wing")) return value.includes("left") ? "LW" : "RW";
  return "CM";
}

function readStatValue(stats: EspnStatEntry[], ...names: string[]): number {
  for (const name of names) {
    const hit = stats.find((s) => s.name === name);
    if (hit && Number.isFinite(hit.value)) return Number(hit.value);
  }
  return 0;
}

/** Extract season totals from ESPN roster athlete payload. */
export function parseEspnRosterSeasonStats(
  athlete: NonNullable<EspnRosterResponse["athletes"]>[number]
): EspnRosterSeasonStats | undefined {
  const categories = athlete.statistics?.splits?.categories ?? [];
  if (!categories.length) return undefined;

  const allStats = categories.flatMap((cat) => cat.stats ?? []);
  const appearances = Math.round(readStatValue(allStats, "appearances"));
  const subIns = Math.round(readStatValue(allStats, "subIns"));
  const goals = Math.round(readStatValue(allStats, "totalGoals", "goals"));
  const assists = Math.round(readStatValue(allStats, "goalAssists", "assists"));
  const shots = Math.round(readStatValue(allStats, "totalShots", "shots"));
  const shotsOnTarget = Math.round(readStatValue(allStats, "shotsOnTarget"));
  const yellowCards = Math.round(readStatValue(allStats, "yellowCards"));
  const redCards = Math.round(readStatValue(allStats, "redCards"));

  // Roster endpoint does not expose minutes; estimate from starts vs bench.
  const starts = Math.max(0, appearances - subIns);
  const minutesPlayed =
    appearances > 0 ? Math.round(starts * 85 + subIns * 28) : 0;

  if (
    appearances <= 0 &&
    goals <= 0 &&
    assists <= 0 &&
    shots <= 0 &&
    yellowCards <= 0
  ) {
    return undefined;
  }

  return {
    appearances,
    subIns,
    goals,
    assists,
    shots,
    shotsOnTarget,
    yellowCards,
    redCards,
    minutesPlayed,
  };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "football-intelligence-platform/1.0 (espn-roster)",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) {
      console.warn(`[espn-roster] HTTP ${response.status} on ${url}`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.warn("[espn-roster] fetch failed:", url, error);
    return null;
  }
}

export async function resolveEspnTeamId(
  teamName: string,
  competitionName?: string | null
): Promise<{ espnTeamId: string; espnSlug: string } | null> {
  const config = resolveEspnLeague(competitionName);
  if (!config) return null;

  const cacheKey = `${config.slug}:${teamName.toLowerCase()}`;
  const cached = teamIdCache.get(cacheKey);
  if (cached) return { espnTeamId: cached, espnSlug: config.slug };

  const data = await fetchJson<EspnTeamListResponse>(`${ESPN_SITE}/${config.slug}/teams`);
  const wraps =
    data?.sports?.flatMap((s) => s.leagues?.flatMap((l) => l.teams ?? []) ?? []) ?? [];

  for (const wrap of wraps) {
    const team = wrap.team;
    if (!team?.id) continue;
    const candidates = [team.displayName, team.name, team.shortDisplayName].filter(
      Boolean
    ) as string[];
    if (candidates.some((name) => namesLikelyMatch(name, teamName))) {
      teamIdCache.set(cacheKey, team.id);
      return { espnTeamId: team.id, espnSlug: config.slug };
    }
  }

  return null;
}

export async function fetchEspnClubRoster(
  teamName: string,
  competitionName?: string | null
): Promise<EspnRosterPlayer[]> {
  const resolved = await resolveEspnTeamId(teamName, competitionName);
  if (!resolved) return [];

  const url = `${ESPN_SITE}/${resolved.espnSlug}/teams/${resolved.espnTeamId}/roster`;
  const data = await fetchJson<EspnRosterResponse>(url);
  const athletes = data?.athletes ?? [];

  return athletes
    .map((athlete): EspnRosterPlayer | null => {
      const fullName = athlete.displayName?.trim() || athlete.fullName?.trim() || "";
      if (!fullName || !athlete.id) return null;

      const photoUrl =
        athlete.headshot?.href ??
        `https://a.espncdn.com/i/headshots/soccer/players/full/${athlete.id}.png`;

      return {
        espnAthleteId: athlete.id,
        fullName,
        position: mapEspnPosition(
          athlete.position?.abbreviation ??
            athlete.position?.name ??
            athlete.position?.displayName
        ),
        nationality: athlete.citizenship?.trim() || "UNK",
        dateOfBirth: athlete.dateOfBirth,
        jersey: athlete.jersey,
        photoUrl,
        seasonStats: parseEspnRosterSeasonStats(athlete),
      };
    })
    .filter((row): row is EspnRosterPlayer => row != null);
}

export function espnRosterSeasonHint(competitionName?: string | null): number {
  return resolveEspnSeasonYear(competitionName);
}
