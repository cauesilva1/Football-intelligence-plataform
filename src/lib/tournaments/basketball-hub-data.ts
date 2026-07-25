import { unstable_cache } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import { attachTeamIdsToStandings } from "@/lib/tournaments/attach-standing-team-ids";
import {
  fetchNbaGroupedStandings,
  type NbaStandingGroup,
} from "@/lib/api/espn-nba-standings";
import {
  emptyNbaCompetitionLeaders,
  getNbaCompetitionLeaders,
  getNcaaCompetitionLeaders,
  nbaSeasonLabel,
  resolveNbaHubSeasonYears,
  type NbaCompetitionLeaders,
} from "@/lib/api/espn-nba-leaders";
import {
  fetchNcaaGroupedStandings,
  resolveNcaaHubSeasonYears,
} from "@/lib/api/espn-ncaa-standings";
import {
  fetchNbaScheduleBundle,
  fetchNcaaScheduleBundle,
  type NbaScheduleBundle,
} from "@/lib/api/espn-nba-schedule";
import type { BasketballCompetitionConfig } from "@/lib/tournaments/basketball-competitions";
import {
  EUROLEAGUE_ESPN_SLUG,
  EUROLEAGUE_LABEL,
  EUROLEAGUE_SEASON_YEAR,
} from "@/lib/api/euroleague";
import type { NbaLeaderRow } from "@/lib/api/espn-nba-leaders";

const BASKETBALL_HUB_REVALIDATE_SECONDS = 180;

export interface BasketballHubFranchise {
  id: string;
  name: string;
  shortName: string;
  crestUrl?: string;
  country?: string;
}

export interface BasketballSeasonSlice {
  seasonYear: number;
  seasonLabel: string;
  kind: "current" | "past";
  standings: NbaStandingGroup[];
  leaders: NbaCompetitionLeaders;
  hasStandings: boolean;
  hasLeaders: boolean;
}

export interface BasketballCompetitionHubData {
  standings: NbaStandingGroup[];
  schedule: NbaScheduleBundle;
  franchises: BasketballHubFranchise[];
  leaders: NbaCompetitionLeaders;
  /** Metadata for season toggles — only the selected slice is fully loaded. */
  seasonSlices: BasketballSeasonSlice[];
  selectedSeasonYear: number;
  notice?: string;
}

/** NCAA 2026-27 tip-off is early November 2026 — before that, season has not started. */
export function hasNcaaSeasonStarted(now = new Date()): boolean {
  return now >= new Date(Date.UTC(2026, 10, 1)); // 1 Nov 2026
}

async function resolveCompetitionId(
  where: NonNullable<Parameters<ReturnType<typeof getPrisma>["competition"]["findFirst"]>[0]>["where"]
): Promise<string | undefined> {
  if (!canUseDatabase()) return undefined;
  const competition = await getPrisma().competition.findFirst({
    where,
    select: { id: true },
  });
  return competition?.id;
}

async function loadNbaFranchises(): Promise<BasketballHubFranchise[]> {
  if (!canUseDatabase()) return [];

  const competitionId = await resolveCompetitionId({
    OR: [
      { name: { equals: "NBA", mode: "insensitive" } },
      { espnSlug: "nba" },
    ],
  });

  const teams = await getPrisma().team.findMany({
    where: competitionId
      ? { competitionId }
      : { competition: { name: { equals: "NBA", mode: "insensitive" } } },
    select: { id: true, name: true, shortName: true, crestUrl: true, country: true },
    orderBy: { name: "asc" },
  });

  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    crestUrl: t.crestUrl ?? undefined,
    country: t.country,
  }));
}

async function loadNcaaPrograms(): Promise<BasketballHubFranchise[]> {
  if (!canUseDatabase()) return [];

  const competitionId = await resolveCompetitionId({
    OR: [
      { name: { contains: "NCAA", mode: "insensitive" } },
      { espnSlug: "mens-college-basketball" },
    ],
  });

  const teams = await getPrisma().team.findMany({
    where: competitionId
      ? { competitionId }
      : { competition: { name: { contains: "NCAA", mode: "insensitive" } } },
    select: { id: true, name: true, shortName: true, crestUrl: true, country: true },
    orderBy: { name: "asc" },
    take: 120,
  });

  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    crestUrl: t.crestUrl ?? undefined,
    country: t.country,
  }));
}

