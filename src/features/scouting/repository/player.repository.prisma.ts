import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/data/generators";
import { toPlayerStatistic } from "@/lib/metrics/map-statistic";
import {
  mapSeasonStatsRow,
  mergeSeasonHistories,
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

function mapPlayer(record: PrismaPlayerWithStats, options?: { season?: string }): Player {
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
  const history = mergeSeasonHistories(legacyHistory, seasonStatsHistory);
  const { selectedSeason, currentSeasonStats } = resolveSelectedSeasonStats(history, options?.season);
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
    strengths: record.strengths,
    weaknesses: record.weaknesses,
    currentSeasonStats,
    availableSeasons: history.map((row) => row.season),
    selectedSeason,
    history,
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
  mapFromRecord(record: PrismaPlayerWithStats): Player;
} = {
  async findMany(filters) {
    const sport = filters.sport ?? "SOCCER";

    if (sport === "BASKETBALL") {
      const { page = 1, pageSize = 25 } = filters;
      const isRosterBrowse = filters.route === "players";
      const where = buildBasketballPlayerWhere(filters);

      const records = await getPrisma().player.findMany({
        where,
        include: playerInclude,
      });

      let items = records.map((record) => mapPlayer(record));

      if (typeof filters.minRating === "number") {
        items = items.filter((player) => player.currentSeasonStats.rating >= filters.minRating!);
      }
      if (typeof filters.minMinutes === "number") {
        items = items.filter(
          (player) => player.currentSeasonStats.minutesPlayed >= filters.minMinutes!
        );
      }

      const sorted = filterAndSortPlayers(
        items,
        isRosterBrowse ? filters : applyArchetypeFilters(filters),
        { prismaPrefiltered: true, rosterBrowse: isRosterBrowse }
      );
      return paginatePlayers(sorted, page, pageSize);
    }

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

  async findById(id, options) {
    let record = await getPrisma().player.findUnique({ where: { id }, include: playerInclude });
    if (!record) return null;

    if (isDbSource()) {
      try {
        await clubRepository.ensurePlayerPersisted(record);
        record =
          (await getPrisma().player.findUnique({ where: { id }, include: playerInclude })) ?? record;
      } catch (error) {
        console.warn("[player-repo] Sync skipped — returning cached Supabase row:", id, error);
      }
    }

    return mapPlayer(record, options);
  },

  mapFromRecord(record: PrismaPlayerWithStats, options?: { season?: string }): Player {
    return mapPlayer(record, options);
  },

  async findLite(sport: PlayerFilters["sport"] = "SOCCER") {
    const records = await getPrisma().player.findMany({
      where: { sport: sport ?? "SOCCER" },
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

  async getAll(sport: PlayerFilters["sport"] = "SOCCER") {
    const records = await getPrisma().player.findMany({
      where: { sport: sport ?? "SOCCER" },
      include: playerInclude,
    });
    return records.map((record) => mapPlayer(record));
  },
};
