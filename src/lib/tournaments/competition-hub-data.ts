import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import { getEspnGroupedStandings, getEspnLeagueStandings } from "@/lib/crests/espn-standings";
import {
  emptyCompetitionLeaders,
  getEspnCompetitionLeaders,
  type CompetitionLeaders,
} from "@/lib/api/espn-leaders";
import {
  fetchEspnScoreboard,
  type EspnScoreboardEvent,
} from "@/lib/api/espn-matches";
import {
  countWorldCupDbFixtures,
  loadWorldCup2026Matches,
  WC_MIN_DB_FIXTURES,
} from "@/lib/tournaments/world-cup-2026";
import {
  FIFA_WORLD_CUP_SEASON_LABEL,
  FIFA_WORLD_CUP_SLUG,
} from "@/lib/seasons";
import {
  fromEspnScoreboardEvent,
  fromStatsBombMatch,
} from "@/lib/tournaments/match-normalizer";
import {
  aggregateTeamStatsFromMatches,
  type AggregatedTeamStats,
} from "@/lib/statsbomb/aggregate-team-stats";
import { fetchStatsBombMatches } from "@/lib/statsbomb/fetch-matches";
import { TOURNAMENTS } from "@/lib/statsbomb/constants";
import type { SoccerCompetitionConfig } from "@/lib/tournaments/soccer-competitions";
import type { TournamentMatch } from "@/lib/tournaments/types";
import type { StatsBombMatch } from "@/lib/statsbomb/types";
import { namesLikelyMatch } from "@/lib/sync/data-staleness";

export interface StandingGroup {
  label: string;
  rows: AggregatedTeamStats[];
}

export interface CompetitionHubData {
  standings: StandingGroup[];
  matches: TournamentMatch[];
  leaders: CompetitionLeaders;
  notice?: string;
}

function sortStandings(rows: AggregatedTeamStats[]): AggregatedTeamStats[] {
  return [...rows].sort((a, b) => {
    const pointsA = a.points ?? a.wins * 3 + a.draws;
    const pointsB = b.points ?? b.wins * 3 + b.draws;
    if (pointsB !== pointsA) return pointsB - pointsA;
    if (b.goalBalance !== a.goalBalance) return b.goalBalance - a.goalBalance;
    return b.goalsFor - a.goalsFor;
  });
}

/** Resolve Supabase team ids so standings rows can link to `/teams/[id]`. */
async function attachTeamIdsToStandings(
  groups: StandingGroup[],
  espnSlug?: string | null
): Promise<StandingGroup[]> {
  if (!canUseDatabase() || groups.length === 0) return groups;

  const prisma = getPrisma();
  const competition = espnSlug
    ? await prisma.competition.findFirst({
        where: { espnSlug },
        select: { id: true },
      })
    : null;

  const standingNames = [
    ...new Set(groups.flatMap((group) => group.rows.map((row) => row.teamName))),
  ];

  const teams = competition
    ? await prisma.team.findMany({
        where: { competitionId: competition.id },
        select: { id: true, name: true, shortName: true },
      })
    : await prisma.team.findMany({
        where: {
          OR: standingNames.map((name) => ({
            name: { equals: name, mode: "insensitive" as const },
          })),
        },
        select: { id: true, name: true, shortName: true },
      });

  if (teams.length === 0) return groups;

  const resolveId = (teamName: string): string | undefined => {
    const exact = teams.find((t) => t.name.toLowerCase() === teamName.toLowerCase());
    if (exact) return exact.id;
    const fuzzy = teams.find(
      (t) =>
        namesLikelyMatch(t.name, teamName) || namesLikelyMatch(t.shortName, teamName)
    );
    return fuzzy?.id;
  };

  return groups.map((group) => ({
    ...group,
    rows: group.rows.map((row) => ({
      ...row,
      teamId: row.teamId ?? resolveId(row.teamName),
    })),
  }));
}

function buildWorldCupGroupStandings(matches: StatsBombMatch[]): StandingGroup[] {
  const groupStage = matches.filter((m) =>
    (m.competition_stage?.name ?? "").toLowerCase().includes("group")
  );

  const byGroup = new Map<string, StatsBombMatch[]>();
  for (const match of groupStage) {
    const group =
      match.home_team.home_team_group ??
      match.away_team.away_team_group ??
      "Grupos";
    const list = byGroup.get(group) ?? [];
    list.push(match);
    byGroup.set(group, list);
  }

  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, groupMatches]) => {
      const table = aggregateTeamStatsFromMatches(groupMatches, "2026", "FIFA World Cup");
      const rows = sortStandings([...table.values()]).map((row) => ({
        ...row,
        points: row.points ?? row.wins * 3 + row.draws,
      }));
      return { label: label.startsWith("Group") || label.startsWith("Grupo") ? label.replace(/^Grupo\b/, "Group") : `Group ${label}`, rows };
    });
}

async function loadDbMatchesForEspnSlug(
  espnSlug: string,
  seasonLabel?: string,
  take = 120
): Promise<TournamentMatch[]> {
  if (!canUseDatabase()) return [];

  const prisma = getPrisma();
  const competition = await prisma.competition.findFirst({
    where: { espnSlug },
    select: { id: true },
  });
  if (!competition) return [];

  const rows = await prisma.match.findMany({
    where: {
      competitionId: competition.id,
      ...(seasonLabel ? { seasonLabel } : {}),
    },
    include: {
      homeTeam: { select: { name: true, crestUrl: true } },
      awayTeam: { select: { name: true, crestUrl: true } },
    },
    orderBy: { matchDate: "desc" },
    take,
  });

  return rows.map((row) => {
    const mapped = fromEspnScoreboardEvent({
      externalKey: row.externalKey ?? row.id,
      homeTeamName: row.homeTeam.name,
      awayTeamName: row.awayTeam.name,
      homeScore: row.homeScore,
      awayScore: row.awayScore,
      matchDate: row.matchDate,
      round: row.round,
      status: row.status ?? "scheduled",
    });
    return {
      ...mapped,
      id: row.externalKey ?? row.id,
      homeCrestUrl: row.homeTeam.crestUrl ?? undefined,
      awayCrestUrl: row.awayTeam.crestUrl ?? undefined,
      stadium: "—",
    };
  });
}