async function loadEuroLeagueClubs(): Promise<BasketballHubFranchise[]> {
  if (!canUseDatabase()) return [];

  const competitionId = await resolveCompetitionId({
    OR: [
      { espnSlug: EUROLEAGUE_ESPN_SLUG },
      { name: { equals: EUROLEAGUE_LABEL, mode: "insensitive" } },
    ],
  });

  const teams = await getPrisma().team.findMany({
    where: competitionId
      ? { competitionId }
      : { competition: { name: { equals: EUROLEAGUE_LABEL, mode: "insensitive" } } },
    select: { id: true, name: true, shortName: true, crestUrl: true, country: true },
    orderBy: { name: "asc" },
  });

  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    crestUrl: t.crestUrl ?? undefined,
    country: t.country,
  }));
}

function toLeaderRows(
  rows: Array<{ playerName: string; teamName: string; value: number }>,
  decimals = 1
): NbaLeaderRow[] {
  return rows.map((row, index) => ({
    rank: index + 1,
    playerName: row.playerName,
    teamName: row.teamName,
    value: row.value,
    displayValue: row.value.toFixed(decimals),
  }));
}

async function loadEuroLeagueLeadersFromDb(): Promise<NbaCompetitionLeaders> {
  const empty = emptyNbaCompetitionLeaders(EUROLEAGUE_SEASON_YEAR);
  if (!canUseDatabase()) return empty;

  const stats = await getPrisma().playerSeasonStats.findMany({
    where: {
      season: EUROLEAGUE_SEASON_YEAR,
      matchesPlayed: { gte: 5 },
      player: { sport: "BASKETBALL", league: EUROLEAGUE_LABEL },
    },
    select: {
      points: true,
      rebounds: true,
      assists: true,
      steals: true,
      blocks: true,
      matchesPlayed: true,
      minutesPlayed: true,
      player: {
        select: {
          knownAs: true,
          fullName: true,
          team: { select: { name: true, shortName: true } },
        },
      },
    },
    take: 400,
  });

  const mapped = stats.map((s) => {
    const playerName = s.player.knownAs || s.player.fullName;
    const teamName = s.player.team?.shortName || s.player.team?.name || "—";
    return {
      playerName,
      teamName,
      points: s.points,
      rebounds: s.rebounds,
      assists: s.assists,
      steals: s.steals,
      blocks: s.blocks,
    };
  });

  const top = (key: "points" | "rebounds" | "assists" | "steals" | "blocks") =>
    [...mapped]
      .sort((a, b) => b[key] - a[key])
      .slice(0, 10)
      .map((r) => ({ playerName: r.playerName, teamName: r.teamName, value: r[key] }));

  return {
    points: toLeaderRows(top("points")),
    rebounds: toLeaderRows(top("rebounds")),
    assists: toLeaderRows(top("assists")),
    steals: toLeaderRows(top("steals")),
    blocks: toLeaderRows(top("blocks")),
    seasonYear: EUROLEAGUE_SEASON_YEAR,
    seasonLabel: "2025-26",
    fetchedAt: new Date().toISOString(),
  };
}

async function loadEuroLeagueHub(): Promise<BasketballCompetitionHubData> {
  const [franchises, leaders] = await Promise.all([
    loadEuroLeagueClubs(),
    loadEuroLeagueLeadersFromDb(),
  ]);

  const hasLeaders =
    leaders.points.length +
      leaders.rebounds.length +
      leaders.assists.length +
      leaders.steals.length +
      leaders.blocks.length >
    0;

  const slice: BasketballSeasonSlice = {
    seasonYear: EUROLEAGUE_SEASON_YEAR,
    seasonLabel: "2025-26",
    kind: "past",
    standings: [],
    leaders,
    hasStandings: false,
    hasLeaders,
  };

  return {
    standings: [],
    schedule: {
      live: [],
      past: [],
      scheduled: [],
      fetchedAt: new Date().toISOString(),
      notice: "Schedule UI uses ESPN; EuroLeague match lines sync via official API.",
    },
    franchises,
    leaders,
    seasonSlices: [slice],
    selectedSeasonYear: EUROLEAGUE_SEASON_YEAR,
    notice: hasLeaders
      ? "Season 2025-26 · leaders from synced EuroLeague boxscores"
      : "Season 2025-26 · run npm run data:sync-euroleague to load clubs, rosters, and boxscores",
  };
}

