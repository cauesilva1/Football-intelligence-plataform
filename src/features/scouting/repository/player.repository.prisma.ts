import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/data/generators";
import { toPlayerStatistic } from "@/lib/metrics/map-statistic";
import { calcAge } from "@/lib/utils";
import { filterAndSortPlayers } from "@/features/scouting/lib/filter-players";
import { resolvePlayerPhotoUrl } from "@/lib/player-media";
import type { Foot, Player, PlayerFilters, PlayerStatistic } from "@/types";
import type { PlayerRepository } from "./types";

const playerInclude = {
  team: { include: { competition: true } },
  statistics: {
    include: { team: true },
    orderBy: [{ season: "asc" as const }, { createdAt: "asc" as const }],
  },
} satisfies Prisma.PlayerInclude;

type PrismaPlayerWithStats = Prisma.PlayerGetPayload<{ include: typeof playerInclude }>;

function mapStatistic(
  stat: PrismaPlayerWithStats["statistics"][number]
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
    rating: stat.rating,
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
    rating: totals.appearances > 0 ? Number((totals.ratingWeight / totals.appearances).toFixed(2)) : latest.rating,
  });
}

function mapPlayer(record: PrismaPlayerWithStats): Player {
  const history = record.statistics.map(mapStatistic);
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
    photoUrl: resolvePlayerPhotoUrl({
      photoUrl: record.photoUrl,
      apiSportsId: record.apiSportsId,
    }),
    apiSportsId: record.apiSportsId ?? undefined,
    teamId: record.teamId ?? "",
    teamName: record.team?.name,
    teamShortName: record.team?.shortName,
    competitionName: record.team?.competition?.name,
    strengths: record.strengths,
    weaknesses: record.weaknesses,
    currentSeasonStats: aggregateCurrentSeason(record.id, record.teamId ?? undefined, history),
    history,
  };
}

function buildPlayerWhere(filters: PlayerFilters): Prisma.PlayerWhereInput {
  const { search, position, league, teamId, minAge, maxAge } = filters;
  const where: Prisma.PlayerWhereInput = {};

  if (search?.trim()) {
    where.OR = [
      { fullName: { contains: search.trim(), mode: "insensitive" } },
      { knownAs: { contains: search.trim(), mode: "insensitive" } },
    ];
  }
  if (position) where.position = position;
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

function buildStatWhere(filters: PlayerFilters): Prisma.PlayerStatisticWhereInput {
  const { minRating, minMinutes } = filters;
  const where: Prisma.PlayerStatisticWhereInput = {
    season: CURRENT_SEASON,
    player: buildPlayerWhere(filters),
  };

  if (typeof minRating === "number") where.rating = { gte: minRating };
  if (typeof minMinutes === "number") where.minutesPlayed = { gte: minMinutes };

  return where;
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

export const prismaPlayerRepository: PlayerRepository = {
  async findMany(filters) {
    const { page = 1, pageSize = 25 } = filters;
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
          player: { include: playerInclude },
        },
      }),
    ]);

    let items = statistics.map((row) => mapPlayer(row.player));

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

  async findById(id) {
    const record = await getPrisma().player.findUnique({ where: { id }, include: playerInclude });
    return record ? mapPlayer(record) : null;
  },

  async findLite() {
    const records = await getPrisma().player.findMany({
      select: {
        id: true,
        fullName: true,
        knownAs: true,
        position: true,
        teamId: true,
        team: { select: { shortName: true, name: true } },
      },
    });
    return records.map((r) => ({
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
    return [a, b];
  },

  async getAll() {
    const records = await getPrisma().player.findMany({ include: playerInclude });
    return records.map(mapPlayer);
  },
};
