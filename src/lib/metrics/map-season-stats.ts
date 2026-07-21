import type { PlayerSeasonStats } from "@prisma/client";
import { toPlayerStatistic, type StatisticInput } from "@/lib/metrics/map-statistic";
import { computeSoccerRating } from "@/lib/scoring/soccer-rating";
import type { PlayerMetricPer90, PlayerStatistic } from "@/types";

const CALENDAR_SEASONS = new Set(["2024", "2025", "2026", "2027"]);

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
    rating: computeSoccerRating(stat),
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

function estimateFootballSeasonRating(stat: {
  totalYards: number;
  touchdowns: number;
  tackles: number;
  sacks: number;
  matchesPlayed: number;
}): number {
  const games = Math.max(stat.matchesPlayed, 1);
  const yardsPerGame = stat.totalYards / games;
  const tdPerGame = stat.touchdowns / games;
  const rating =
    6 +
    yardsPerGame * 0.004 +
    tdPerGame * 0.35 +
    (stat.tackles / games) * 0.03 +
    (stat.sacks / games) * 0.2;
  return Number(Math.min(10, Math.max(5, rating)).toFixed(2));
}

function mapAmericanFootballSeasonStatsRow(
  stat: PlayerSeasonStats,
  team?: { id: string; name: string; shortName: string }
): PlayerStatistic {
  const passingYards = Math.round(stat.threePointsPercent || 0);
  const rushingYards = stat.rebounds;
  const receivingYards = stat.blocks;
  const totalYards = stat.points || passingYards + rushingYards + receivingYards;
  const touchdowns = stat.goals;
  const sacks = Number((stat.steals / 10).toFixed(1));
  const rating = estimateFootballSeasonRating({
    totalYards,
    touchdowns,
    tackles: stat.tackles,
    sacks,
    matchesPlayed: stat.matchesPlayed,
  });

  return {
    id: stat.id,
    playerId: stat.playerId,
    teamId: team?.id ?? "",
    teamName: team?.name,
    teamShortName: team?.shortName,
    season: String(stat.season),
    sport: "AMERICAN_FOOTBALL",
    appearances: stat.matchesPlayed,
    minutesPlayed: stat.minutesPlayed,
    goals: touchdowns,
    assists: stat.assists,
    xG: 0,
    xA: 0,
    shots: 0,
    shotsOnTarget: 0,
    passes: 0,
    passAccuracy: stat.passingAccuracy,
    keyPasses: 0,
    dribblesCompleted: 0,
    tacklesWon: Math.round(stat.tackles),
    interceptions: Math.round(stat.interceptions),
    duelsWonPct: 0,
    yellowCards: 0,
    redCards: 0,
    rating,
    points: totalYards,
    rebounds: rushingYards,
    steals: sacks,
    blocks: receivingYards,
    fieldGoalsPercent: stat.fieldGoalsPercent,
    threePointsPercent: passingYards,
    passingYards,
    rushingYards,
    receivingYards,
    touchdowns,
    sacks,
    totalYards,
    per90: {
      goals: touchdowns,
      assists: stat.assists,
      shots: passingYards,
      keyPasses: receivingYards,
      dribbles: rushingYards,
      tackles: stat.tackles,
      interceptions: stat.interceptions,
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
  if (sport === "AMERICAN_FOOTBALL") {
    return mapAmericanFootballSeasonStatsRow(stat, team);
  }

  return mapSoccerSeasonStatsRow(stat, team);
}

export function isCalendarSeasonLabel(season: string): boolean {
  return CALENDAR_SEASONS.has(season) || /^\d{4}$/.test(season) || /^\d{6}$/.test(season);
}

export function sortSeasonLabels(seasons: string[]): string[] {
  return [...new Set(seasons)].sort((a, b) => {
    const yearA = Number.parseInt(a.split("/")[0] ?? a, 10);
    const yearB = Number.parseInt(b.split("/")[0] ?? b, 10);
    if (yearA !== yearB) return yearA - yearB;
    // Same start year: prefer campaign labels (2025/26) over bare calendar (2025)
    const slashA = a.includes("/") ? 1 : 0;
    const slashB = b.includes("/") ? 1 : 0;
    if (slashA !== slashB) return slashA - slashB;
    return a.localeCompare(b);
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

/**
 * European campaigns are stored twice in some pipelines:
 * - PlayerStatistic.season = "2025/26"
 * - PlayerSeasonStats.season (int) → "2025"
 * They are the same campaign (25/26). Collapse only when both labels exist.
 * Bare calendar years alone (e.g. Brasileirão 2025) stay as-is.
 */
export function collapseSoccerCampaignDuplicates(
  history: PlayerStatistic[]
): PlayerStatistic[] {
  const bySeason = new Map(history.map((row) => [row.season, row]));
  const bareYears = [...bySeason.keys()].filter((s) => /^\d{4}$/.test(s));

  for (const year of bareYears) {
    const y = Number(year);
    const campaign = `${y}/${String(y + 1).slice(-2)}`;
    const bare = bySeason.get(year);
    const slash = bySeason.get(campaign);
    if (!bare || !slash) continue;

    bySeason.set(campaign, mergeSoccerSeasonRows(slash, bare));
    bySeason.delete(year);
  }

  return sortSeasonLabels([...bySeason.keys()]).map((season) => bySeason.get(season)!);
}

function preferNumber(a: number, b: number): number {
  if (a > 0 && b > 0) return Math.max(a, b);
  return a > 0 ? a : b;
}

function mergeSoccerSeasonRows(
  primary: PlayerStatistic,
  secondary: PlayerStatistic
): PlayerStatistic {
  const merged = {
    ...primary,
    appearances: preferNumber(primary.appearances, secondary.appearances),
    minutesPlayed: preferNumber(primary.minutesPlayed, secondary.minutesPlayed),
    goals: preferNumber(primary.goals, secondary.goals),
    assists: preferNumber(primary.assists, secondary.assists),
    xG: preferNumber(primary.xG, secondary.xG),
    xA: preferNumber(primary.xA, secondary.xA),
    shots: preferNumber(primary.shots, secondary.shots),
    shotsOnTarget: preferNumber(primary.shotsOnTarget, secondary.shotsOnTarget),
    passes: preferNumber(primary.passes, secondary.passes),
    passAccuracy: preferNumber(primary.passAccuracy, secondary.passAccuracy),
    keyPasses: preferNumber(primary.keyPasses, secondary.keyPasses),
    dribblesCompleted: preferNumber(primary.dribblesCompleted, secondary.dribblesCompleted),
    tacklesWon: preferNumber(primary.tacklesWon, secondary.tacklesWon),
    interceptions: preferNumber(primary.interceptions, secondary.interceptions),
    duelsWonPct: preferNumber(primary.duelsWonPct, secondary.duelsWonPct),
    yellowCards: preferNumber(primary.yellowCards, secondary.yellowCards),
    redCards: preferNumber(primary.redCards, secondary.redCards),
    rating: preferNumber(primary.rating, secondary.rating),
  };
  return { ...merged, per90: computePer90FromStat(merged) };
}

function computePer90FromStat(stat: {
  minutesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  keyPasses: number;
  dribblesCompleted: number;
  tacklesWon: number;
  interceptions: number;
}): PlayerStatistic["per90"] {
  const m = Math.max(stat.minutesPlayed, 1);
  const rate = (v: number) => Number(((v / m) * 90).toFixed(2));
  return {
    goals: rate(stat.goals),
    assists: rate(stat.assists),
    shots: rate(stat.shots),
    keyPasses: rate(stat.keyPasses),
    dribbles: rate(stat.dribblesCompleted),
    tackles: rate(stat.tacklesWon),
    interceptions: rate(stat.interceptions),
  };
}

function basketballSeasonHasSignal(stat: PlayerStatistic): boolean {
  const points = stat.points ?? stat.perGame?.points ?? 0;
  const rebounds = stat.rebounds ?? stat.perGame?.rebounds ?? 0;
  const assists = stat.perGame?.assists ?? stat.assists ?? 0;
  return points > 0 || rebounds > 0 || assists > 0 || (stat.rating ?? 0) > 6.05;
}

function footballSeasonHasSignal(stat: PlayerStatistic): boolean {
  const yards = stat.totalYards ?? stat.points ?? 0;
  const tds = stat.touchdowns ?? stat.goals ?? 0;
  const tackles = stat.tacklesWon ?? 0;
  const sacks = stat.sacks ?? 0;
  return yards > 0 || tds > 0 || tackles > 0 || sacks > 0 || (stat.rating ?? 0) > 6.05;
}

/** Prefer seasons that actually have filled scouting metrics (not empty calendar stubs). */
function soccerSeasonRichness(stat: PlayerStatistic): number {
  let score = 0;
  score += Math.min(stat.minutesPlayed, 3_000);
  score += Math.min(stat.appearances, 40) * 10;
  if (stat.xG > 0) score += 120;
  if (stat.xA > 0) score += 80;
  if (stat.shots > 0) score += 60;
  if (stat.passes > 0) score += 60;
  if (stat.duelsWonPct > 0) score += 40;
  if (stat.keyPasses > 0) score += 40;
  if (stat.season.includes("/")) score += 250;
  return score;
}

function soccerSeasonHasSignal(stat: PlayerStatistic): boolean {
  return soccerSeasonRichness(stat) > 250;
}

/** Prefer a season with real production over empty upcoming stubs (e.g. 202627 / 2026). */
function pickBestSeasonWithSignal(
  history: PlayerStatistic[],
  preferredSeason: string | undefined,
  hasSignal: (stat: PlayerStatistic) => boolean
): string | undefined {
  if (preferredSeason) {
    const preferred = history.find((row) => row.season === preferredSeason);
    if (preferred && hasSignal(preferred)) return preferredSeason;
  }

  const withSignal = [...history]
    .filter(hasSignal)
    .sort((a, b) => {
      const yearA = Number.parseInt(a.season.replace(/\D/g, "").slice(0, 4) || "0", 10);
      const yearB = Number.parseInt(b.season.replace(/\D/g, "").slice(0, 4) || "0", 10);
      if (yearB !== yearA) return yearB - yearA;
      return soccerSeasonRichness(b) - soccerSeasonRichness(a);
    });

  if (withSignal[0]) return withSignal[0].season;
  return pickDefaultSeason(history.map((row) => row.season));
}

function pickBestSoccerSeason(
  history: PlayerStatistic[],
  preferredSeason: string | undefined
): string | undefined {
  if (preferredSeason) {
    const preferred = history.find((row) => row.season === preferredSeason);
    if (preferred) return preferredSeason;
  }

  const ranked = [...history].sort((a, b) => {
    const rich = soccerSeasonRichness(b) - soccerSeasonRichness(a);
    if (rich !== 0) return rich;
    const yearA = Number.parseInt(a.season.split("/")[0] ?? a.season, 10);
    const yearB = Number.parseInt(b.season.split("/")[0] ?? b.season, 10);
    return yearB - yearA;
  });

  return ranked[0]?.season ?? pickDefaultSeason(history.map((row) => row.season));
}

export function resolveSelectedSeasonStats(
  history: PlayerStatistic[],
  preferredSeason?: string,
  sport?: string
): { selectedSeason: string; currentSeasonStats: PlayerStatistic } {
  const availableSeasons = sortSeasonLabels(history.map((row) => row.season));

  const selectedSeason =
    sport === "BASKETBALL"
      ? pickBestSeasonWithSignal(history, preferredSeason, basketballSeasonHasSignal) ??
        preferredSeason ??
        "202526"
      : sport === "AMERICAN_FOOTBALL"
        ? pickBestSeasonWithSignal(history, preferredSeason, footballSeasonHasSignal) ??
          preferredSeason ??
          "2025"
        : pickBestSoccerSeason(history, preferredSeason) ??
          (preferredSeason && availableSeasons.includes(preferredSeason)
            ? preferredSeason
            : pickDefaultSeason(availableSeasons)) ??
          preferredSeason ??
          "2025";
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
