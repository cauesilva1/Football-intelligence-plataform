import { fetchNhlScheduleWindow, fetchNhlStandings, type NhlScheduleGame, type NhlStandingRow } from "@/lib/api/nhl";
import { attachNhlClubIds } from "@/lib/hockey/standings";
import { getPrisma } from "@/lib/prisma";

export interface NhlHubData {
  games: NhlScheduleGame[];
  standings: NhlStandingRow[];
  error?: string;
}

export async function loadNhlHub(now = new Date()): Promise<NhlHubData> {
  try {
    const [games, standings] = await Promise.all([
      fetchNhlScheduleWindow(now.toISOString().slice(0, 10)),
      fetchNhlStandings(),
    ]);
    let clubs: { id: string; shortName: string | null }[] = [];
    try {
      clubs = await getPrisma().team.findMany({
        where: { competition: { OR: [{ name: "NHL" }, { espnSlug: "nhl" }] } },
        select: { id: true, shortName: true },
      });
    } catch (error) {
      console.warn("[nhl-hub] club links skipped:", error);
    }
    return { games, standings: attachNhlClubIds(standings, clubs) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "NHL feed unavailable";
    return { games: [], standings: [], error: message };
  }
}
