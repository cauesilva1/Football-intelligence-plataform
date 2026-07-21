import { getPrisma } from "@/lib/prisma";
import { isDbSource } from "@/lib/data-source";

export type PlayerMatchAppearance = {
  id: string;
  externalEventKey: string;
  matchId: string | null;
  matchDate: string | null;
  competitionLabel: string | null;
  teamName: string | null;
  opponentName: string | null;
  isHome: boolean | null;
  minutesPlayed: number;
  goals: number;
  assists: number;
  tackles: number;
  interceptions: number;
  rating: number | null;
};

/** Recent per-match appearances stored for this player (Stage 6). */
export async function getPlayerMatchAppearances(
  playerId: string,
  limit = 12
): Promise<PlayerMatchAppearance[]> {
  if (!playerId || !isDbSource()) return [];

  try {
    const prisma = getPrisma();
    const rows = await prisma.playerMatchStat.findMany({
      where: { playerId },
      orderBy: [{ matchDate: "desc" }, { updatedAt: "desc" }],
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      externalEventKey: row.externalEventKey,
      matchId: row.matchId,
      matchDate: row.matchDate?.toISOString() ?? null,
      competitionLabel: row.competitionLabel,
      teamName: row.teamName,
      opponentName: row.opponentName,
      isHome: row.isHome,
      minutesPlayed: row.minutesPlayed,
      goals: row.goals,
      assists: row.assists,
      tackles: row.tackles,
      interceptions: row.interceptions,
      rating: row.rating,
    }));
  } catch {
    return [];
  }
}
