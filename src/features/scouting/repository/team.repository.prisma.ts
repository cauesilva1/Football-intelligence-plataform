import { getPrisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/seasons";
import { clubRepository } from "@/features/scouting/repository/club.repository.prisma";
import { isDbSource } from "@/lib/data-source";
import type { TeamRepository } from "./types";
import { playerInclude, prismaPlayerRepository } from "./player.repository.prisma";

export const prismaTeamRepository: TeamRepository = {
  async findAll(competitionId?: string) {
    const teams = await getPrisma().team.findMany({
      where: competitionId ? { competitionId } : undefined,
      include: {
        competition: true,
        statistics: { where: { season: CURRENT_SEASON } },
        _count: { select: { players: true } },
      },
    });

    return teams.map((team) => ({
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
      stats: team.statistics[0]
        ? {
            id: team.statistics[0].id,
            teamId: team.statistics[0].teamId,
            season: team.statistics[0].season,
            matchesPlayed: team.statistics[0].matchesPlayed,
            wins: team.statistics[0].wins,
            draws: team.statistics[0].draws,
            losses: team.statistics[0].losses,
            goalsFor: team.statistics[0].goalsFor,
            goalsAgainst: team.statistics[0].goalsAgainst,
            xG: team.statistics[0].xG,
            xGA: team.statistics[0].xGA,
            possessionPct: team.statistics[0].possessionPct,
            passAccuracyPct: team.statistics[0].passAccuracyPct,
            pressuresPer90: team.statistics[0].pressuresPer90,
            attackRating: team.statistics[0].attackRating,
            defenseRating: team.statistics[0].defenseRating,
          }
        : undefined,
      squadSize: team._count.players,
    }));
  },

  async findById(id) {
    let team = await getPrisma().team.findUnique({
      where: { id },
      include: {
        competition: true,
        statistics: { where: { season: CURRENT_SEASON } },
      },
    });
    if (!team) return null;

    if (isDbSource()) {
      try {
        await clubRepository.ensureClubPersisted(team);
        team =
          (await getPrisma().team.findUnique({
            where: { id },
            include: {
              competition: true,
              statistics: { where: { season: CURRENT_SEASON } },
            },
          })) ?? team;
      } catch (error) {
        console.warn("[team-repo] Sync skipped — returning cached Supabase row:", id, error);
      }
    }

    const squadRecords = await getPrisma().player.findMany({
      where: { teamId: id },
      include: playerInclude,
    });

    const squad = squadRecords.map((record) => prismaPlayerRepository.mapFromRecord(record));

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
      stats: team.statistics[0]
        ? {
            id: team.statistics[0].id,
            teamId: team.statistics[0].teamId,
            season: team.statistics[0].season,
            matchesPlayed: team.statistics[0].matchesPlayed,
            wins: team.statistics[0].wins,
            draws: team.statistics[0].draws,
            losses: team.statistics[0].losses,
            goalsFor: team.statistics[0].goalsFor,
            goalsAgainst: team.statistics[0].goalsAgainst,
            xG: team.statistics[0].xG,
            xGA: team.statistics[0].xGA,
            possessionPct: team.statistics[0].possessionPct,
            passAccuracyPct: team.statistics[0].passAccuracyPct,
            pressuresPer90: team.statistics[0].pressuresPer90,
            attackRating: team.statistics[0].attackRating,
            defenseRating: team.statistics[0].defenseRating,
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
