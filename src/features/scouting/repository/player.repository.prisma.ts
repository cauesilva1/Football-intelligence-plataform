import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/data/generators";
import { toPlayerStatistic } from "@/lib/metrics/map-statistic";
import {
  mapSeasonStatsRow,
  mergeSeasonHistories,
  collapseSoccerCampaignDuplicates,
  resolveSelectedSeasonStats,
} from "@/lib/metrics/map-season-stats";
import { calcAge } from "@/lib/utils";
import { filterAndSortPlayers, paginatePlayers } from "@/features/scouting/lib/filter-players";
import {
  applyArchetypeFilters,
  hasBasketballStatFilters,
} from "@/features/scouting/lib/basketball-filters";
import { BASKETBALL_SCOUTING_SEASONS } from "@/features/scouting/lib/basketball-constants";
import { resolvePlayerPhotoUrl } from "@/lib/player-media";
import { localizeScoutLabels } from "@/lib/scout-labels";
import { reliableSoccerRating } from "@/lib/scoring/soccer-rankings";
import { clubRepository } from "@/features/scouting/repository/club.repository.prisma";
import { isDbSource } from "@/lib/data-source";
import type { Foot, Player, PlayerFilters, PlayerStatistic } from "@/types";
import type { PlayerRepository } from "./types";

export const playerInclude = {
  team: { include: { competition: true } },
  statistics: {
    include: { team: true },
    orderBy: [{ season: "asc" as const }, { createdAt: "asc" as const }],
  },
  stats: {
    orderBy: [{ season: "asc" as const }],
  },
} satisfies Prisma.PlayerInclude;

/** Lista / squad / sample — 1 temporada + team slim (sem hidratar perfil). */
export const playerListInclude = {
  team: {
    select: {
      id: true,
      name: true,
      shortName: true,
      competition: { select: { name: true } },
    },
  },
  statistics: {
    where: { season: CURRENT_SEASON },
    include: { team: { select: { name: true, shortName: true } } },
    orderBy: [{ createdAt: "desc" as const }],
    take: 1,
  },
  stats: {
    orderBy: [{ season: "desc" as const }],
    take: 1,
  },
} satisfies Prisma.PlayerInclude;

/** Roster browse (/players basketball) — identity only, no season stats. */
export const playerRosterInclude = {
  team: {
    select: {
      id: true,
      name: true,
      shortName: true,
      competition: { select: { name: true } },
    },
  },
} satisfies Prisma.PlayerInclude;

type PrismaPlayerWithStats = Prisma.PlayerGetPayload<{ include: typeof playerInclude }>;
type PrismaPlayerListRow = Prisma.PlayerGetPayload<{ include: typeof playerListInclude }>;
type PrismaPlayerRosterRow = Prisma.PlayerGetPayload<{ include: typeof playerRosterInclude }>;
type PrismaPlayerRow = PrismaPlayerWithStats | PrismaPlayerListRow;

/** Cap when mapped filters/sorts force in-memory work (never full table). */
const MAPPED_FILTER_CAP = 1200;

function mapStatistic(
  stat: PrismaPlayerRow["statistics"][number]
): PlayerStatistic {
  return toPlayerStatistic({
    id: stat.id,
    playerId: stat.playerId,
    teamId: stat.teamId,
    teamName: stat.team.name,
    teamShortName: stat.team.shortName,
    season: stat.season,
    appearances: stat.appearances,
    minutesPlayed: stat.minutesPlayed,
    goals: stat.goals,
    assists: stat.assists,
    xG: stat.xG,
    xA: stat.xA,
    shots: stat.shots,
    shotsOnTarget: stat.shotsOnTarget,
    passes: stat.passes,
    passAccuracy: stat.passAccuracy,
    keyPasses: stat.keyPasses,
    dribblesCompleted: stat.dribblesCompleted,
    tacklesWon: stat.tacklesWon,
    interceptions: stat.interceptions,
    duelsWonPct: stat.duelsWonPct,
    yellowCards: stat.yellowCards,
    redCards: stat.redCards,
    rating: reliableSoccerRating(stat),
  });
}

