import {
  fetchNbaMatchDetail,
  parseBasketballMatchId,
  type BasketballMatchDetail,
  type NbaMatchCompetition,
} from "@/lib/api/espn-nba-match-detail";
import {
  persistBasketballBoxScoresForKnownPlayers,
  resolveBasketballBoxscoreSeason,
  type BasketballLeagueSlug,
  type BasketballPlayerBoxScore,
} from "@/lib/api/espn-basketball-boxscore";
import { isDbSource } from "@/lib/data-source";

function competitionToEspnSlug(competition: NbaMatchCompetition): BasketballLeagueSlug {
  if (competition === "ncaa") return "mens-college-basketball";
  if (competition === "nba-summer") return "nba-summer";
  return "nba";
}

function competitionLabel(competition: NbaMatchCompetition): string {
  if (competition === "ncaa") return "NCAA Men's Basketball";
  if (competition === "nba-summer") return "NBA Summer League";
  return "NBA";
}

function toPersistRows(detail: BasketballMatchDetail): BasketballPlayerBoxScore[] {
  return detail.players.map((p) => {
    const fg = (p.fieldGoals || "0-0").split("-");
    const three = (p.threePointers || "0-0").split("-");
    return {
      espnAthleteId: p.espnAthleteId,
      fullName: p.fullName,
      teamName: p.teamName,
      minutesPlayed: p.minutesPlayed,
      points: p.points,
      rebounds: p.rebounds,
      assists: p.assists,
      steals: p.steals,
      blocks: p.blocks,
      fieldGoalsMade: Number(fg[0]) || 0,
      fieldGoalsAttempted: Number(fg[1]) || 0,
      threePointsMade: Number(three[0]) || 0,
      threePointsAttempted: Number(three[1]) || 0,
    };
  });
}

export async function resolveBasketballMatchDetail(
  rawId: string
): Promise<BasketballMatchDetail | null> {
  const parsed = parseBasketballMatchId(rawId);
  if (!parsed) return null;
  const detail = await fetchNbaMatchDetail(parsed.competition, parsed.eventId);
  if (!detail) return null;

  // Lazy persist finished games for known DB players (soccer Stage 6 parity).
  if (
    isDbSource() &&
    detail.status === "finished" &&
    detail.players.length > 0 &&
    parsed.competition !== "nba-summer"
  ) {
    const espnSlug = competitionToEspnSlug(parsed.competition);
    void persistBasketballBoxScoresForKnownPlayers(toPersistRows(detail), {
      espnSlug,
      eventId: parsed.eventId,
      matchDate: detail.kickOff ? new Date(detail.kickOff) : null,
      competitionLabel: competitionLabel(parsed.competition),
      homeTeamName: detail.homeTeam,
      awayTeamName: detail.awayTeam,
      season: resolveBasketballBoxscoreSeason(espnSlug),
    }).catch((error) => {
      console.warn("[basketball-match] lazy persist failed:", error);
    });
  }

  return detail;
}

export async function resolveBasketballMatchTitle(
  rawId: string
): Promise<string | null> {
  const detail = await resolveBasketballMatchDetail(rawId);
  if (!detail) return null;
  return `${detail.awayTeam} @ ${detail.homeTeam}`;
}
