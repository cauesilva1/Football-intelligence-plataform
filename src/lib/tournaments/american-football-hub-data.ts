import { unstable_cache } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import { attachTeamIdsToStandings } from "@/lib/tournaments/attach-standing-team-ids";
import {
  fetchNflGroupedStandings,
  fetchCfbGroupedStandings,
  type FootballStandingGroup,
} from "@/lib/api/espn-football-standings";
import {
  emptyFootballCompetitionLeaders,
  getNflCompetitionLeaders,
  getCfbCompetitionLeaders,
  type FootballCompetitionLeaders,
} from "@/lib/api/espn-football-leaders";
import {
  fetchNflScheduleBundle,
  fetchCfbScheduleBundle,
  type FootballScheduleBundle,
} from "@/lib/api/espn-football-schedule";
import {
  footballSeasonLabel,
  resolveFootballHubSeasonYears,
} from "@/lib/api/espn-football-seasons";
import type { AmericanFootballCompetitionConfig } from "@/lib/tournaments/american-football-competitions";

const AF_HUB_REVALIDATE_SECONDS = 180;

export interface FootballHubFranchise {
  id: string;
  name: string;
  shortName: string;
  crestUrl?: string;
  country?: string;
}

export interface FootballSeasonSlice {
  seasonYear: number;
  seasonLabel: string;
  kind: "current" | "past";
  standings: FootballStandingGroup[];
  leaders: FootballCompetitionLeaders;
  hasStandings: boolean;
  hasLeaders: boolean;
}

export interface FootballCompetitionHubData {
  standings: FootballStandingGroup[];
  schedule: FootballScheduleBundle;
  franchises: FootballHubFranchise[];
  leaders: FootballCompetitionLeaders;
  seasonSlices: FootballSeasonSlice[];
  selectedSeasonYear: number;
  notice?: string;
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

async function loadFranchises(
  competitionWhere: NonNullable<
    Parameters<ReturnType<typeof getPrisma>["competition"]["findFirst"]>[0]
  >["where"],
  take?: number
): Promise<FootballHubFranchise[]> {
  if (!canUseDatabase()) return [];

  const competitionId = await resolveCompetitionId(competitionWhere);
  const teams = await getPrisma().team.findMany({
    where: competitionId ? { competitionId } : undefined,
    select: { id: true, name: true, shortName: true, crestUrl: true, country: true },
    orderBy: { name: "asc" },
    ...(take ? { take } : {}),
  });

  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    crestUrl: t.crestUrl ?? undefined,
    country: t.country,
  }));
}

function leadersHaveData(leaders: FootballCompetitionLeaders): boolean {
  return (
    leaders.passingYards.length +
      leaders.rushingYards.length +
      leaders.receivingYards.length +
      leaders.sacks.length +
      leaders.tackles.length >
    0
  );
}

function sliceMeta(
  seasonYear: number,
  kind: "current" | "past",
  hasStandings: boolean,
  hasLeaders: boolean
): FootballSeasonSlice {
  return {
    seasonYear,
    seasonLabel: footballSeasonLabel(seasonYear),
    kind,
    standings: [],
    leaders: emptyFootballCompetitionLeaders(seasonYear),
    hasStandings,
    hasLeaders,
  };
}

async function loadNflSeasonSlice(
  seasonYear: number,
  kind: "current" | "past",
  competitionId?: string
): Promise<FootballSeasonSlice> {
  const [standingsPayload, leaders] = await Promise.all([
    fetchNflGroupedStandings(seasonYear),
    getNflCompetitionLeaders({ limit: 10, seasonYear }),
  ]);
  const standings = await attachTeamIdsToStandings(standingsPayload.groups, competitionId);
  return {
    seasonYear,
    seasonLabel: standingsPayload.seasonLabel || footballSeasonLabel(seasonYear),
    kind,
    standings,
    leaders,
    hasStandings: standings.some((g) => g.rows.length > 0),
    hasLeaders: leadersHaveData(leaders),
  };
}

