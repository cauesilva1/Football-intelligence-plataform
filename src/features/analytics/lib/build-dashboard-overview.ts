import { SEASONS } from "@/lib/data/generators";
import { computeXGPer90 } from "@/features/scouting/lib/filter-players";
import { pickBasketballDisplayStats, statPoints } from "@/lib/metrics/basketball-display";
import { BASKETBALL_POSITIONS, type Sport } from "@/lib/sport";
import type { Competition, DashboardInsight, DashboardOverview, Player, Team } from "@/types";

const SOCCER_POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];

const U23_MAX_AGE = 23;
const PROSPECT_MIN_RATING = 7;
const OPPORTUNITY_MAX_AGE = 25;
const OPPORTUNITY_MIN_RATING = 7.2;
const OPPORTUNITY_MAX_VALUE = 8_000_000;

function playerScoringRate(player: Player, sport: Sport): number {
  if (sport === "BASKETBALL") {
    return statPoints(pickBasketballDisplayStats(player));
  }
  return player.currentSeasonStats.per90.goals;
}

function buildInsights(
  players: Player[],
  sport: Sport,
  overview: Pick<
    DashboardOverview,
    "topProspectsCount" | "marketOpportunitiesCount" | "avgRating" | "ratingChange" | "topScorers"
  >
): DashboardInsight[] {
  const insights: DashboardInsight[] = [];

  if (overview.topProspectsCount > 0) {
    insights.push({
      id: "prospects",
      type: "opportunity",
      title: `${overview.topProspectsCount} standout U23 prospects`,
      description: "Sub-23 players with rating ≥ 7.0 in the current season.",
      href: "/scouting?maxAge=23&minRating=7",
    });
  }

  if (overview.marketOpportunitiesCount > 0) {
    insights.push({
      id: "market",
      type: "opportunity",
      title: `${overview.marketOpportunitiesCount} market opportunities`,
      description: "Strong performance with market value below elite benchmarks.",
      href: "/scouting?maxAge=25&minRating=7.2",
    });
  }

  if (overview.ratingChange !== 0) {
    const direction = overview.ratingChange > 0 ? "increased" : "decreased";
    insights.push({
      id: "rating-trend",
      type: "trend",
      title: `Average Rating ${direction} ${Math.abs(overview.ratingChange).toFixed(2)} pts`,
      description: "Comparison between the current and previous season in the monitored database.",
    });
  }

  const eliteCount = players.filter((p) => p.currentSeasonStats.rating >= 8).length;
  if (eliteCount > 0) {
    insights.push({
      id: "elite",
      type: "alert",
      title: `${eliteCount} players with rating ≥ 8.0`,
      description: "Elite performers flagged for priority monitoring.",
      href: "/scouting?minRating=8",
    });
  }

  const topScorer = overview.topScorers[0];
  if (topScorer) {
    const scoringLabel =
      sport === "BASKETBALL"
        ? `${playerScoringRate(topScorer, sport).toFixed(1)} pts/jogo`
        : `${topScorer.currentSeasonStats.per90.goals.toFixed(2)} goals/90`;
    insights.push({
      id: "top-scorer",
      type: "alert",
      title: sport === "BASKETBALL" ? `Top Scorer: ${topScorer.knownAs}` : `Top Scorer: ${topScorer.knownAs}`,
      description: `${scoringLabel} · ${topScorer.teamShortName ?? "—"}`,
      href: `/players/${topScorer.id}`,
    });
  }

  if (sport === "SOCCER") {
    const highXgLowGoals = players.filter((p) => {
      const s = p.currentSeasonStats;
      const xg90 = computeXGPer90(s.minutesPlayed, s.xG);
      return xg90 >= 0.35 && s.per90.goals < xg90 * 0.65 && s.minutesPlayed >= 600;
    });

    if (highXgLowGoals.length > 0) {
      insights.push({
        id: "underperform",
        type: "opportunity",
        title: `${highXgLowGoals.length} finishers underperforming xG`,
        description: "Players creating chances above average conversion — positive regression potential.",
        href: "/scouting?minXGPer90=0.35&minMinutes=600",
      });
    }
  }

  return insights.slice(0, 5);
}