async function loadEspnLiveBoard(
  config: SoccerCompetitionConfig
): Promise<TournamentMatch[]> {
  if (!config.espnSlug || !config.espnCompetitionLabel) return [];

  const events: EspnScoreboardEvent[] = await fetchEspnScoreboard(
    config.espnSlug,
    config.espnCompetitionLabel,
    {
      seasonYear: config.seasonYear,
      seasonLabel: config.seasonLabel,
    }
  );

  return events.map((event) => fromEspnScoreboardEvent(event));
}

async function loadEspnCompetitionHub(
  config: SoccerCompetitionConfig
): Promise<CompetitionHubData> {
  // Read path only — fixtures/bootstrap run via cron / club pages (not inline).
  const [standingsRows, groupedStandings, dbMatches, liveMatches, leaders] = await Promise.all([
    getEspnLeagueStandings(config.espnCompetitionLabel),
    config.slug === "mls"
      ? getEspnGroupedStandings(config.espnCompetitionLabel)
      : Promise.resolve([]),
    config.espnSlug
      ? loadDbMatchesForEspnSlug(config.espnSlug, config.seasonLabel)
      : Promise.resolve([]),
    loadEspnLiveBoard(config),
    config.espnSlug && config.seasonYear
      ? getEspnCompetitionLeaders(config.espnSlug, config.seasonYear)
      : Promise.resolve(null),
  ]);

  const byId = new Map<string, TournamentMatch>();
  for (const match of [...dbMatches, ...liveMatches]) {
    byId.set(match.id, match);
  }

  const standings: StandingGroup[] =
    groupedStandings.length > 0
      ? groupedStandings.map((g) => ({
          label: g.label,
          rows: g.rows.map((row) => ({
            ...row,
            points: row.points ?? row.wins * 3 + row.draws,
          })),
        }))
      : (() => {
          const rows = sortStandings(standingsRows).map((row) => ({
            ...row,
            points: row.points ?? row.wins * 3 + row.draws,
          }));
          return rows.length ? [{ label: "Standings", rows }] : [];
        })();

  return {
    standings: await attachTeamIdsToStandings(standings, config.espnSlug),
    matches: [...byId.values()],
    leaders: leaders ?? emptyCompetitionLeaders(),
    notice: config.seasonLabel ? `Season ${config.seasonLabel}` : undefined,
  };
}

async function loadWorldCupHub(): Promise<CompetitionHubData> {
  // JSON for group tables (A–L) + background seed/sync into Match.
  const raw = await loadWorldCup2026Matches();
  const standings = await attachTeamIdsToStandings(
    buildWorldCupGroupStandings(raw),
    FIFA_WORLD_CUP_SLUG
  );

  const dbCount = await countWorldCupDbFixtures();
  if (dbCount >= WC_MIN_DB_FIXTURES) {
    const dbMatches = await loadDbMatchesForEspnSlug(
      FIFA_WORLD_CUP_SLUG,
      FIFA_WORLD_CUP_SEASON_LABEL,
      150
    );
    if (dbMatches.length > 0) {
      return {
        standings,
        matches: dbMatches,
        leaders: emptyCompetitionLeaders(),
        notice: "2026 World Cup · fixtures from database (ESPN sync)",
      };
    }
  }

  return {
    standings,
    matches: raw.map((m) => fromStatsBombMatch(m, "scraped")),
    leaders: emptyCompetitionLeaders(),
    notice: "2026 World Cup · local dataset (warming database…)",
  };
}

async function loadEuroHub(): Promise<CompetitionHubData> {
  const euro = TOURNAMENTS.find((t) => t.id === "eu-2020");
  if (!euro?.competitionId || !euro.seasonId) {
    return { standings: [], matches: [], leaders: emptyCompetitionLeaders() };
  }

  const raw = await fetchStatsBombMatches(euro.competitionId, euro.seasonId);
  const finished = raw.filter((m) => m.home_score != null && m.away_score != null);
  const groupStage = finished.filter((m) =>
    (m.competition_stage?.name ?? "").toLowerCase().includes("group")
  );
  const table = aggregateTeamStatsFromMatches(groupStage, "2020", "UEFA Euro");
  const rows = sortStandings([...table.values()]).map((row) => ({
    ...row,
    points: row.points ?? row.wins * 3 + row.draws,
  }));

  const standings = await attachTeamIdsToStandings(
    rows.length ? [{ label: "Standings (groups · Euro 2020)", rows }] : []
  );

  return {
    standings,
    matches: raw.map((m) => fromStatsBombMatch(m)),
    leaders: emptyCompetitionLeaders(),
    notice: "Arquivo StatsBomb · Euro 2020 (sem leaders ESPN)",
  };
}

export async function loadCompetitionHubData(
  config: SoccerCompetitionConfig
): Promise<CompetitionHubData> {
  switch (config.dataMode) {
    case "espn-db":
    case "espn-live":
      return loadEspnCompetitionHub(config);
    case "scraped-wc":
      return loadWorldCupHub();
    case "statsbomb":
      return loadEuroHub();
    default:
      return { standings: [], matches: [], leaders: emptyCompetitionLeaders() };
  }
}
