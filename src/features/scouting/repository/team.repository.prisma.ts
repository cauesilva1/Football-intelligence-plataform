import { getPrisma } from "@/lib/prisma";
import {
  BRAZIL_SEASON_LABEL,
  CURRENT_SEASON,
  FIFA_WORLD_CUP_SEASON_LABEL,
  resolvePersistedSeasonLabel,
} from "@/lib/seasons";
import { clubRepository } from "@/features/scouting/repository/club.repository.prisma";
import { isDbSource } from "@/lib/data-source";
import {
  isBasketballTeamCompetition,
  resolveBasketballLeagueFromCompetition,
} from "@/lib/basketball/team-league";
import {
  isAmericanFootballTeamCompetition,
  resolveAmericanFootballLeagueFromCompetition,
} from "@/lib/american-football/team-league";
import { ensureAmericanFootballTeamRoster } from "@/lib/sync/american-football-roster";
import type { TeamRepository } from "./types";
import { playerListInclude, prismaPlayerRepository } from "./player.repository.prisma";

const TEAM_STAT_SEASONS = [CURRENT_SEASON, BRAZIL_SEASON_LABEL, FIFA_WORLD_CUP_SEASON_LABEL] as const;

async function listAllCompetitionIds(): Promise<string[]> {
  const rows = await getPrisma().competition.findMany({ select: { id: true } });
  return rows.map((row) => row.id);
}

function pickTeamStatistic<T extends { season: string }>(
  statistics: T[],
  competitionName?: string | null
): T | undefined {
  if (!statistics.length) return undefined;
  const expected = resolvePersistedSeasonLabel(competitionName);
  return statistics.find((row) => row.season === expected) ?? statistics[0];
}

