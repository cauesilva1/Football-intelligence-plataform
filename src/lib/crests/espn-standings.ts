import { readSystemCache, writeSystemCache, canUseDatabase } from "@/lib/system-cache";
import {
  BRAZIL_SEASON_LABEL,
  CURRENT_SEASON,
  ESPN_BRAZIL_SEASON_YEAR,
  ESPN_EUROPEAN_SEASON_YEAR,
  ESPN_MLS_SEASON_YEAR,
  FIFA_WORLD_CUP_SEASON_YEAR,
  MLS_LABEL,
  MLS_SEASON_LABEL,
} from "@/lib/seasons";
import { isStale, MATCH_SYNC_TTL_MS } from "@/lib/sync/data-staleness";
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
      (n.includes("liga") &&
        !n.includes("bundesliga") &&
        !n.includes("brasileir") &&
        !n.includes("major league")),
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
    cacheKey: `espn:standings:brasileirao:${ESPN_BRAZIL_SEASON_YEAR}`,
    preferredSeason: ESPN_BRAZIL_SEASON_YEAR,
  },
  {
    match: (n) => n.includes("mls") || n.includes("major league soccer") || n.includes("usa.1"),
    slug: "usa.1",
    competitionLabel: MLS_LABEL,
    cacheKey: `espn:standings:mls:${ESPN_MLS_SEASON_YEAR}`,
    preferredSeason: ESPN_MLS_SEASON_YEAR,
  },
  {
    match: (n) => n.includes("world cup") || n.includes("fifa.world"),
    slug: "fifa.world",
    competitionLabel: "FIFA World Cup",
    cacheKey: `espn:worldcup:${FIFA_WORLD_CUP_SEASON_YEAR}`,
    preferredSeason: FIFA_WORLD_CUP_SEASON_YEAR,
  },
  {
    match: (n) =>
      n.includes("champions") || n.includes("uefa.champions") || n.includes("ucl"),
    slug: "uefa.champions",
    competitionLabel: "UEFA Champions League",
    cacheKey: `espn:standings:champions:${ESPN_EUROPEAN_SEASON_YEAR}`,
    preferredSeason: ESPN_EUROPEAN_SEASON_YEAR,
  },
];

const EUROPEAN_SEASON_CANDIDATES = [
  { year: ESPN_EUROPEAN_SEASON_YEAR, label: CURRENT_SEASON },
  { year: ESPN_EUROPEAN_SEASON_YEAR - 1, label: "2024/25" },
] as const;

const BRAZIL_SEASON_CANDIDATES = [
  { year: ESPN_BRAZIL_SEASON_YEAR, label: BRAZIL_SEASON_LABEL },
  { year: ESPN_BRAZIL_SEASON_YEAR - 1, label: String(ESPN_BRAZIL_SEASON_YEAR - 1) },
] as const;

const MLS_SEASON_CANDIDATES = [
  { year: ESPN_MLS_SEASON_YEAR, label: MLS_SEASON_LABEL },
  { year: ESPN_MLS_SEASON_YEAR - 1, label: String(ESPN_MLS_SEASON_YEAR - 1) },
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
    next: { revalidate: 0 },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    children?: Array<{
      name?: string;
      standings?: { entries?: EspnStandingsEntry[] };
    }>;
  };

  // MLS (and similar) expose conferences as multiple children — flatten all.
  const children = data.children ?? [];
  if (children.length <= 1) {
    return children[0]?.standings?.entries ?? [];
  }

  return children.flatMap((child) => child.standings?.entries ?? []);
}

/** Conference / group tables when ESPN returns multiple children (e.g. MLS). */
export async function getEspnGroupedStandings(
  competitionName?: string | null
): Promise<Array<{ label: string; rows: AggregatedTeamStats[] }>> {
  const config = resolveEspnLeague(competitionName);
  if (!config) return [];

  const year = config.preferredSeason ?? ESPN_EUROPEAN_SEASON_YEAR;
  const url = `${ESPN_BASE}/${config.slug}/standings?season=${year}`;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "football-intelligence-platform/1.0 (espn-standings)" },
      next: { revalidate: 0 },
    });
    if (!response.ok) return [];

    const data = (await response.json()) as {
      children?: Array<{
        name?: string;
        standings?: { entries?: EspnStandingsEntry[] };
      }>;
    };

    const children = data.children ?? [];
    if (children.length <= 1) return [];

    return children
      .map((child) => {
        const label = child.name ?? "Grupo";
        const { teams } = parseStandingsEntries(
          child.standings?.entries ?? [],
          String(year),
          config.competitionLabel
        );
        const rows = [...teams].sort((a, b) => {
          const pointsA = a.points ?? a.wins * 3 + a.draws;
          const pointsB = b.points ?? b.wins * 3 + b.draws;
          if (pointsB !== pointsA) return pointsB - pointsA;
          return b.goalBalance - a.goalBalance;
        });
        return { label, rows };
      })
      .filter((g) => g.rows.length > 0);
  } catch {
    return [];
  }
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

