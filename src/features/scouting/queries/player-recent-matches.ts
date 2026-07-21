import { getPrisma } from "@/lib/prisma";
import { isDbSource } from "@/lib/data-source";

export type PlayerRecentMatch = {
  id: string;
  matchDate: string;
  round: string | null;
  status: string | null;
  homeScore: number;
  awayScore: number;
  homeTeamName: string;
  awayTeamName: string;
  competitionName: string | null;
  isHome: boolean;
};

/** Recent fixtures for the player's club — competition context on the profile. */
export async function getRecentMatchesForTeam(
  teamId: string | undefined | null,
  limit = 6
): Promise<PlayerRecentMatch[]> {
  if (!teamId || !isDbSource()) return [];

  try {
    const prisma = getPrisma();
    const rows = await prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      orderBy: { matchDate: "desc" },
      take: limit,
      include: {
        homeTeam: { select: { name: true, shortName: true } },
        awayTeam: { select: { name: true, shortName: true } },
        competition: { select: { name: true } },
      },
    });

    return rows.map((m) => ({
      id: m.id,
      matchDate: m.matchDate.toISOString(),
      round: m.round,
      status: m.status,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      homeTeamName: m.homeTeam.shortName || m.homeTeam.name,
      awayTeamName: m.awayTeam.shortName || m.awayTeam.name,
      competitionName: m.competition?.name ?? null,
      isHome: m.homeTeamId === teamId,
    }));
  } catch {
    return [];
  }
}