export const prismaTeamRepository: TeamRepository = {
  async findAll(competitionId?: string) {
    const { items } = await this.findDirectory({
      competitionIds: competitionId ? [competitionId] : await listAllCompetitionIds(),
      includeStats: true,
    });
    return items;
  },

  async findDirectory(options) {
    const competitionIds = [...new Set(options.competitionIds.filter(Boolean))];
    if (competitionIds.length === 0) {
      return { items: [], total: 0 };
    }

    const take = options.take != null ? Math.min(Math.max(options.take, 1), 100) : undefined;
    const skip = options.skip != null ? Math.max(options.skip, 0) : undefined;
    const includeStats = options.includeStats !== false;
    const where = { competitionId: { in: competitionIds } };
    const prisma = getPrisma();

    const [total, teams] = await Promise.all([
      prisma.team.count({ where }),
      prisma.team.findMany({
        where,
        include: {
          competition: true,
          ...(includeStats
            ? { statistics: { where: { season: { in: [...TEAM_STAT_SEASONS] } } } }
            : {}),
          _count: { select: { players: true } },
        },
        orderBy: { name: "asc" },
        ...(take != null ? { take } : {}),
        ...(skip != null ? { skip } : {}),
      }),
    ]);

    const nbaTeamIds: string[] = [];
    const ncaaTeamIds: string[] = [];

    for (const team of teams) {
      const league = resolveBasketballLeagueFromCompetition(team.competition?.name);
      if (league === "NBA") nbaTeamIds.push(team.id);
      else if (league === "NCAA") ncaaTeamIds.push(team.id);
    }

    const [nbaCounts, ncaaCounts] = await Promise.all([
      nbaTeamIds.length
        ? prisma.player.groupBy({
            by: ["teamId"],
            where: { teamId: { in: nbaTeamIds }, sport: "BASKETBALL", league: "NBA" },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      ncaaTeamIds.length
        ? prisma.player.groupBy({
            by: ["teamId"],
            where: { teamId: { in: ncaaTeamIds }, sport: "BASKETBALL", league: "NCAA" },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    const squadSizeByTeamId = new Map<string, number>();
    for (const row of [...nbaCounts, ...ncaaCounts]) {
      if (row.teamId) squadSizeByTeamId.set(row.teamId, row._count._all);
    }

    const items = teams.map((team) => {
      const expectedLeague = resolveBasketballLeagueFromCompetition(team.competition?.name);
      const squadSize =
        expectedLeague != null
          ? (squadSizeByTeamId.get(team.id) ?? 0)
          : team._count.players;
      const statistics =
        "statistics" in team && Array.isArray(team.statistics) ? team.statistics : [];
      const selectedStats = includeStats
        ? pickTeamStatistic(statistics, team.competition?.name)
        : undefined;

      return {
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        country: team.country,
        crestUrl: team.crestUrl ?? undefined,
        apiSportsId: team.apiSportsId ?? undefined,
        foundedYear: team.foundedYear ?? 0,
        stadium: team.stadium ?? "",
        competitionId: team.competitionId ?? "",
        competition: team.competition
          ? {
              id: team.competition.id,
              name: team.competition.name,
              country: team.competition.country,
              tier: team.competition.tier,
              logoUrl: team.competition.logoUrl ?? undefined,
            }
          : undefined,
        stats: selectedStats
          ? {
              id: selectedStats.id,
              teamId: selectedStats.teamId,
              season: selectedStats.season,
              matchesPlayed: selectedStats.matchesPlayed,
              wins: selectedStats.wins,
              draws: selectedStats.draws,
              losses: selectedStats.losses,
              goalsFor: selectedStats.goalsFor,
              goalsAgainst: selectedStats.goalsAgainst,
              xG: selectedStats.xG,
              xGA: selectedStats.xGA,
              possessionPct: selectedStats.possessionPct,
              passAccuracyPct: selectedStats.passAccuracyPct,
              pressuresPer90: selectedStats.pressuresPer90,
              attackRating: selectedStats.attackRating,
              defenseRating: selectedStats.defenseRating,
            }
          : undefined,
        squadSize,
      };
    });

    return { items, total };
  },

  async findById(id) {
    let team = await getPrisma().team.findUnique({
      where: { id },
      include: {
        competition: true,
        statistics: { where: { season: { in: [...TEAM_STAT_SEASONS] } } },
      },
    });
    if (!team) return null;

    const isBasketball = isBasketballTeamCompetition(team.competition?.name);
    const isAmericanFootball = isAmericanFootballTeamCompetition(team.competition?.name);
    const expectedLeague = resolveBasketballLeagueFromCompetition(team.competition?.name);
    const afLeague = resolveAmericanFootballLeagueFromCompetition(team.competition?.name);

    if (isDbSource() && isAmericanFootball) {
      const squadCount = await getPrisma().player.count({
        where: {
          teamId: id,
          sport: "AMERICAN_FOOTBALL",
          ...(afLeague ? { league: afLeague } : {}),
        },
      });
      // Never block team hub TTFB on ESPN roster sync.
      if (squadCount < 20) {
        void ensureAmericanFootballTeamRoster({
          teamId: id,
          competitionName: team.competition?.name,
          espnTeamId: team.apiSportsId,
          minPlayers: 20,
          skipStats: true,
        }).catch((error) => {
          console.warn("[team-repo] AF roster sync skipped:", id, error);
        });
      }
    } else if (isDbSource() && !isBasketball) {
      const squadCount = await getPrisma().player.count({ where: { teamId: id } });
      // Thin squads need sync before render; otherwise refresh in background.
      if (squadCount < 8) {
        try {
          await clubRepository.ensureClubPersisted(team);
          team =
            (await getPrisma().team.findUnique({
              where: { id },
              include: {
                competition: true,
                statistics: { where: { season: { in: [...TEAM_STAT_SEASONS] } } },
              },
            })) ?? team;
        } catch (error) {
          console.warn("[team-repo] Sync skipped — returning cached Supabase row:", id, error);
        }
      } else {
        void clubRepository.ensureClubPersisted(team).catch((error) => {
          console.warn("[team-repo] Background sync failed:", id, error);
        });
      }
    }

    const squadRecords = await getPrisma().player.findMany({
      where: {
        teamId: id,
        ...(isBasketball && expectedLeague
          ? { sport: "BASKETBALL", league: expectedLeague }
          : {}),
        ...(isAmericanFootball && afLeague
          ? { sport: "AMERICAN_FOOTBALL", league: afLeague }
          : {}),
      },
      include: playerListInclude,
      orderBy: [{ knownAs: "asc" }],
    });

    const squad = squadRecords.map((record) => prismaPlayerRepository.mapFromRecord(record));
    const selectedStats = pickTeamStatistic(team.statistics, team.competition?.name);

    return {
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      country: team.country,
      crestUrl: team.crestUrl ?? undefined,
      apiSportsId: team.apiSportsId ?? undefined,
      foundedYear: team.foundedYear ?? 0,
      stadium: team.stadium ?? "",
      competitionId: team.competitionId ?? "",
      competition: team.competition
        ? {
            id: team.competition.id,
            name: team.competition.name,
            country: team.competition.country,
            tier: team.competition.tier,
            logoUrl: team.competition.logoUrl ?? undefined,
          }
        : undefined,
      stats: selectedStats
        ? {
            id: selectedStats.id,
            teamId: selectedStats.teamId,
            season: selectedStats.season,
            matchesPlayed: selectedStats.matchesPlayed,
            wins: selectedStats.wins,
            draws: selectedStats.draws,
            losses: selectedStats.losses,
            goalsFor: selectedStats.goalsFor,
            goalsAgainst: selectedStats.goalsAgainst,
            xG: selectedStats.xG,
            xGA: selectedStats.xGA,
            possessionPct: selectedStats.possessionPct,
            passAccuracyPct: selectedStats.passAccuracyPct,
            pressuresPer90: selectedStats.pressuresPer90,
            attackRating: selectedStats.attackRating,
            defenseRating: selectedStats.defenseRating,
          }
        : undefined,
      squad,
    };
  },

  async getCompetitions() {
    const records = await getPrisma().competition.findMany({ orderBy: { name: "asc" } });
    return records.map((c) => ({
      id: c.id,
      name: c.name,
      country: c.country,
      tier: c.tier,
      logoUrl: c.logoUrl ?? undefined,
    }));
  },
};
