import {
  fetchFootballMatchDetail,
  parseFootballMatchExternalKey,
  type FootballMatchDetail,
} from "@/lib/api/espn-football-match-detail";

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
  return fetchFootballMatchDetail(parsed.competition, parsed.eventId);
}