function emptySeasonStats(playerId: string, teamId?: string): PlayerStatistic {
  return toPlayerStatistic({
    id: `empty-${playerId}`,
    playerId,
    teamId: teamId ?? "",
    season: CURRENT_SEASON,
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
  });
}

function aggregateCurrentSeason(
  playerId: string,
  teamId: string | undefined,
  stats: PlayerStatistic[]
): PlayerStatistic {
  const current = stats.filter((s) => s.season === CURRENT_SEASON);
  if (current.length === 0) return stats[stats.length - 1] ?? emptySeasonStats(playerId, teamId);
  if (current.length === 1) return current[0];

  const latest = current[current.length - 1];
  const totals = current.reduce(
    (acc, r) => ({
      appearances: acc.appearances + r.appearances,
      minutesPlayed: acc.minutesPlayed + r.minutesPlayed,
      goals: acc.goals + r.goals,
      assists: acc.assists + r.assists,
      xG: acc.xG + r.xG,
      xA: acc.xA + r.xA,
      shots: acc.shots + r.shots,
      shotsOnTarget: acc.shotsOnTarget + r.shotsOnTarget,
      passes: acc.passes + r.passes,
      keyPasses: acc.keyPasses + r.keyPasses,
      dribblesCompleted: acc.dribblesCompleted + r.dribblesCompleted,
      tacklesWon: acc.tacklesWon + r.tacklesWon,
      interceptions: acc.interceptions + r.interceptions,
      yellowCards: acc.yellowCards + r.yellowCards,
      redCards: acc.redCards + r.redCards,
      ratingWeight: acc.ratingWeight + r.rating * r.appearances,
    }),
    {
      appearances: 0,
      minutesPlayed: 0,
      goals: 0,
      assists: 0,
      xG: 0,
      xA: 0,
      shots: 0,
      shotsOnTarget: 0,
      passes: 0,
      keyPasses: 0,
      dribblesCompleted: 0,
      tacklesWon: 0,
      interceptions: 0,
      yellowCards: 0,
      redCards: 0,
      ratingWeight: 0,
    }
  );

  return toPlayerStatistic({
    id: `agg-${latest.playerId}-${latest.season}`,
    playerId: latest.playerId,
    teamId: latest.teamId,
    teamName: latest.teamName,
    teamShortName: latest.teamShortName,
    season: latest.season,
    appearances: totals.appearances,
    minutesPlayed: totals.minutesPlayed,
    goals: totals.goals,
    assists: totals.assists,
    xG: Number(totals.xG.toFixed(2)),
    xA: Number(totals.xA.toFixed(2)),
    shots: totals.shots,
    shotsOnTarget: totals.shotsOnTarget,
    passes: totals.passes,
    passAccuracy: Number((current.reduce((s, r) => s + r.passAccuracy, 0) / current.length).toFixed(1)),
    keyPasses: totals.keyPasses,
    dribblesCompleted: totals.dribblesCompleted,
    tacklesWon: totals.tacklesWon,
    interceptions: totals.interceptions,
    duelsWonPct: Number((current.reduce((s, r) => s + r.duelsWonPct, 0) / current.length).toFixed(1)),
    yellowCards: totals.yellowCards,
    redCards: totals.redCards,
    rating: reliableSoccerRating({
      minutesPlayed: totals.minutesPlayed,
      goals: totals.goals,
      assists: totals.assists,
      rating:
        totals.appearances > 0
          ? Number((totals.ratingWeight / totals.appearances).toFixed(2))
          : latest.rating,
    }),
  });
}