const WORLD_CUP_SEASON_CANDIDATES = [
  { year: FIFA_WORLD_CUP_SEASON_YEAR, label: String(FIFA_WORLD_CUP_SEASON_YEAR) },
] as const;

function seasonCandidatesForLeague(config: EspnLeagueConfig) {
  if (config.slug === "bra.1") return BRAZIL_SEASON_CANDIDATES;
  if (config.slug === "usa.1") return MLS_SEASON_CANDIDATES;
  if (config.slug === "fifa.world") return WORLD_CUP_SEASON_CANDIDATES;
  return EUROPEAN_SEASON_CANDIDATES;
}

async function loadEspnLeagueTable(
  config: EspnLeagueConfig
): Promise<Map<string, AggregatedTeamStats>> {
  const seasons = seasonCandidatesForLeague(config);

  const seen = new Set<number>();

  for (const season of seasons) {
    if (seen.has(season.year)) continue;
    seen.add(season.year);

    const key = config.cacheKey ?? defaultCacheKey(config.slug, season.year);
    const payload = await readSystemCache<EspnStandingsPayload>(key);
    const cacheFresh =
      payload?.fetchedAt != null && !isStale(new Date(payload.fetchedAt), MATCH_SYNC_TTL_MS);

    if (payload?.teams?.length && cacheFresh) {
      const hasPlayed = payload.teams.some((t) => t.matchesPlayed > 0);
      if (hasPlayed || season.year === seasons[seasons.length - 1]?.year) {
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

export function resolveEspnLeagueBySlug(slug: string): EspnLeagueConfig | null {
  return ESPN_LEAGUES.find((league) => league.slug === slug) ?? null;
}

const leagueTableCache = new Map<
  string,
  { table: Map<string, AggregatedTeamStats>; fetchedAt: number }
>();

export async function getEspnStatsForTeam(
  teamName: string,
  competitionName?: string | null
): Promise<AggregatedTeamStats | null> {
  const config = resolveEspnLeague(competitionName);
  if (!config) return null;

  const cacheId = config.cacheKey ?? config.slug;
  const cached = leagueTableCache.get(cacheId);
  let table = cached?.table;
  if (!cached || !table || isStale(new Date(cached.fetchedAt), MATCH_SYNC_TTL_MS)) {
    table = await loadEspnLeagueTable(config);
    leagueTableCache.set(cacheId, { table, fetchedAt: Date.now() });
  }

  if (table.size === 0) return null;
  return findStatsBombStatsForTeam(table, teamName);
}

export async function preloadEspnLeague(competitionName?: string | null): Promise<void> {
  const config = resolveEspnLeague(competitionName);
  if (!config) return;

  const cacheId = config.cacheKey ?? config.slug;
  const cached = leagueTableCache.get(cacheId);
  if (cached && !isStale(new Date(cached.fetchedAt), MATCH_SYNC_TTL_MS)) return;

  const table = await loadEspnLeagueTable(config);
  leagueTableCache.set(cacheId, { table, fetchedAt: Date.now() });
}

/** Full ESPN league table sorted by points (W-D-L), then goal difference. */
export async function getEspnLeagueStandings(
  competitionName?: string | null
): Promise<AggregatedTeamStats[]> {
  const config = resolveEspnLeague(competitionName);
  if (!config) return [];

  const cacheId = config.cacheKey ?? config.slug;
  const cached = leagueTableCache.get(cacheId);
  let table = cached?.table;
  if (!cached || !table || isStale(new Date(cached.fetchedAt), MATCH_SYNC_TTL_MS)) {
    table = await loadEspnLeagueTable(config);
    leagueTableCache.set(cacheId, { table, fetchedAt: Date.now() });
  }

  return [...table.values()].sort((a, b) => {
    const pointsA = a.points ?? a.wins * 3 + a.draws;
    const pointsB = b.points ?? b.wins * 3 + b.draws;
    if (pointsB !== pointsA) return pointsB - pointsA;
    if (b.goalBalance !== a.goalBalance) return b.goalBalance - a.goalBalance;
    return b.goalsFor - a.goalsFor;
  });
}

export async function getEspnCrestForTeam(teamName: string): Promise<string | null> {
  const key = `espn:standings:brasileirao:${ESPN_BRAZIL_SEASON_YEAR}`;
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
