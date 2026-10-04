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
import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";

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

async function resolveEuroLeagueMatchDetail(
  rawId: string
): Promise<BasketballMatchDetail | null> {
  const id = decodeURIComponent(rawId);
  if (!id.startsWith("euroleague:") || !canUseDatabase()) return null;
  const prisma = getPrisma();
  const match = await prisma.match.findUnique({
    where: { externalKey: id },
    select: {
      homeScore: true,
      awayScore: true,
      status: true,
      matchDate: true,
      seasonLabel: true,
      homeTeam: { select: { name: true, crestUrl: true } },
      awayTeam: { select: { name: true, crestUrl: true } },
    },
  });
  if (!match) return null;

  const lines = await prisma.playerMatchStat.findMany({
    where: { externalEventKey: id },
    select: {
      teamName: true,
      minutesPlayed: true,
      points: true,
      rebounds: true,
      assists: true,
      steals: true,
      blocks: true,
      fieldGoalsMade: true,
      fieldGoalsAttempted: true,
      player: { select: { id: true, fullName: true, knownAs: true } },
    },
    orderBy: { points: "desc" },
  });

  const finished = (match.status ?? "").toLowerCase() === "finished";
  return {
    id,
    competition: "euroleague",
    competitionName: "EuroLeague",
    date: match.matchDate.toISOString().slice(0, 10),
    kickOff: match.matchDate.toISOString(),
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    homeScore: finished ? match.homeScore : null,
    awayScore: finished ? match.awayScore : null,
    homeCrestUrl: match.homeTeam.crestUrl ?? undefined,
    awayCrestUrl: match.awayTeam.crestUrl ?? undefined,
    status: finished ? "finished" : "scheduled",
    statusLabel: finished ? "Final" : "Scheduled",
    stadium: "—",
    stageName: match.seasonLabel ? `EuroLeague ${match.seasonLabel}` : "EuroLeague",
    sourceLabel: "EuroLeague",
    players: lines.map((line) => ({
      espnAthleteId: line.player.id,
      fullName: line.player.knownAs || line.player.fullName,
      teamName: line.teamName ?? "—",
      minutesPlayed: line.minutesPlayed,
      points: line.points ?? 0,
      rebounds: line.rebounds ?? 0,
      assists: line.assists,
      steals: line.steals ?? 0,
      blocks: line.blocks ?? 0,
      turnovers: 0,
      fieldGoals:
        line.fieldGoalsMade != null && line.fieldGoalsAttempted != null
          ? `${line.fieldGoalsMade}-${line.fieldGoalsAttempted}`
          : "—",
      threePointers: "—",
      freeThrows: "—",
    })),
  };
}

export async function resolveBasketballMatchDetail(
  rawId: string
): Promise<BasketballMatchDetail | null> {
  if (decodeURIComponent(rawId).startsWith("euroleague:")) {
    return resolveEuroLeagueMatchDetail(rawId);
  }
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
      season: detail.kickOff
        ? resolveBasketballBoxscoreSeason(espnSlug, new Date(detail.kickOff))
        : resolveBasketballBoxscoreSeason(espnSlug),
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