function mapPlayer(record: PrismaPlayerRow, options?: { season?: string }): Player {
  const legacyHistory = record.statistics.map(mapStatistic);
  const seasonStatsHistory = record.stats.map((stat) =>
    mapSeasonStatsRow(
      stat,
      record.sport,
      record.team
        ? { id: record.team.id, name: record.team.name, shortName: record.team.shortName }
        : undefined
    )
  );
  const historyRaw = mergeSeasonHistories(legacyHistory, seasonStatsHistory);
  const history =
    record.sport === "SOCCER" || !record.sport
      ? collapseSoccerCampaignDuplicates(historyRaw)
      : historyRaw;
  const { selectedSeason, currentSeasonStats } = resolveSelectedSeasonStats(
    history,
    options?.season,
    record.sport
  );
  const dob = record.dateOfBirth.toISOString();

  return {
    id: record.id,
    fullName: record.fullName,
    knownAs: record.knownAs,
    dateOfBirth: dob,
    age: calcAge(dob),
    nationality: record.nationality,
    position: record.position,
    secondaryPosition: record.secondaryPosition ?? undefined,
    height: record.height,
    weight: record.weight,
    preferredFoot: record.preferredFoot as Foot,
    marketValue: record.marketValue,
    capHit: record.capHit > 0 ? record.capHit : undefined,
    summerLeague2026: record.summerLeague2026 || undefined,
    photoUrl: resolvePlayerPhotoUrl({
      photoUrl: record.photoUrl,
      apiSportsId: record.apiSportsId,
    }),
    apiSportsId: record.apiSportsId ?? undefined,
    sport: (record.sport as Player["sport"]) ?? "SOCCER",
    league: record.league,
    teamId: record.teamId ?? "",
    teamName: record.team?.name,
    teamShortName: record.team?.shortName,
    competitionName: record.team?.competition?.name,
    strengths: localizeScoutLabels(record.strengths),
    weaknesses: localizeScoutLabels(record.weaknesses),
    currentSeasonStats,
    availableSeasons: history.map((row) => row.season),
    selectedSeason,
    history,
  };
}

/** List/table rows — drop profile-only fields that inflate RSC payloads. */
function slimListStats(stats: PlayerStatistic, sport: Player["sport"]): PlayerStatistic {
  const base = emptySeasonStats(stats.playerId, stats.teamId);
  const shared = {
    id: stats.id,
    playerId: stats.playerId,
    teamId: stats.teamId,
    teamName: stats.teamName,
    teamShortName: stats.teamShortName,
    season: stats.season,
    sport,
    rating: stats.rating,
    per90: base.per90,
  };

  if (sport === "BASKETBALL") {
    return {
      ...base,
      ...shared,
      points: stats.points,
      rebounds: stats.rebounds,
      assists: stats.assists,
      perGame: {
        points: stats.perGame?.points ?? stats.points ?? 0,
        rebounds: stats.perGame?.rebounds ?? stats.rebounds ?? 0,
        assists: stats.perGame?.assists ?? stats.assists ?? 0,
        steals: 0,
        blocks: 0,
      },
    };
  }

  if (sport === "AMERICAN_FOOTBALL") {
    return {
      ...base,
      ...shared,
      passingYards: stats.passingYards,
      rushingYards: stats.rushingYards,
      receivingYards: stats.receivingYards,
      touchdowns: stats.touchdowns,
      tacklesWon: stats.tacklesWon,
      totalYards: stats.totalYards,
    };
  }

  return {
    ...base,
    ...shared,
    appearances: stats.appearances,
    minutesPlayed: stats.minutesPlayed,
    goals: stats.goals,
    xG: stats.xG,
    per90: {
      ...base.per90,
      goals: stats.per90?.goals ?? 0,
    },
  };
}

/** Lightweight row for in-memory filter/sort (still has real metrics). */
function mapPlayerListForSort(record: PrismaPlayerListRow): Player {
  const player = mapPlayer(record);
  return {
    ...player,
    strengths: [],
    weaknesses: [],
    history: [player.currentSeasonStats],
    availableSeasons: [player.selectedSeason],
  };
}

/** Final RSC payload for table rows — keep only columns the UI reads. */
function finalizeListPlayer(player: Player): Player {
  const currentSeasonStats = slimListStats(player.currentSeasonStats, player.sport);
  return {
    ...player,
    strengths: [],
    weaknesses: [],
    secondaryPosition: undefined,
    height: 0,
    weight: 0,
    preferredFoot: "RIGHT",
    // Keep marketValue — Hidden Gems / valueScore rankings need it in the table.
    capHit: player.capHit,
    summerLeague2026: undefined,
    currentSeasonStats,
    history: [currentSeasonStats],
    availableSeasons: [player.selectedSeason],
  };
}

function mapPlayerList(record: PrismaPlayerListRow): Player {
  return finalizeListPlayer(mapPlayerListForSort(record));
}

