import type { PlayerSeasonStats } from "@prisma/client";
import { toPlayerStatistic, type StatisticInput } from "@/lib/metrics/map-statistic";
import type { PlayerMetricPer90, PlayerStatistic } from "@/types";

const CALENDAR_SEASONS = new Set(["2025", "2026"]);

function estimateSoccerSeasonRating(stat: {
  goals: number;
  assists: number;
  minutesPlayed: number;
}): number {
  const minutes = stat.minutesPlayed > 0 ? stat.minutesPlayed : 90;
  const goalsPer90 = (stat.goals / minutes) * 90;
  const assistsPer90 = (stat.assists / minutes) * 90;
  const rating = 6 + goalsPer90 * 0.35 + assistsPer90 * 0.25;
  return Number(Math.min(10, Math.max(5, rating)).toFixed(2));
}

function estimateBasketballSeasonRating(stat: {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
}): number {
  const rating =
    6 +
    stat.points * 0.08 +
    stat.rebounds * 0.04 +
    stat.assists * 0.05 +
    stat.steals * 0.15 +
    stat.blocks * 0.12;
  return Number(Math.min(10, Math.max(5, rating)).toFixed(2));
}

/** Basquete: stats no banco são médias por jogo; normaliza para taxa por 48 min (padrão NBA). */
function computeBasketballPer48(stat: PlayerSeasonStats): PlayerMetricPer90 {
  const games = stat.matchesPlayed > 0 ? stat.matchesPlayed : 1;
  const minutes = stat.minutesPlayed > 0 ? stat.minutesPlayed : games * 24;
  const per48 = (value: number) => Number(((value * games) / minutes * 48).toFixed(2));

  return {
    goals: per48(stat.points),
    assists: per48(stat.rebounds),
    shots: per48(stat.steals),
    keyPasses: per48(stat.blocks),
    dribbles: per48(stat.assists),
    tackles: stat.fieldGoalsPercent,
    interceptions: stat.threePointsPercent,
  };
}

function mapSoccerSeasonStatsRow(
  stat: PlayerSeasonStats,
  team?: { id: string; name: string; shortName: string }
): PlayerStatistic {
  const input: StatisticInput = {
    id: stat.id,
    playerId: stat.playerId,
    teamId: team?.id ?? "",
    teamName: team?.name,
    teamShortName: team?.shortName,
    season: String(stat.season),
    appearances: stat.matchesPlayed,
    minutesPlayed: stat.minutesPlayed,
    goals: stat.goals,
    assists: stat.assists,
    xG: 0,
    xA: 0,
    shots: 0,
    shotsOnTarget: 0,
    passes: 0,
    passAccuracy: stat.passingAccuracy,
    keyPasses: 0,
    dribblesCompleted: 0,
    tacklesWon: stat.tackles,
    interceptions: stat.interceptions,
    duelsWonPct: 0,
    yellowCards: 0,
    redCards: 0,
    rating: estimateSoccerSeasonRating(stat),
  };

  return { ...toPlayerStatistic(input), sport: "SOCCER" };
}

function mapBasketballSeasonStatsRow(
  stat: PlayerSeasonStats,
  team?: { id: string; name: string; shortName: string }
): PlayerStatistic {
  const per90 = computeBasketballPer48(stat);

  return {
    id: stat.id,
    playerId: stat.playerId,
    teamId: team?.id ?? "",
    teamName: team?.name,
    teamShortName: team?.shortName,
    season: String(stat.season),
    sport: "BASKETBALL",
    appearances: stat.matchesPlayed,
    minutesPlayed: stat.minutesPlayed,
    goals: 0,
    assists: stat.assists,
    xG: 0,
    xA: 0,
    shots: 0,
    shotsOnTarget: 0,
    passes: 0,
    passAccuracy: 0,
    keyPasses: 0,
    dribblesCompleted: 0,
    tacklesWon: 0,
    interceptions: 0,
    duelsWonPct: 0,
    yellowCards: 0,
    redCards: 0,
    rating: estimateBasketballSeasonRating(stat),
    points: stat.points,
    rebounds: stat.rebounds,
    steals: stat.steals,
    blocks: stat.blocks,
    fieldGoalsPercent: stat.fieldGoalsPercent,
    threePointsPercent: stat.threePointsPercent,
    per90,
    perGame: {
      points: stat.points,
      rebounds: stat.rebounds,
      steals: stat.steals,
      blocks: stat.blocks,
      assists: stat.assists,
    },
  };
}

export function mapSeasonStatsRow(
  stat: PlayerSeasonStats,
  sport: string = "SOCCER",
  team?: { id: string; name: string; shortName: string }
): PlayerStatistic {
  if (sport === "BASKETBALL") {
    return mapBasketballSeasonStatsRow(stat, team);
  }

  return mapSoccerSeasonStatsRow(stat, team);
}

export function isCalendarSeasonLabel(season: string): boolean {
  return CALENDAR_SEASONS.has(season);
}

export function sortSeasonLabels(seasons: string[]): string[] {
  return [...new Set(seasons)].sort((a, b) => {
    const yearA = Number.parseInt(a.split("/")[0] ?? a, 10);
    const yearB = Number.parseInt(b.split("/")[0] ?? b, 10);
    return yearA - yearB;
  });
}

export function pickDefaultSeason(availableSeasons: string[]): string | undefined {
  if (!availableSeasons.length) return undefined;
  return sortSeasonLabels(availableSeasons).at(-1);
}

export function mergeSeasonHistories(
  legacyStats: PlayerStatistic[],
  seasonStats: PlayerStatistic[]
): PlayerStatistic[] {
  const merged = new Map<string, PlayerStatistic>();

  for (const stat of legacyStats) {
    if (isCalendarSeasonLabel(stat.season) && seasonStats.some((row) => row.season === stat.season)) {
      continue;
    }
    merged.set(stat.season, stat);
  }

  for (const stat of seasonStats) {
    merged.set(stat.season, stat);
  }

  return sortSeasonLabels([...merged.keys()]).map((season) => merged.get(season)!);
}

export function resolveSelectedSeasonStats(
  history: PlayerStatistic[],
  preferredSeason?: string
): { selectedSeason: string; currentSeasonStats: PlayerStatistic } {
  const availableSeasons = sortSeasonLabels(history.map((row) => row.season));
  const selectedSeason =
    (preferredSeason && availableSeasons.includes(preferredSeason)
      ? preferredSeason
      : pickDefaultSeason(availableSeasons)) ?? preferredSeason ?? "2025";

  const currentSeasonStats =
    history.find((row) => row.season === selectedSeason) ??
    history[history.length - 1] ?? {
      id: "empty",
      playerId: "",
      teamId: "",
      season: selectedSeason,
      appearances: 0,
      minutesPlayed: 0,
      goals: 0,
      assists: 0,
      xG: 0,
      xA: 0,
      shots: 0,
      shotsOnTarget: 0,
      passes: 0,
      passAccuracy: 0,
      keyPasses: 0,
      dribblesCompleted: 0,
      tacklesWon: 0,
      interceptions: 0,
      duelsWonPct: 0,
      yellowCards: 0,
      redCards: 0,
      rating: 0,
      per90: {
        goals: 0,
        assists: 0,
        shots: 0,
        keyPasses: 0,
        dribbles: 0,
        tackles: 0,
        interceptions: 0,
      },
    };

  return { selectedSeason, currentSeasonStats };
}