function sliceMeta(
  seasonYear: number,
  kind: "current" | "past",
  hasStandings: boolean,
  hasLeaders: boolean,
  seasonLabel: string
): BasketballSeasonSlice {
  return {
    seasonYear,
    seasonLabel,
    kind,
    standings: [],
    leaders: emptyNbaCompetitionLeaders(seasonYear),
    hasStandings,
    hasLeaders,
  };
}

async function loadNbaSeasonSlice(
  seasonYear: number,
  kind: "current" | "past",
  competitionId?: string
): Promise<BasketballSeasonSlice> {
  const [standingsPayload, leaders] = await Promise.all([
    fetchNbaGroupedStandings(seasonYear),
    getNbaCompetitionLeaders({ limit: 10, seasonYear }),
  ]);
  const standings = await attachTeamIdsToStandings(standingsPayload.groups, competitionId);
  const hasStandings = standings.some((g) => g.rows.length > 0);
  const hasLeaders =
    leaders.points.length +
      leaders.rebounds.length +
      leaders.assists.length +
      leaders.steals.length +
      leaders.blocks.length >
    0;

  return {
    seasonYear,
    seasonLabel: standingsPayload.seasonLabel || nbaSeasonLabel(seasonYear),
    kind,
    standings,
    leaders,
    hasStandings,
    hasLeaders,
  };
}

async function loadNcaaSeasonSlice(
  seasonYear: number,
  kind: "current" | "past",
  competitionId?: string
): Promise<BasketballSeasonSlice> {
  const [standingsPayload, leaders] = await Promise.all([
    fetchNcaaGroupedStandings(seasonYear),
    getNcaaCompetitionLeaders({ limit: 10, seasonYear }),
  ]);
  const standings = await attachTeamIdsToStandings(standingsPayload.groups, competitionId);
  const hasStandings = standings.some((g) => g.rows.length > 0);
  const hasLeaders =
    leaders.points.length +
      leaders.rebounds.length +
      leaders.assists.length +
      leaders.steals.length +
      leaders.blocks.length >
    0;

  return {
    seasonYear,
    seasonLabel: standingsPayload.seasonLabel || nbaSeasonLabel(seasonYear),
    kind,
    standings,
    leaders,
    hasStandings,
    hasLeaders,
  };
}

function resolveSelectedYear(
  requested: number | undefined,
  currentYear: number,
  pastYear: number,
  defaultYear: number
): { year: number; kind: "current" | "past" } {
  if (requested === currentYear) return { year: currentYear, kind: "current" };
  if (requested === pastYear) return { year: pastYear, kind: "past" };
  if (defaultYear === currentYear) return { year: currentYear, kind: "current" };
  return { year: pastYear, kind: "past" };
}