function mapPlayerRoster(record: PrismaPlayerRosterRow): Player {
  const dob = record.dateOfBirth.toISOString();
  const currentSeasonStats = emptySeasonStats(record.id, record.teamId ?? undefined);
  return {
    id: record.id,
    fullName: record.fullName,
    knownAs: record.knownAs,
    dateOfBirth: dob,
    age: calcAge(dob),
    nationality: record.nationality,
    position: record.position,
    height: 0,
    weight: 0,
    preferredFoot: "RIGHT",
    marketValue: 0,
    photoUrl: resolvePlayerPhotoUrl({
      photoUrl: record.photoUrl,
      apiSportsId: record.apiSportsId,
    }),
    apiSportsId: record.apiSportsId ?? undefined,
    sport: (record.sport as Player["sport"]) ?? "SOCCER",
    league: record.league,
    teamId: record.teamId ?? "",
    teamName: record.team?.name,
    teamShortName: record.team?.shortName,
    competitionName: record.team?.competition?.name,
    strengths: [],
    weaknesses: [],
    currentSeasonStats,
    availableSeasons: [currentSeasonStats.season],
    selectedSeason: currentSeasonStats.season,
    history: [currentSeasonStats],
  };
}

function buildPlayerWhere(filters: PlayerFilters): Prisma.PlayerWhereInput {
  const { search, position, league, teamId, minAge, maxAge, sport } = filters;
  const where: Prisma.PlayerWhereInput = {
    sport: sport ?? "SOCCER",
  };

  if (search?.trim()) {
    where.OR = [
      { fullName: { contains: search.trim(), mode: "insensitive" } },
      { knownAs: { contains: search.trim(), mode: "insensitive" } },
    ];
  }
  if (position) {
    const parts = position
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    where.position = parts.length > 1 ? { in: parts } : parts[0];
  }
  if (teamId) {
    where.teamId = teamId;
  } else if (league) {
    where.team = { competitionId: league };
  }
  if (typeof minAge === "number" || typeof maxAge === "number") {
    const now = new Date();
    where.dateOfBirth = {};
    if (typeof maxAge === "number") {
      const minDob = new Date(now);
      minDob.setFullYear(now.getFullYear() - maxAge - 1);
      where.dateOfBirth.gte = minDob;
    }
    if (typeof minAge === "number") {
      const maxDob = new Date(now);
      maxDob.setFullYear(now.getFullYear() - minAge);
      where.dateOfBirth.lte = maxDob;
    }
  }
  if (typeof filters.maxMarketValue === "number") {
    where.marketValue = { lte: filters.maxMarketValue, gt: 0 };
  }

  return where;
}

function buildWhere(filters: PlayerFilters): Prisma.PlayerWhereInput {
  const { minRating, minMinutes } = filters;
  const where = buildPlayerWhere(filters);

  if (typeof minRating === "number" || typeof minMinutes === "number") {
    where.statistics = {
      some: {
        season: CURRENT_SEASON,
        ...(typeof minRating === "number" ? { rating: { gte: minRating } } : {}),
        ...(typeof minMinutes === "number" ? { minutesPlayed: { gte: minMinutes } } : {}),
      },
    };
  }

  return where;
}

function buildStatWhere(
  filters: PlayerFilters,
  options?: { skipRatingFilter?: boolean }
): Prisma.PlayerStatisticWhereInput {
  const { minRating, minMinutes } = filters;
  const where: Prisma.PlayerStatisticWhereInput = {
    season: CURRENT_SEASON,
    player: buildPlayerWhere(filters),
  };

  if (!options?.skipRatingFilter && typeof minRating === "number") {
    where.rating = { gte: minRating };
  }
  if (typeof minMinutes === "number") where.minutesPlayed = { gte: minMinutes };

  return where;
}

