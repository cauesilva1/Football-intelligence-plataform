import { readSystemCache, writeSystemCache } from "@/lib/system-cache";
import { isStale, MATCH_SYNC_TTL_MS } from "@/lib/sync/data-staleness";
import {
  nbaSeasonLabel,
  resolveNbaHubSeasonYears,
  resolveNbaStatsSeasonYear,
} from "@/lib/api/espn-nba-leaders";
import type { NbaStandingGroup, NbaStandingRow } from "@/lib/api/espn-nba-standings";

const ESPN_NCAA_STANDINGS =
  "https://site.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/standings";

/**
 * Elite conferences only — keeps SystemCache under ~2MB and matches NCAA bootstrap.
 * Name substrings matched against ESPN conference display names.
 */
const ELITE_CONFERENCE_MATCHERS = [
  "Big Ten",
  "SEC",
  "Southeastern",
  "Big 12",
  "ACC",
  "Atlantic Coast",
  "Big East",
  "Atlantic 10",
  "Mountain West",
] as const;

const PRIORITY_CONFERENCES = [
  "Big Ten",
  "SEC",
  "Big 12",
  "ACC",
  "Big East",
  "Mountain West",
  "Atlantic 10",
];

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

function isEliteConference(name: string): boolean {
  const lower = name.toLowerCase();
  return ELITE_CONFERENCE_MATCHERS.some((m) => lower.includes(m.toLowerCase()));
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

/** Slim row — only fields the UI + live-stats need. */
function mapEntrySlim(entry: EspnStandingsEntry): NbaStandingRow | null {
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
    espnTeamId: Number.isFinite(Number.parseInt(entry.team?.id ?? "", 10))
      ? Number.parseInt(entry.team!.id!, 10)
      : undefined,
  };
}

function conferenceSortKey(name: string): number {
  const idx = PRIORITY_CONFERENCES.findIndex((p) =>
    name.toLowerCase().includes(p.toLowerCase())
  );
  return idx === -1 ? 100 + name.charCodeAt(0) : idx;
}

export function resolveNcaaHubSeasonYears(now = new Date()) {
  return resolveNbaHubSeasonYears(now);
}

export async function fetchNcaaGroupedStandings(
  seasonYear = resolveNbaStatsSeasonYear()
): Promise<{
  groups: NbaStandingGroup[];
  seasonYear: number;
  seasonLabel: string;
}> {
  const seasonLabel = nbaSeasonLabel(seasonYear);
  // v2 key — elite slim payload (old full dumps were >2MB and failed to cache)
  const cacheKey = `espn:standings:ncaa:elite:v2:${seasonYear}`;

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
    const response = await fetch(`${ESPN_NCAA_STANDINGS}?season=${seasonYear}`, {
      headers: {
        "User-Agent": "football-intelligence-platform/1.0 (ncaa-standings)",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      console.warn(`[ncaa-standings] HTTP ${response.status} season=${seasonYear}`);
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
      .filter((child) => isEliteConference(child.name ?? ""))
      .map((child) => {
        const rows = (child.standings?.entries ?? [])
          .map(mapEntrySlim)
          .filter((row): row is NbaStandingRow => row != null)
          .sort((a, b) => b.winPercent - a.winPercent || b.wins - a.wins);
        return {
          label: child.name ?? "Conference",
          rows,
        };
      })
      .filter((g) => g.rows.length > 0)
      .sort((a, b) => conferenceSortKey(a.label) - conferenceSortKey(b.label));

    const resolvedYear = data.season?.year ?? seasonYear;
    const resolvedLabel =
      data.season?.displayName?.replace("-", "/") ?? seasonLabel;

    await writeSystemCache(cacheKey, {
      groups,
      fetchedAt: new Date().toISOString(),
      seasonYear: resolvedYear,
      seasonLabel: resolvedLabel,
    } as object);

    return { groups, seasonYear: resolvedYear, seasonLabel: resolvedLabel };
  } catch (error) {
    console.warn("[ncaa-standings] fetch failed:", error);
    return {
      groups: cached?.groups ?? [],
      seasonYear,
      seasonLabel,
    };
  }
}
