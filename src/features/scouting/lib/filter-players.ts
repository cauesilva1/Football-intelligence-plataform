import { soccerValueScore } from "@/lib/scoring/soccer-rankings";
import { capValueScore } from "@/lib/scoring";
import { teams } from "@/lib/mock-data/teams";
import type { Player, PlayerFilters } from "@/types";

export type FilterPlayersOptions = {
  /** SQL/Prisma already applied search, position, league, team and age/rating/minutes filters */
  prismaPrefiltered?: boolean;
  /** Basquete /players — ignora filtros de métricas já aplicados no Prisma */
  rosterBrowse?: boolean;
};

export function computeXGPer90(minutesPlayed: number, xG: number): number {
  if (!minutesPlayed) return 0;
  return Number(((xG / minutesPlayed) * 90).toFixed(2));
}

function totalYardsOf(player: Player): number {
  const s = player.currentSeasonStats;
  return (
    s.totalYards ??
    (s.passingYards ?? 0) + (s.rushingYards ?? 0) + (s.receivingYards ?? 0)
  );
}

function yardsPerGameOf(player: Player): number {
  const games = Math.max(player.currentSeasonStats.appearances, 1);
  return totalYardsOf(player) / games;
}

function touchdownsPerGameOf(player: Player): number {
  const s = player.currentSeasonStats;
  const tds = s.touchdowns ?? s.goals ?? 0;
  return tds / Math.max(s.appearances, 1);
}

function sacksPerGameOf(player: Player): number {
  const s = player.currentSeasonStats;
  return (s.sacks ?? 0) / Math.max(s.appearances, 1);
}

function valueScoreOf(player: Player): number {
  const sport = player.sport ?? "SOCCER";
  if (sport === "BASKETBALL" || sport === "AMERICAN_FOOTBALL") {
    return capValueScore(player.currentSeasonStats.rating, player.capHit ?? 0);
  }
  return soccerValueScore(player.currentSeasonStats.rating, player.marketValue);
}

export function filterAndSortPlayers(
  all: Player[],
  filters: PlayerFilters,
  options: FilterPlayersOptions = {}
): Player[] {
  const {
    search = "",
    position,
    league,
    teamId,
    minAge,
    maxAge,
    minRating,
    minMinutes,
    minGoalsPer90,
    minXGPer90,
    maxMarketValue,
    maxCapHit,
    minYardsPerGame,
    minTouchdownsPerGame,
    minSacksPerGame,
    sortBy = "rating",
    sortDir = "desc",
  } = filters;

  const { prismaPrefiltered = false } = options;
  let result = [...all];

  if (!prismaPrefiltered) {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) => p.fullName.toLowerCase().includes(q) || p.knownAs.toLowerCase().includes(q)
      );
    }
    if (position) result = result.filter((p) => p.position === position);
    if (teamId) {
      result = result.filter((p) => p.teamId === teamId);
    } else if (league) {
      const teamIds = teams.filter((t) => t.competitionId === league).map((t) => t.id);
      result = result.filter((p) => teamIds.includes(p.teamId));
    }
    if (typeof minAge === "number") result = result.filter((p) => p.age >= minAge);
    if (typeof maxAge === "number") result = result.filter((p) => p.age <= maxAge);
    if (typeof minRating === "number") {
      result = result.filter((p) => p.currentSeasonStats.rating >= minRating);
    }
    if (typeof minMinutes === "number") {
      result = result.filter((p) => p.currentSeasonStats.minutesPlayed >= minMinutes);
    }
  }
  if (typeof minGoalsPer90 === "number") {
    result = result.filter((p) => p.currentSeasonStats.per90.goals >= minGoalsPer90);
  }
  if (typeof minXGPer90 === "number") {
    result = result.filter(
      (p) =>
        computeXGPer90(p.currentSeasonStats.minutesPlayed, p.currentSeasonStats.xG) >= minXGPer90
    );
  }
  if (typeof maxMarketValue === "number") {
    result = result.filter((p) => p.marketValue <= maxMarketValue);
  }
  if (typeof maxCapHit === "number") {
    result = result.filter(
      (p) => typeof p.capHit === "number" && p.capHit > 0 && p.capHit <= maxCapHit
    );
  }
  if (typeof minYardsPerGame === "number") {
    result = result.filter((p) => yardsPerGameOf(p) >= minYardsPerGame);
  }
  if (typeof minTouchdownsPerGame === "number") {
    result = result.filter((p) => touchdownsPerGameOf(p) >= minTouchdownsPerGame);
  }
  if (typeof minSacksPerGame === "number") {
    result = result.filter((p) => sacksPerGameOf(p) >= minSacksPerGame);
  }

  result.sort((a, b) => {
    const sa = a.currentSeasonStats;
    const sb = b.currentSeasonStats;
    let diff = 0;

    switch (sortBy) {
      case "rating":
        diff = sa.rating - sb.rating;
        break;
      case "goals":
        diff = sa.goals - sb.goals;
        break;
      case "assists":
        diff =
          (sa.assists || sa.perGame?.assists || 0) - (sb.assists || sb.perGame?.assists || 0);
        break;
      case "assistsPer90":
        diff = sa.per90.assists - sb.per90.assists;
        break;
      case "goalsPer90":
        diff = sa.per90.goals - sb.per90.goals;
        break;
      case "xGPer90":
        diff =
          computeXGPer90(sa.minutesPlayed, sa.xG) - computeXGPer90(sb.minutesPlayed, sb.xG);
        break;
      case "defensiveActionsPer90":
        diff =
          sa.per90.tackles +
          sa.per90.interceptions -
          (sb.per90.tackles + sb.per90.interceptions);
        break;
      case "points":
        diff =
          (sa.points ?? sa.perGame?.points ?? 0) - (sb.points ?? sb.perGame?.points ?? 0);
        break;
      case "rebounds":
        diff =
          (sa.rebounds ?? sa.perGame?.rebounds ?? 0) - (sb.rebounds ?? sb.perGame?.rebounds ?? 0);
        break;
      case "steals":
        diff =
          (sa.steals ?? sa.perGame?.steals ?? 0) - (sb.steals ?? sb.perGame?.steals ?? 0);
        break;
      case "blocks":
        diff =
          (sa.blocks ?? sa.perGame?.blocks ?? 0) - (sb.blocks ?? sb.perGame?.blocks ?? 0);
        break;
      case "totalYards":
        diff = totalYardsOf(a) - totalYardsOf(b);
        break;
      case "touchdowns":
        diff = (sa.touchdowns ?? sa.goals ?? 0) - (sb.touchdowns ?? sb.goals ?? 0);
        break;
      case "sacks":
        diff = (sa.sacks ?? 0) - (sb.sacks ?? 0);
        break;
      case "yardsPerGame":
        diff = yardsPerGameOf(a) - yardsPerGameOf(b);
        break;
      case "age":
        diff = a.age - b.age;
        break;
      case "marketValue":
        diff = a.marketValue - b.marketValue;
        break;
      case "valueScore":
        diff = valueScoreOf(a) - valueScoreOf(b);
        break;
      case "name":
        diff = a.fullName.localeCompare(b.fullName);
        break;
      case "position":
        diff = a.position.localeCompare(b.position);
        break;
      case "club":
        diff = (a.teamName ?? a.teamShortName ?? "").localeCompare(
          b.teamName ?? b.teamShortName ?? ""
        );
        break;
    }

    return sortDir === "asc" ? diff : -diff;
  });

  return result;
}

export function paginatePlayers(
  items: Player[],
  page: number,
  pageSize: number
): { items: Player[]; total: number; page: number; pageSize: number; totalPages: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}
