import {
  fetchNbaMatchDetail,
  parseBasketballMatchId,
  type BasketballMatchDetail,
} from "@/lib/api/espn-nba-match-detail";

export async function resolveBasketballMatchDetail(
  rawId: string
): Promise<BasketballMatchDetail | null> {
  const parsed = parseBasketballMatchId(rawId);
  if (!parsed) return null;
  return fetchNbaMatchDetail(parsed.competition, parsed.eventId);
}

export async function resolveBasketballMatchTitle(
  rawId: string
): Promise<string | null> {
  const detail = await resolveBasketballMatchDetail(rawId);
  if (!detail) return null;
  return `${detail.awayTeam} @ ${detail.homeTeam}`;
}