function buildBasketballSeasonStatsWhere(filters: PlayerFilters): Prisma.PlayerSeasonStatsWhereInput {
  const effective = applyArchetypeFilters(filters);
  const where: Prisma.PlayerSeasonStatsWhereInput = {
    season: { in: [...BASKETBALL_SCOUTING_SEASONS] },
  };

  if (typeof effective.minPoints === "number") where.points = { gte: effective.minPoints };
  if (typeof effective.minRebounds === "number") where.rebounds = { gte: effective.minRebounds };
  if (typeof effective.minAssists === "number") where.assists = { gte: effective.minAssists };
  if (typeof effective.minThreePointsPercent === "number") {
    where.threePointsPercent = { gte: effective.minThreePointsPercent };
  }
  if (typeof effective.minSteals === "number") where.steals = { gte: effective.minSteals };
  if (typeof effective.minBlocks === "number") where.blocks = { gte: effective.minBlocks };

  return where;
}

function buildBasketballPlayerWhere(filters: PlayerFilters): Prisma.PlayerWhereInput {
  const isRosterBrowse = filters.route === "players";
  const effective = isRosterBrowse ? filters : applyArchetypeFilters(filters);
  const where = buildPlayerWhere({ ...effective, sport: "BASKETBALL" });

  if (!isRosterBrowse && effective.archetype === "rim-protector") {
    where.position = { in: ["PF", "C", "Ala-Pivô", "Pivô"] };
  }

  if (!isRosterBrowse && hasBasketballStatFilters(effective)) {
    where.stats = { some: buildBasketballSeasonStatsWhere(effective) };
  }

  return where;
}

function buildPlayerOrderBy(
  filters: PlayerFilters
): Prisma.PlayerOrderByWithRelationInput[] {
  const dir = filters.sortDir ?? "desc";

  switch (filters.sortBy) {
    case "name":
      return [{ fullName: dir }];
    case "age":
      return [{ dateOfBirth: dir === "asc" ? "desc" : "asc" }];
    case "marketValue":
      return [{ marketValue: dir }];
    case "position":
      return [{ position: dir }, { fullName: "asc" }];
    case "club":
      return [{ team: { name: dir } }, { fullName: "asc" }];
    case "rating":
    case "points":
    case "rebounds":
    case "goals":
    case "assists":
    default:
      return [{ marketValue: dir }, { fullName: "asc" }];
  }
}

function needsMappedPlayerSort(filters: PlayerFilters): boolean {
  const sortBy = filters.sortBy ?? "rating";
  return (
    sortBy === "rating" ||
    sortBy === "valueScore" ||
    sortBy === "points" ||
    sortBy === "rebounds" ||
    sortBy === "goals" ||
    sortBy === "assists" ||
    sortBy === "goalsPer90" ||
    sortBy === "assistsPer90" ||
    sortBy === "xGPer90"
  );
}

function needsMappedPlayerFilter(filters: PlayerFilters): boolean {
  return (
    typeof filters.minRating === "number" ||
    typeof filters.minMinutes === "number" ||
    typeof filters.maxMarketValue === "number"
  );
}

function needsSoccerMappedPipeline(filters: PlayerFilters): boolean {
  if (filters.route !== "scouting") return false;
  if (typeof filters.maxMarketValue === "number") return true;
  if (typeof filters.minGoalsPer90 === "number" || typeof filters.minXGPer90 === "number") {
    return true;
  }
  return needsMappedPlayerSort(filters);
}

async function findManySoccerStatsCappedThenPage(
  filters: PlayerFilters
): Promise<{
  items: Player[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 25));
  const where = buildStatWhere(filters, { skipRatingFilter: true });

  const statistics = await getPrisma().playerStatistic.findMany({
    where,
    include: {
      player: { include: playerListInclude },
    },
    orderBy: [{ minutesPlayed: "desc" }, { rating: "desc" }],
    take: MAPPED_FILTER_CAP,
  });

  let items = statistics.map((row) => mapPlayerListForSort(row.player));

  if (typeof filters.minRating === "number") {
    items = items.filter((player) => player.currentSeasonStats.rating >= filters.minRating!);
  }
  if (typeof filters.minMinutes === "number") {
    items = items.filter(
      (player) => player.currentSeasonStats.minutesPlayed >= filters.minMinutes!
    );
  }
  if (typeof filters.maxMarketValue === "number") {
    items = items.filter(
      (player) =>
        player.marketValue > 0 && player.marketValue <= filters.maxMarketValue!
    );
  }

  const sorted = filterAndSortPlayers(items, filters, { prismaPrefiltered: true });
  const pageResult = paginatePlayers(sorted, page, pageSize);
  return {
    ...pageResult,
    items: pageResult.items.map(finalizeListPlayer),
  };
}

