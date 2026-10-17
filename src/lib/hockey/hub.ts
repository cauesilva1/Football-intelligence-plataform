import { fetchNhlScheduleWindow, fetchNhlStandings, type NhlScheduleGame, type NhlStandingRow } from "@/lib/api/nhl";

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
    return { games, standings };
  } catch (error) {
    const message = error instanceof Error ? error.message : "NHL feed unavailable";
    return { games: [], standings: [], error: message };
  }
}