async function loadCfbSeasonSlice(
  seasonYear: number,
  kind: "current" | "past",
  competitionId?: string
): Promise<FootballSeasonSlice> {
  const [standingsPayload, leaders] = await Promise.all([
    fetchCfbGroupedStandings(seasonYear),
    getCfbCompetitionLeaders({ limit: 10, seasonYear }),
  ]);
  const standings = await attachTeamIdsToStandings(standingsPayload.groups, competitionId);
  return {
    seasonYear,
    seasonLabel: standingsPayload.seasonLabel || footballSeasonLabel(seasonYear),
    kind,
    standings,
    leaders,
    hasStandings: standings.some((g) => g.rows.length > 0),
    hasLeaders: leadersHaveData(leaders),
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

async function loadAmericanFootballCompetitionHubUncached(
  config: AmericanFootballCompetitionConfig,
  options?: { seasonYear?: number }
): Promise<FootballCompetitionHubData> {
  const { currentYear, pastYear, defaultYear } = resolveFootballHubSeasonYears();
  const selectedMeta = resolveSelectedYear(
    options?.seasonYear,
    currentYear,
    pastYear,
    defaultYear
  );

  if (config.slug === "nfl") {
    const competitionId = await resolveCompetitionId({
      OR: [{ espnSlug: "nfl" }, { name: { equals: "NFL", mode: "insensitive" } }],
    });

    const [selected, schedule, franchises] = await Promise.all([
      loadNflSeasonSlice(selectedMeta.year, selectedMeta.kind, competitionId),
      fetchNflScheduleBundle().catch(() => ({
        live: [],
        past: [],
        scheduled: [],
        fetchedAt: new Date().toISOString(),
      })),
      loadFranchises({
        OR: [{ espnSlug: "nfl" }, { name: { equals: "NFL", mode: "insensitive" } }],
      }),
    ]);

    let active = selected;
    if (
      !options?.seasonYear &&
      selectedMeta.kind === "current" &&
      !selected.hasStandings &&
      !selected.hasLeaders
    ) {
      active = await loadNflSeasonSlice(pastYear, "past", competitionId);
    }

    const seasonSlices: FootballSeasonSlice[] = [
      active.seasonYear === currentYear
        ? active
        : sliceMeta(currentYear, "current", false, false),
      active.seasonYear === pastYear
        ? active
        : sliceMeta(pastYear, "past", true, true),
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

  const competitionId = await resolveCompetitionId({
    OR: [
      { espnSlug: "college-football" },
      { name: { equals: "College Football", mode: "insensitive" } },
    ],
  });

  const [selected, schedule, franchises] = await Promise.all([
    loadCfbSeasonSlice(selectedMeta.year, selectedMeta.kind, competitionId),
    fetchCfbScheduleBundle().catch(() => ({
      live: [],
      past: [],
      scheduled: [],
      fetchedAt: new Date().toISOString(),
    })),
    loadFranchises(
      {
        OR: [
          { espnSlug: "college-football" },
          { name: { equals: "College Football", mode: "insensitive" } },
        ],
      },
      120
    ),
  ]);

  let active = selected;
  if (
    !options?.seasonYear &&
    selectedMeta.kind === "current" &&
    !selected.hasStandings &&
    !selected.hasLeaders
  ) {
    active = await loadCfbSeasonSlice(pastYear, "past", competitionId);
  }

  const seasonSlices: FootballSeasonSlice[] = [
    active.seasonYear === currentYear
      ? active
      : sliceMeta(currentYear, "current", false, false),
    active.seasonYear === pastYear ? active : sliceMeta(pastYear, "past", true, true),
  ];

  const emptyNote =
    active.kind === "current" && !active.hasStandings
      ? " · temporada atual ainda sem tabela (offseason)"
      : "";

  return {
    standings: active.standings,
    schedule,
    franchises,
    leaders: active.hasLeaders
      ? active.leaders
      : emptyFootballCompetitionLeaders(active.seasonYear),
    seasonSlices,
    selectedSeasonYear: active.seasonYear,
    notice: `Temporada ${active.seasonLabel}${emptyNote} · conferências elite e jogos ESPN`,
  };
}

export async function loadAmericanFootballCompetitionHub(
  config: AmericanFootballCompetitionConfig,
  options?: { seasonYear?: number }
): Promise<FootballCompetitionHubData> {
  const seasonKey = options?.seasonYear != null ? String(options.seasonYear) : "default";
  return unstable_cache(
    () => loadAmericanFootballCompetitionHubUncached(config, options),
    ["af-competition-hub", config.slug, seasonKey],
    {
      revalidate: AF_HUB_REVALIDATE_SECONDS,
      tags: ["af-hub", `af-hub-${config.slug}`],
    }
  )();
}