async function loadBasketballCompetitionHubUncached(
  config: BasketballCompetitionConfig,
  options?: { seasonYear?: number }
): Promise<BasketballCompetitionHubData> {
  if (config.slug === "euroleague") {
    return loadEuroLeagueHub();
  }

  if (config.slug === "nba") {
    const { currentYear, pastYear, defaultYear } = resolveNbaHubSeasonYears();
    const selectedMeta = resolveSelectedYear(
      options?.seasonYear,
      currentYear,
      pastYear,
      defaultYear
    );

    const competitionId = await resolveCompetitionId({
      OR: [{ espnSlug: "nba" }, { name: { equals: "NBA", mode: "insensitive" } }],
    });

    const [selected, schedule, franchises] = await Promise.all([
      loadNbaSeasonSlice(selectedMeta.year, selectedMeta.kind, competitionId),
      fetchNbaScheduleBundle().catch(() => ({
        live: [],
        past: [],
        scheduled: [],
        fetchedAt: new Date().toISOString(),
      })),
      loadNbaFranchises(),
    ]);

    // If selected season is empty and user didn't force it, fall back to past once.
    let active = selected;
    if (
      !options?.seasonYear &&
      selectedMeta.kind === "current" &&
      !selected.hasStandings &&
      !selected.hasLeaders
    ) {
      active = await loadNbaSeasonSlice(pastYear, "past", competitionId);
    }

    const seasonSlices: BasketballSeasonSlice[] = [
      active.seasonYear === currentYear
        ? active
        : sliceMeta(currentYear, "current", false, false, nbaSeasonLabel(currentYear)),
      active.seasonYear === pastYear
        ? active
        : sliceMeta(pastYear, "past", true, true, nbaSeasonLabel(pastYear)),
    ];

    const emptyNote =
      active.kind === "current" && !active.hasStandings
        ? " · current season standings are not available yet (offseason)"
        : "";

    return {
      standings: active.standings,
      schedule,
      franchises,
      leaders: active.leaders,
      seasonSlices,
      selectedSeasonYear: active.seasonYear,
      notice: `Season ${active.seasonLabel}${emptyNote} · ESPN leaders and standings`,
    };
  }

  const { currentYear, pastYear, defaultYear } = resolveNcaaHubSeasonYears();
  const effectiveDefault = hasNcaaSeasonStarted() ? defaultYear : pastYear;
  const selectedMeta = resolveSelectedYear(
    options?.seasonYear,
    currentYear,
    pastYear,
    effectiveDefault
  );

  const competitionId = await resolveCompetitionId({
    OR: [
      { espnSlug: "mens-college-basketball" },
      { name: { contains: "NCAA", mode: "insensitive" } },
    ],
  });

  const [selected, franchises, schedule] = await Promise.all([
    loadNcaaSeasonSlice(selectedMeta.year, selectedMeta.kind, competitionId),
    loadNcaaPrograms(),
    fetchNcaaScheduleBundle().catch(() => ({
      live: [],
      past: [],
      scheduled: [],
      fetchedAt: new Date().toISOString(),
      notice: undefined as string | undefined,
    })),
  ]);

  let active = selected;
  if (
    !options?.seasonYear &&
    selectedMeta.kind === "current" &&
    !selected.hasStandings &&
    !selected.hasLeaders
  ) {
    active = await loadNcaaSeasonSlice(pastYear, "past", competitionId);
  }

  const seasonSlices: BasketballSeasonSlice[] = [
    active.seasonYear === currentYear
      ? active
      : sliceMeta(currentYear, "current", false, false, nbaSeasonLabel(currentYear)),
    active.seasonYear === pastYear
      ? active
      : sliceMeta(pastYear, "past", true, true, nbaSeasonLabel(pastYear)),
  ];

  const ncaaStarted = hasNcaaSeasonStarted();
  const emptyNote =
    active.kind === "current" && !active.hasStandings
      ? ncaaStarted
        ? " · 2026/27 standings are not available yet"
        : " · tip-off is scheduled for November 2026"
      : "";
  const scheduleNote = schedule.notice ? ` · ${schedule.notice}` : "";

  return {
    standings: active.standings,
    schedule,
    franchises,
    leaders: active.hasLeaders
      ? active.leaders
      : emptyNbaCompetitionLeaders(active.seasonYear),
    seasonSlices,
    selectedSeasonYear: active.seasonYear,
    notice: `Season ${active.seasonLabel}${emptyNote}${scheduleNote} · ESPN conferences, leaders, and games`,
  };
}

export async function loadBasketballCompetitionHub(
  config: BasketballCompetitionConfig,
  options?: { seasonYear?: number }
): Promise<BasketballCompetitionHubData> {
  const seasonKey = options?.seasonYear != null ? String(options.seasonYear) : "default";
  return unstable_cache(
    () => loadBasketballCompetitionHubUncached(config, options),
    ["basketball-competition-hub", config.slug, seasonKey],
    {
      revalidate: BASKETBALL_HUB_REVALIDATE_SECONDS,
      tags: ["basketball-hub", `basketball-hub-${config.slug}`],
    }
  )();
}