async function findManyPaginatedOnPlayer(
  where: Prisma.PlayerWhereInput,
  filters: PlayerFilters,
  options?: { rosterOnly?: boolean }
): Promise<{
  items: Player[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 25));
  const skip = (page - 1) * pageSize;
  const orderBy = buildPlayerOrderBy(filters);
  const rosterOnly = options?.rosterOnly === true;

  const [total, records] = await Promise.all([
    getPrisma().player.count({ where }),
    getPrisma().player.findMany({
      where,
      include: rosterOnly ? playerRosterInclude : playerListInclude,
      orderBy,
      skip,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  return {
    items: rosterOnly
      ? (records as PrismaPlayerRosterRow[]).map(mapPlayerRoster)
      : (records as PrismaPlayerListRow[]).map(mapPlayerList),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

async function findManyCappedThenPage(
  where: Prisma.PlayerWhereInput,
  filters: PlayerFilters,
  sortOptions: Parameters<typeof filterAndSortPlayers>[2]
): Promise<{
  items: Player[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 25));
  const records = await getPrisma().player.findMany({
    where,
    include: playerListInclude,
    orderBy: [{ marketValue: "desc" }, { fullName: "asc" }],
    take: MAPPED_FILTER_CAP,
  });
  let items = records.map(mapPlayerListForSort);

  if (typeof filters.minRating === "number") {
    items = items.filter((player) => player.currentSeasonStats.rating >= filters.minRating!);
  }
  if (typeof filters.minMinutes === "number") {
    items = items.filter(
      (player) => player.currentSeasonStats.minutesPlayed >= filters.minMinutes!
    );
  }

  const sorted = filterAndSortPlayers(items, filters, sortOptions);
  const pageResult = paginatePlayers(sorted, page, pageSize);
  return {
    ...pageResult,
    items: pageResult.items.map(finalizeListPlayer),
  };
}

function buildStatOrderBy(filters: PlayerFilters): Prisma.PlayerStatisticOrderByWithRelationInput {
  const dir = filters.sortDir ?? "desc";

  switch (filters.sortBy) {
    case "goals":
    case "goalsPer90":
      return { goals: dir };
    case "assists":
    case "assistsPer90":
      return { assists: dir };
    case "xGPer90":
      return { xG: dir };
    case "points":
    case "rebounds":
      return { rating: dir };
    case "name":
      return { player: { fullName: dir } };
    case "age":
      return { player: { dateOfBirth: dir === "asc" ? "desc" : "asc" } };
    case "marketValue":
      return { player: { marketValue: dir } };
    case "position":
      return { player: { position: dir } };
    case "club":
      return { player: { team: { name: dir } } };
    case "rating":
    default:
      return { rating: dir };
  }
}

export const prismaPlayerRepository: PlayerRepository & {
  mapFromRecord(record: PrismaPlayerRow, options?: { season?: string }): Player;
} = {
  async findMany(filters) {
    const sport = filters.sport ?? "SOCCER";

    if (sport === "BASKETBALL") {
      const isRosterBrowse = filters.route === "players";
      const where = buildBasketballPlayerWhere(filters);
      const effective = isRosterBrowse ? filters : applyArchetypeFilters(filters);
      const useDbPage =
        isRosterBrowse &&
        !needsMappedPlayerFilter(filters) &&
        !needsMappedPlayerSort(filters);

      if (useDbPage) {
        return findManyPaginatedOnPlayer(where, filters, { rosterOnly: isRosterBrowse });
      }

      return findManyCappedThenPage(where, effective, {
        prismaPrefiltered: true,
        rosterBrowse: isRosterBrowse,
      });
    }

    if (sport === "AMERICAN_FOOTBALL") {
      const where = buildPlayerWhere({ ...filters, sport: "AMERICAN_FOOTBALL" });
      const useDbPage =
        !needsMappedPlayerFilter(filters) && !needsMappedPlayerSort(filters);

      if (useDbPage) {
        return findManyPaginatedOnPlayer(where, filters, {
          rosterOnly: filters.route === "players",
        });
      }

      return findManyCappedThenPage(where, filters, {
        prismaPrefiltered: true,
        rosterBrowse: true,
      });
    }

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 25));

    if (needsSoccerMappedPipeline(filters)) {
      return findManySoccerStatsCappedThenPage(filters);
    }

    const where = buildStatWhere(filters);
    const orderBy = buildStatOrderBy(filters);
    const skip = (page - 1) * pageSize;

    const [total, statistics] = await Promise.all([
      getPrisma().playerStatistic.count({ where }),
      getPrisma().playerStatistic.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          player: { include: playerListInclude },
        },
      }),
    ]);

    let items = statistics.map((row) => mapPlayerList(row.player));

    if (typeof filters.minGoalsPer90 === "number" || typeof filters.minXGPer90 === "number") {
      items = filterAndSortPlayers(items, filters, { prismaPrefiltered: true });
    }

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);

    return {
      items,
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  },

  async findById(id, options) {
    let record = await getPrisma().player.findUnique({ where: { id }, include: playerInclude });
    if (!record) return null;

    if (isDbSource()) {
      // Never block the profile on Transfermarkt/FBref — refresh in background.
      void clubRepository.ensurePlayerPersisted(record).catch((error) => {
        console.warn("[player-repo] Background sync failed:", id, error);
      });

      // AF ESPN enrich is client-triggered (sessionStorage) via AfProfileSeasonEnricher.
    }

    return mapPlayer(record, options);
  },

  mapFromRecord(record: PrismaPlayerRow, options?: { season?: string }): Player {
    return mapPlayer(record, options);
  },

  async findLite(
    sport: PlayerFilters["sport"] = "SOCCER",
    options?: { take?: number; ensureIds?: string[]; search?: string }
  ) {
    const take = Math.min(Math.max(options?.take ?? 30, 1), 100);
    const ensureIds = [...new Set((options?.ensureIds ?? []).filter(Boolean))];
    const search = options?.search?.trim() ?? "";
    const liteSelect = {
      id: true,
      fullName: true,
      knownAs: true,
      position: true,
      teamId: true,
      team: { select: { shortName: true, name: true } },
    } as const;

    const where = {
      sport: sport ?? "SOCCER",
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" as const } },
              { knownAs: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [records, ensured] = await Promise.all([
      getPrisma().player.findMany({
        where,
        select: liteSelect,
        orderBy: { fullName: "asc" },
        take,
      }),
      ensureIds.length
        ? getPrisma().player.findMany({
            where: { id: { in: ensureIds }, sport: sport ?? "SOCCER" },
            select: liteSelect,
          })
        : Promise.resolve([]),
    ]);

    const byId = new Map<string, (typeof records)[number]>();
    for (const row of [...records, ...ensured]) byId.set(row.id, row);

    return [...byId.values()]
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((r) => ({
        id: r.id,
        fullName: r.fullName,
        knownAs: r.knownAs,
        position: r.position,
        teamId: r.teamId ?? "",
        teamShortName: r.team?.shortName,
        teamName: r.team?.name,
      }));
  },

  async findForComparison(idA, idB) {
    const [a, b] = await Promise.all([this.findById(idA), this.findById(idB)]);
    if (!a || !b) return null;
    const sportA = a.sport ?? a.currentSeasonStats.sport ?? "SOCCER";
    const sportB = b.sport ?? b.currentSeasonStats.sport ?? "SOCCER";
    if (sportA !== sportB) return null;
    return [a, b];
  },

  async findSample(sport: PlayerFilters["sport"] = "SOCCER", options) {
    const take = Math.min(Math.max(options?.take ?? 350, 1), 800);
    const records = await getPrisma().player.findMany({
      where: {
        sport: sport ?? "SOCCER",
        ...(options?.position ? { position: options.position } : {}),
      },
      include: playerListInclude,
      take,
      orderBy: { updatedAt: "desc" },
    });
    return records.map((record) => mapPlayer(record));
  },

  async getAll(sport: PlayerFilters["sport"] = "SOCCER") {
    // Prefer findSample for hot paths — kept for rare full exports / mocks.
    return this.findSample(sport, { take: 800 });
  },
};
