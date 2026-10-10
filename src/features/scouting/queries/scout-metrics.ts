import { getPrisma } from "@/lib/prisma";
import { fbrefLeagueKeyForCompetition, fbrefScoutLeague } from "@/lib/providers/fbref/scout-leagues";
import {
  formatScoutValue,
  scoutMetricCopy,
  scoutPercentile,
  SCOUT_METRIC_COPY,
  SCOUT_METRIC_MIN_COHORT,
} from "@/lib/soccer/scout-metrics";

export interface ScoutMetricRowModel {
  id: string;
  label: string;
  explainer: string;
  valueLabel: string;
  percentile: number | null;
  cohortSize: number;
  provider: string;
  seasonLabel: string;
}

export interface ScoutMetricsModel {
  leagueKey: string | null;
  competitionName: string | null;
  seasonLabel: string | null;
  provider: string | null;
  rows: ScoutMetricRowModel[];
  minCohort: number;
}

function seasonStart(season: string | undefined, fallback: number | null): number | null {
  const match = /^(\d{4})/.exec(season ?? "");
  if (match) return Number(match[1]);
  return fallback;
}

export async function queryScoutMetrics(
  playerId: string,
  competitionName: string | null | undefined,
  season: string | undefined
): Promise<ScoutMetricsModel> {
  const leagueKey = fbrefLeagueKeyForCompetition(competitionName);
  const empty: ScoutMetricsModel = {
    leagueKey,
    competitionName: competitionName ?? null,
    seasonLabel: null,
    provider: null,
    rows: [],
    minCohort: SCOUT_METRIC_MIN_COHORT,
  };
  if (!leagueKey) return empty;
  const league = fbrefScoutLeague(leagueKey);
  if (!league) return empty;

  const prisma = getPrisma();
  const available = await prisma.scoutMetric.findMany({
    where: { playerId, leagueKey },
    select: { season: true },
    distinct: ["season"],
    orderBy: { season: "desc" },
  });
  const selected = seasonStart(
    season,
    available[0]?.season ?? null
  );
  if (selected == null) return { ...empty, seasonLabel: league.seasonLabel };

  const mine = await prisma.scoutMetric.findMany({
    where: { playerId, leagueKey, season: selected },
    orderBy: { metric: "asc" },
  });
  if (!mine.length) {
    return { ...empty, seasonLabel: league.seasonLabel };
  }

  const provider = mine[0]?.provider ?? "fbref";
  const cohortRows = await prisma.scoutMetric.findMany({
    where: {
      leagueKey,
      season: selected,
      provider,
      metric: { in: mine.map((row) => row.metric) },
    },
    select: { metric: true, value: true },
  });
  const cohorts = new Map<string, number[]>();
  for (const row of cohortRows) {
    const list = cohorts.get(row.metric) ?? [];
    list.push(row.value);
    cohorts.set(row.metric, list);
  }

  const order = new Map(SCOUT_METRIC_COPY.map((item, index) => [item.id, index]));
  const rows = mine
    .flatMap((row) => {
      const copy = scoutMetricCopy(row.metric);
      if (!copy) return [];
      const cohort = cohorts.get(row.metric) ?? [];
      return [
        {
          id: row.metric,
          label: copy.label,
          explainer: copy.explainer,
          valueLabel: formatScoutValue(row.value),
          percentile: scoutPercentile(row.value, cohort),
          cohortSize: cohort.length,
          provider: row.provider,
          seasonLabel: league.seasonLabel,
        },
      ];
    })
    .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));

  return {
    leagueKey,
    competitionName: league.competitionName,
    seasonLabel: league.seasonLabel,
    provider,
    rows,
    minCohort: SCOUT_METRIC_MIN_COHORT,
  };
}
