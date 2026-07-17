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
        ? " · temporada atual ainda sem tabela (offseason)"
        : "";

    return {
      standings: active.standings,
      schedule,
      franchises,
      leaders: active.leaders,
      seasonSlices,
      selectedSeasonYear: active.seasonYear,
      notice: `Temporada ${active.seasonLabel}${emptyNote} · líderes e classificação ESPN`,
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
        ? " · tabela 2026/27 ainda vazia"
        : " · tip-off previsto para novembro de 2026"
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
    notice: `Temporada ${active.seasonLabel}${emptyNote}${scheduleNote} · conferências, líderes e jogos ESPN`,
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