export function buildDashboardOverview(
  players: Player[],
  teams: Team[],
  competitions: Competition[],
  sport: Sport = "SOCCER"
): DashboardOverview {
  const totalPlayers = players.length;
  const avgAge = Number((players.reduce((s, p) => s + p.age, 0) / Math.max(totalPlayers, 1)).toFixed(1));
  const totalGoals =
    sport === "BASKETBALL"
      ? players.reduce((sum, player) => sum + statPoints(pickBasketballDisplayStats(player)), 0)
      : players.reduce((sum, player) => sum + player.currentSeasonStats.goals, 0);
  const totalAssists = players.reduce((sum, player) => {
    if (sport === "BASKETBALL") {
      return sum + (player.currentSeasonStats.perGame?.assists ?? player.currentSeasonStats.assists ?? 0);
    }
    return sum + player.currentSeasonStats.assists;
  }, 0);
  const avgRating = Number(
    (players.reduce((s, p) => s + p.currentSeasonStats.rating, 0) / Math.max(totalPlayers, 1)).toFixed(2)
  );

  const topProspects = [...players]
    .filter((p) => p.age <= U23_MAX_AGE && p.currentSeasonStats.rating >= PROSPECT_MIN_RATING)
    .sort((a, b) => b.currentSeasonStats.rating - a.currentSeasonStats.rating)
    .slice(0, 5);

  const topProspectsCount = players.filter(
    (p) => p.age <= U23_MAX_AGE && p.currentSeasonStats.rating >= PROSPECT_MIN_RATING
  ).length;

  const bestPerformers = [...players]
    .sort((a, b) => b.currentSeasonStats.rating - a.currentSeasonStats.rating)
    .slice(0, 5);

  const bestPerformersCount = players.filter((p) => p.currentSeasonStats.rating >= 7.5).length;

  const marketOpportunities = [...players]
    .filter(
      (p) =>
        p.age <= OPPORTUNITY_MAX_AGE &&
        p.currentSeasonStats.rating >= OPPORTUNITY_MIN_RATING &&
        p.marketValue <= OPPORTUNITY_MAX_VALUE
    )
    .sort(
      (a, b) =>
        b.currentSeasonStats.rating / Math.max(b.marketValue, 1) -
        a.currentSeasonStats.rating / Math.max(a.marketValue, 1)
    )
    .slice(0, 5);

  const marketOpportunitiesCount = players.filter(
    (p) =>
      p.age <= OPPORTUNITY_MAX_AGE &&
      p.currentSeasonStats.rating >= OPPORTUNITY_MIN_RATING &&
      p.marketValue <= OPPORTUNITY_MAX_VALUE
  ).length;

  const topScorers = [...players]
    .sort((a, b) => playerScoringRate(b, sport) - playerScoringRate(a, sport))
    .slice(0, 5);

  const topRated = bestPerformers;

  const positions = sport === "BASKETBALL" ? [...BASKETBALL_POSITIONS] : SOCCER_POSITIONS;
  const goalsByPosition = positions.map((position) => ({
    position,
    goals: players
      .filter((player) => player.position === position)
      .reduce((sum, player) => {
        if (sport === "BASKETBALL") {
          return sum + statPoints(pickBasketballDisplayStats(player));
        }
        return sum + player.currentSeasonStats.goals;
      }, 0),
  }));

  const ratingTrend = SEASONS.map((season) => {
    const seasonRatings = players
      .flatMap((p) => p.history.filter((h) => h.season === season))
      .map((h) => h.rating);
    return {
      season,
      avgRating: Number(
        (seasonRatings.reduce((s, r) => s + r, 0) / Math.max(seasonRatings.length, 1)).toFixed(2)
      ),
    };
  });

  const currentSeasonRating = ratingTrend[ratingTrend.length - 1]?.avgRating ?? avgRating;
  const previousSeasonRating = ratingTrend[ratingTrend.length - 2]?.avgRating ?? currentSeasonRating;
  const ratingChange = Number((currentSeasonRating - previousSeasonRating).toFixed(2));

  const base = {
    totalPlayers,
    totalTeams: teams.length,
    totalCompetitions: competitions.length,
    avgAge,
    totalGoals,
    totalAssists,
    avgRating,
    topProspectsCount,
    topProspects,
    bestPerformersCount,
    bestPerformers,
    marketOpportunitiesCount,
    marketOpportunities,
    topScorers,
    topRated,
    goalsByPosition,
    ratingTrend,
    ratingChange,
  };

  return {
    ...base,
    insights: buildInsights(players, sport, base),
  };
}
