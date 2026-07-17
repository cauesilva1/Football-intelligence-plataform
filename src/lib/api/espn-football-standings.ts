import { readSystemCache, writeSystemCache } from "@/lib/system-cache";
import { isStale, MATCH_SYNC_TTL_MS } from "@/lib/sync/data-staleness";
import {
  footballSeasonLabel,
  resolveFootballStatsSeasonYear,
} from "@/lib/api/espn-football-seasons";
import { nflDivisionLabel } from "@/lib/american-football/nfl-divisions";
import type { NbaStandingGroup, NbaStandingRow } from "@/lib/api/espn-nba-standings";

export type FootballStandingRow = NbaStandingRow;
export type FootballStandingGroup = NbaStandingGroup;

const ESPN_NFL_STANDINGS =
  "https://site.api.espn.com/apis/v2/sports/football/nfl/standings";
const ESPN_CFB_STANDINGS =
  "https://site.api.espn.com/apis/v2/sports/football/college-football/standings";

/** Power conferences for CFB hub standings filter. */
const CFB_ELITE_CONFERENCE = (name: string): boolean => {
  const n = name.toLowerCase();
  return (
    n.includes("southeastern") ||
    n.includes("big ten") ||
    n.includes("big 12") ||
    n.includes("atlantic coast") ||
    n.includes("pac-12") ||
    n.includes("pac 12")
  );
};

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

interface EspnStandingsNode {
  name?: string;
  abbreviation?: string;
  standings?: { entries?: EspnStandingsEntry[] };
  children?: EspnStandingsNode[];
}

function statValue(stats: EspnStandingsEntry["stats"], ...names: string[]): number {
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

function mapEntry(entry: EspnStandingsEntry): FootballStandingRow | null {
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
    pointsForAvg: statValue(entry.stats, "avgPointsFor", "pointsFor"),
    pointsAgainstAvg: statValue(entry.stats, "avgPointsAgainst", "pointsAgainst"),
    espnTeamId: Number.isFinite(Number.parseInt(entry.team?.id ?? "", 10))
      ? Number.parseInt(entry.team!.id!, 10)
      : undefined,
  };
}

function collectGroups(
  nodes: EspnStandingsNode[],
  options: { regroupNflDivisions?: boolean; eliteCfbOnly?: boolean }
): FootballStandingGroup[] {
  const groups: FootballStandingGroup[] = [];

  for (const node of nodes) {
    const children = node.children ?? [];
    if (children.length > 0) {
      groups.push(...collectGroups(children, options));
      continue;
    }

    const label = node.name?.trim() || "Standings";
    if (options.eliteCfbOnly && !CFB_ELITE_CONFERENCE(label)) continue;

    const rows = (node.standings?.entries ?? [])
      .map(mapEntry)
      .filter((row): row is FootballStandingRow => row != null);

    if (!rows.length) continue;

    if (options.regroupNflDivisions) {
      const byDivision = new Map<string, FootballStandingRow[]>();
      for (const row of rows) {
        const div = nflDivisionLabel(row.abbreviation, label);
        const list = byDivision.get(div) ?? [];
        list.push(row);
        byDivision.set(div, list);
      }
      for (const [divLabel, divRows] of byDivision) {
        groups.push({ label: divLabel, rows: divRows });
      }
      continue;
    }

    groups.push({ label, rows });
  }

  return groups;
}

async function fetchGroupedStandings(
  url: string,
  cacheKey: string,
  seasonYear: number,
  options: { regroupNflDivisions?: boolean; eliteCfbOnly?: boolean }
): Promise<{
  groups: FootballStandingGroup[];
  seasonYear: number;
  seasonLabel: string;
}> {
  const seasonLabel = footballSeasonLabel(seasonYear);

  const cached = await readSystemCache<{
    groups: FootballStandingGroup[];
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
    const response = await fetch(`${url}?season=${seasonYear}`, {
      headers: {
        "User-Agent": "football-intelligence-platform/1.0 (football-standings)",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) {
      return { groups: [], seasonYear, seasonLabel };
    }

    const data = (await response.json()) as { children?: EspnStandingsNode[] };
    const groups = collectGroups(data.children ?? [], options);

    await writeSystemCache(cacheKey, {
      groups,
      fetchedAt: new Date().toISOString(),
      seasonYear,
      seasonLabel,
    } as object);

    return { groups, seasonYear, seasonLabel };
  } catch (error) {
    console.warn("[football-standings] fetch failed:", error);
    return { groups: [], seasonYear, seasonLabel };
  }
}

export async function fetchNflGroupedStandings(
  seasonYear = resolveFootballStatsSeasonYear()
) {
  return fetchGroupedStandings(
    ESPN_NFL_STANDINGS,
    `espn:standings:nfl:v2:${seasonYear}`,
    seasonYear,
    { regroupNflDivisions: true }
  );
}

export async function fetchCfbGroupedStandings(
  seasonYear = resolveFootballStatsSeasonYear()
) {
  return fetchGroupedStandings(
    ESPN_CFB_STANDINGS,
    `espn:standings:cfb:elite:v2:${seasonYear}`,
    seasonYear,
    { eliteCfbOnly: true }
  );
}
