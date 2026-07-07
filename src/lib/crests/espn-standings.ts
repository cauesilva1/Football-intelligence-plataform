import { readSystemCache, writeSystemCache, canUseDatabase } from "@/lib/system-cache";
import { CURRENT_SEASON } from "@/lib/data/generators";
import {
  findStatsBombStatsForTeam,
  type AggregatedTeamStats,
} from "@/lib/statsbomb/aggregate-team-stats";

const ESPN_BASE = "https://site.api.espn.com/apis/v2/sports/soccer";

interface EspnLeagueConfig {
  match: (name: string) => boolean;
  slug: string;
  competitionLabel: string;
  cacheKey?: string;
  preferredSeason?: number;
}

const ESPN_LEAGUES: EspnLeagueConfig[] = [
  { match: (n) => n.includes("premier"), slug: "eng.1", competitionLabel: "Premier League" },
  {
    match: (n) =>
      n.includes("la liga") ||
      (n.includes("liga") && !n.includes("bundesliga") && !n.includes("brasileir")),
    slug: "esp.1",
    competitionLabel: "La Liga",
  },
  {
    match: (n) => n.includes("serie a") && !n.includes("brasileir"),
    slug: "ita.1",
    competitionLabel: "Serie A",
  },
  {
    match: (n) => n.includes("bundesliga") || (n.includes("bundes") && !n.includes("brasileir")),
    slug: "ger.1",
    competitionLabel: "Bundesliga",
  },
  {
    match: (n) => n.includes("ligue 1") || (n.includes("ligue") && !n.includes("brasileir")),
    slug: "fra.1",
    competitionLabel: "Ligue 1",
  },
  {
    match: (n) => n.includes("brasileir"),
    slug: "bra.1",
    competitionLabel: "Brasileirão Série A",
    cacheKey: "espn:standings:brasileirao:2026",
    preferredSeason: 2026,
  },
];

const SEASON_CANDIDATES = [
  { year: 2026, label: CURRENT_SEASON },
  { year: 2025, label: "2024/25" },
] as const;

interface EspnStandingsEntry {
  team?: {
    displayName?: string;
    name?: string;
    logo?: string;
    logos?: Array<{ href?: string }>;
  };
  stats?: Array<{ name?: string; value?: number; displayValue?: string }>;
}

interface EspnStandingsPayload {
  seasonLabel: string;
  competitionLabel: string;
  fetchedAt: string;
  teams: AggregatedTeamStats[];
  crests?: Record<string, string>;
}

