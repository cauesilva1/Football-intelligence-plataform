import {
  persistFootballBoxScoresForKnownPlayers,
  resolveFootballBoxscoreSeason,
} from "@/lib/api/espn-football-boxscore";
import {
  fetchFootballMatchDetail,
  parseFootballMatchExternalKey,
  type FootballMatchDetail,
} from "@/lib/api/espn-football-match-detail";
import { isDbSource } from "@/lib/data-source";

export async function resolveFootballMatchTitle(id: string): Promise<string | null> {
  const parsed = parseFootballMatchExternalKey(id);
  if (!parsed) return null;
  const detail = await fetchFootballMatchDetail(parsed.competition, parsed.eventId);
  if (!detail) return null;
  return `${detail.awayTeam} @ ${detail.homeTeam}`;
}

export async function resolveFootballMatchDetail(
  id: string
): Promise<FootballMatchDetail | null> {
  const parsed = parseFootballMatchExternalKey(id);
  if (!parsed) return null;
  const detail = await fetchFootballMatchDetail(parsed.competition, parsed.eventId);
  if (!detail) return null;

  if (isDbSource() && detail.status === "finished" && detail.players.length > 0) {
    void persistFootballBoxScoresForKnownPlayers(detail, {
      league: parsed.competition,
      eventId: parsed.eventId,
      season: resolveFootballBoxscoreSeason(parsed.competition),
    }).catch((error) => {
      console.warn("[football-match] lazy persist failed:", error);
    });
  }

  return detail;
}
