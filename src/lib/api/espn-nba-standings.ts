import { readSystemCache, writeSystemCache } from "@/lib/system-cache";
import { isStale, MATCH_SYNC_TTL_MS } from "@/lib/sync/data-staleness";
import { resolveNbaStatsSeasonYear, nbaSeasonLabel } from "@/lib/api/espn-nba-leaders";

const ESPN_NBA_STANDINGS =
  "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings";

export interface NbaStandingRow {
  teamName: string;
  abbreviation?: string;
  crestUrl?: string;
  wins: number;
  losses: number;
  winPercent: number;
  gamesBehind: number;
  streak?: string;
  pointsForAvg?: number;
  pointsAgainstAvg?: number;
  teamId?: string;
  /** ESPN team id — matched to Team.apiSportsId in the hub. */
  espnTeamId?: number;
}

export interface NbaStandingGroup {
  label: string;
  rows: NbaStandingRow[];
}

interface EspnStandingsEntry {
  team?: {
    id?: string;
    displayName?: string;
    name?: string;
    abbreviation?: string;
    logos?: Array<{ href?: string }>;
  };
  stats?: Array<{
    name?: string;
    abbreviation?: string;
    value?: number;
    displayValue?: string;
  }>;
}

function statValue(
  stats: EspnStandingsEntry["stats"],
  ...names: string[]
): number {
  for (const name of names) {
    const hit = stats?.find((s) => s.name === name);
    if (hit && Number.isFinite(hit.value)) return Number(hit.value);
  }
  return 0;
}

function statDisplay(
  stats: EspnStandingsEntry["stats"],
  ...names: string[]
): string | undefined {
  for (const name of names) {
    const hit = stats?.find((s) => s.name === name);
    if (hit?.displayValue) return hit.displayValue;
  }
  return undefined;
}

function mapEntry(entry: EspnStandingsEntry): NbaStandingRow | null {
  const teamName = entry.team?.displayName ?? entry.team?.name ?? "";
  if (!teamName) return null;

  const wins = Math.round(statValue(entry.stats, "wins"));
  const losses = Math.round(statValue(entry.stats, "losses"));
  const winPercentRaw = statValue(entry.stats, "winPercent");
  const winPercent =
    winPercentRaw > 0
      ? winPercentRaw
      : wins + losses > 0
        ? wins / (wins + losses)
        : 0;

  return {
    teamName,
    abbreviation: entry.team?.abbreviation,
    crestUrl: entry.team?.logos?.[0]?.href,
    wins,
    losses,
    winPercent,
    gamesBehind: statValue(entry.stats, "gamesBehind"),
    streak: statDisplay(entry.stats, "streak"),
    pointsForAvg: statValue(entry.stats, "avgPointsFor"),
    pointsAgainstAvg: statValue(entry.stats, "avgPointsAgainst"),
    espnTeamId: Number.isFinite(Number.parseInt(entry.team?.id ?? "", 10))
      ? Number.parseInt(entry.team!.id!, 10)
      : undefined,
  };
}

export async function fetchNbaGroupedStandings(
  seasonYear = resolveNbaStatsSeasonYear()
): Promise<{
  groups: NbaStandingGroup[];
  seasonYear: number;
  seasonLabel: string;
}> {
  const seasonLabel = nbaSeasonLabel(seasonYear);
  const cacheKey = `espn:standings:nba:v2:${seasonYear}`;

  const cached = await readSystemCache<{
    groups: NbaStandingGroup[];
    fetchedAt: string;
    seasonYear: number;
    seasonLabel: string;
  }>(cacheKey);
  if (cached && !isStale(new Date(cached.fetchedAt), MATCH_SYNC_TTL_MS)) {
    return {
      groups: cached.groups,
      seasonYear: cached.seasonYear,
      seasonLabel: cached.seasonLabel,
    };
  }

  try {
    const response = await fetch(`${ESPN_NBA_STANDINGS}?season=${seasonYear}`, {
      headers: {
        "User-Agent": "football-intelligence-platform/1.0 (nba-standings)",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      console.warn(`[nba-standings] HTTP ${response.status} season=${seasonYear}`);
      return {
        groups: cached?.groups ?? [],
        seasonYear,
        seasonLabel,
      };
    }

    const data = (await response.json()) as {
      children?: Array<{
        name?: string;
        standings?: { entries?: EspnStandingsEntry[] };
      }>;
      season?: { year?: number; displayName?: string };
    };

    const groups: NbaStandingGroup[] = (data.children ?? [])
      .map((child) => {
        const rows = (child.standings?.entries ?? [])
          .map(mapEntry)
          .filter((row): row is NbaStandingRow => row != null)
          .sort((a, b) => b.winPercent - a.winPercent || b.wins - a.wins);
        const label =
          child.name?.includes("Eastern")
            ? "Eastern Conference"
            : child.name?.includes("Western")
              ? "Western Conference"
              : child.name ?? "Standings";
        return { label, rows };
      })
      .filter((g) => g.rows.length > 0);

    const resolvedYear = data.season?.year ?? seasonYear;
    const resolvedLabel = data.season?.displayName?.replace("-", "/") ?? seasonLabel;

    await writeSystemCache(cacheKey, {
      groups,
      fetchedAt: new Date().toISOString(),
      seasonYear: resolvedYear,
      seasonLabel: resolvedLabel,
    } as object);

    return { groups, seasonYear: resolvedYear, seasonLabel: resolvedLabel };
  } catch (error) {
    console.warn("[nba-standings] fetch failed:", error);
    return {
      groups: cached?.groups ?? [],
      seasonYear,
      seasonLabel,
    };
  }
}