function statValue(entry: EspnStandingsEntry, name: string): number {
  const stat = entry.stats?.find((s) => s.name === name);
  if (stat?.value != null && Number.isFinite(stat.value)) return stat.value;
  const parsed = Number(stat?.displayValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractTeamLogo(entry: EspnStandingsEntry): string | undefined {
  return entry.team?.logos?.[0]?.href ?? entry.team?.logo ?? undefined;
}

function parseStandingsEntries(
  entries: EspnStandingsEntry[],
  seasonLabel: string,
  competitionLabel: string
): { teams: AggregatedTeamStats[]; crests: Record<string, string> } {
  const crests: Record<string, string> = {};

  const teams = entries
    .map((entry) => {
      const teamName = entry.team?.displayName ?? entry.team?.name ?? "";
      if (!teamName) return null;

      const wins = statValue(entry, "wins");
      const draws = statValue(entry, "ties");
      const losses = statValue(entry, "losses");
      const goalsFor = statValue(entry, "pointsFor");
      const goalsAgainst = statValue(entry, "pointsAgainst");
      const points = statValue(entry, "points");
      const matchesPlayed = statValue(entry, "gamesPlayed") || wins + draws + losses;
      const logo = extractTeamLogo(entry);

      if (logo) crests[teamName] = logo;

      return {
        teamName,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        matchesPlayed,
        goalBalance: goalsFor - goalsAgainst,
        ...(points > 0 ? { points } : {}),
        ...(logo ? { crestUrl: logo } : {}),
        seasonLabel,
        statsBombCompetitionName: competitionLabel,
      };
    })
    .filter((row): row is AggregatedTeamStats => row != null);

  return { teams, crests };
}

async function fetchEspnStandingsRaw(
  slug: string,
  seasonYear: number
): Promise<EspnStandingsEntry[]> {
  const url = `${ESPN_BASE}/${slug}/standings?season=${seasonYear}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "football-intelligence-platform/1.0 (espn-standings)" },
    next: { revalidate: 60 * 60 * 6 },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    children?: Array<{ standings?: { entries?: EspnStandingsEntry[] } }>;
  };

  return data.children?.[0]?.standings?.entries ?? [];
}

function defaultCacheKey(slug: string, seasonYear: number): string {
  return `espn:standings:${slug}:${seasonYear}`;
}

async function persistEspnCrests(crests: Record<string, string>): Promise<void> {
  if (!canUseDatabase()) return;

  const entries = Object.entries(crests);
  if (!entries.length) return;

  const { getPrisma } = await import("@/lib/prisma");
  const prisma = getPrisma();

  await Promise.all(
    entries.map(async ([teamName, crestUrl]) => {
      const team = await prisma.team.findFirst({
        where: { name: { equals: teamName, mode: "insensitive" } },
      });
      if (!team || team.crestUrl === crestUrl) return;

      await prisma.team.update({
        where: { id: team.id },
        data: { crestUrl },
      });
    })
  );
}

async function loadEspnLeagueTable(
  config: EspnLeagueConfig
): Promise<Map<string, AggregatedTeamStats>> {
  const seasons = config.preferredSeason
    ? [{ year: config.preferredSeason, label: CURRENT_SEASON }, ...SEASON_CANDIDATES]
    : [...SEASON_CANDIDATES];

  const seen = new Set<number>();

  for (const season of seasons) {
    if (seen.has(season.year)) continue;
    seen.add(season.year);

    const key = config.cacheKey ?? defaultCacheKey(config.slug, season.year);
    const payload = await readSystemCache<EspnStandingsPayload>(key);

    if (payload?.teams?.length) {
      const hasPlayed = payload.teams.some((t) => t.matchesPlayed > 0);
      if (hasPlayed || season.year === seasons[seasons.length - 1]?.year) {
        if (payload.crests) await persistEspnCrests(payload.crests);
        return new Map(payload.teams.map((t) => [t.teamName, t]));
      }
    }

    const entries = await fetchEspnStandingsRaw(config.slug, season.year);
    const { teams, crests } = parseStandingsEntries(
      entries,
      season.label,
      config.competitionLabel
    );
    const hasPlayed = teams.some((t) => t.matchesPlayed > 0);

    if (teams.length > 0) {
      const toStore: EspnStandingsPayload = {
        seasonLabel: season.label,
        competitionLabel: config.competitionLabel,
        fetchedAt: new Date().toISOString(),
        teams,
        crests,
      };

      await writeSystemCache(key, toStore as object);

      await persistEspnCrests(crests);

      if (hasPlayed || config.cacheKey) {
        return new Map(teams.map((t) => [t.teamName, t]));
      }
    }
  }

  return new Map();
}

export function resolveEspnLeague(competitionName?: string | null): EspnLeagueConfig | null {
  const normalized = competitionName?.toLowerCase().trim() ?? "";
  if (!normalized) return null;
  return ESPN_LEAGUES.find((league) => league.match(normalized)) ?? null;
}

const leagueTableCache = new Map<string, Map<string, AggregatedTeamStats>>();

export async function getEspnStatsForTeam(
  teamName: string,
  competitionName?: string | null
): Promise<AggregatedTeamStats | null> {
  const config = resolveEspnLeague(competitionName);
  if (!config) return null;

  const cacheId = config.cacheKey ?? config.slug;
  let table = leagueTableCache.get(cacheId);
  if (!table) {
    table = await loadEspnLeagueTable(config);
    leagueTableCache.set(cacheId, table);
  }

  if (table.size === 0) return null;
  return findStatsBombStatsForTeam(table, teamName);
}

export async function preloadEspnLeague(competitionName?: string | null): Promise<void> {
  const config = resolveEspnLeague(competitionName);
  if (!config) return;

  const cacheId = config.cacheKey ?? config.slug;
  if (leagueTableCache.has(cacheId)) return;

  const table = await loadEspnLeagueTable(config);
  leagueTableCache.set(cacheId, table);
}

export async function getEspnCrestForTeam(teamName: string): Promise<string | null> {
  const key = "espn:standings:brasileirao:2026";
  const payload = await readSystemCache<EspnStandingsPayload>(key);
  if (!payload?.crests) return null;

  const normalized = teamName.toLowerCase();
  for (const [name, url] of Object.entries(payload.crests)) {
    if (name.toLowerCase() === normalized || name.toLowerCase().includes(normalized)) {
      return url;
    }
  }
  return null;
}
