import { SEASONS } from "@/lib/data/generators";
import { computeXGPer90 } from "@/features/scouting/lib/filter-players";
import { hasReliableSoccerSample, per90 } from "@/lib/metrics/per90";
import { pickBasketballDisplayStats, statPoints } from "@/lib/metrics/basketball-display";
import {
  OPPORTUNITY_MAX_AGE,
  OPPORTUNITY_MAX_CAP_HIT,
  OPPORTUNITY_MAX_VALUE,
  OPPORTUNITY_MIN_RATING,
  PROSPECT_MIN_RATING,
  SOCCER_RATE_SOFT_CAP,
  U23_MAX_AGE,
} from "@/lib/scoring";
import { BASKETBALL_POSITIONS, type Sport } from "@/lib/sport";
import { AMERICAN_FOOTBALL_POSITIONS } from "@/lib/positions";
import type { Competition, DashboardInsight, DashboardOverview, Player, Team } from "@/types";

const SOCCER_POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];

function playerScoringRate(player: Player, sport: Sport): number {
  if (sport === "BASKETBALL") {
    return statPoints(pickBasketballDisplayStats(player));
  }
  if (sport === "AMERICAN_FOOTBALL") {
    return player.currentSeasonStats.rating;
  }
  const s = player.currentSeasonStats;
  return per90(s.goals, s.minutesPlayed, { softCap: SOCCER_RATE_SOFT_CAP });
}

function playerEffectiveRating(player: Player, sport: Sport): number {
  if (sport === "BASKETBALL") {
    return pickBasketballDisplayStats(player).rating;
  }
  return player.currentSeasonStats.rating;
}

function isMarketOpportunity(player: Player, sport: Sport): boolean {
  if (player.age > OPPORTUNITY_MAX_AGE) return false;
  if (playerEffectiveRating(player, sport) < OPPORTUNITY_MIN_RATING) return false;
  if (sport === "SOCCER" && !hasReliableSoccerSample(player.currentSeasonStats.minutesPlayed)) {
    return false;
  }
  if (sport === "AMERICAN_FOOTBALL") {
    const cap = player.capHit ?? 0;
    return cap > 0 && cap <= OPPORTUNITY_MAX_CAP_HIT;
  }
  return player.marketValue <= OPPORTUNITY_MAX_VALUE;
}

function isTopProspect(player: Player, sport: Sport): boolean {
  if (player.age > U23_MAX_AGE) return false;
  if (playerEffectiveRating(player, sport) < PROSPECT_MIN_RATING) return false;
  if (sport === "SOCCER" && !hasReliableSoccerSample(player.currentSeasonStats.minutesPlayed)) {
    return false;
  }
  return true;
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
      description: "Sub-23 players with rating ≥ 7.0 and a reliable minutes sample (≥ 450').",
      href: "/scouting?maxAge=23&minRating=7&minMinutes=450",
    });
  }

  if (overview.marketOpportunitiesCount > 0) {
    insights.push({
      id: "market",
      type: "opportunity",
      title: `${overview.marketOpportunitiesCount} market opportunities`,
      description:
        sport === "AMERICAN_FOOTBALL"
          ? "Strong rating with accessible Cap Hit (≤ $5M)."
          : "Rating ≥ 7.2, age ≤ 25, value ≤ €8M, and ≥ 450' played.",
      href: "/scouting?maxAge=25&minRating=7.2&minMinutes=450",
    });
  }

  insights.push({
    id: "rating-trend",
    type: "trend",
    title: `Average Rating: ${overview.avgRating.toFixed(2)}`,
    description:
      Math.abs(overview.ratingChange) > 0 && Math.abs(overview.ratingChange) <= 1.5
        ? `Season trend: ${overview.ratingChange > 0 ? "+" : ""}${overview.ratingChange.toFixed(2)} vs previous season.`
        : "Mean rating across players in the monitored database.",
  });

  const eliteCount = players.filter((p) => playerEffectiveRating(p, sport) >= 8).length;
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
        ? `${playerScoringRate(topScorer, sport).toFixed(1)} pts/game`
        : sport === "AMERICAN_FOOTBALL"
          ? `rating ${playerScoringRate(topScorer, sport).toFixed(1)}`
          : `${per90(topScorer.currentSeasonStats.goals, topScorer.currentSeasonStats.minutesPlayed, { softCap: SOCCER_RATE_SOFT_CAP }).toFixed(2)} goals/90`;
    insights.push({
      id: "top-scorer",
      type: "alert",
      title: `Standout: ${topScorer.knownAs}`,
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
      : sport === "AMERICAN_FOOTBALL"
        ? players.length
        : players.reduce((sum, player) => sum + player.currentSeasonStats.goals, 0);
  const totalAssists = players.reduce((sum, player) => {
    if (sport === "BASKETBALL") {
      return sum + (player.currentSeasonStats.perGame?.assists ?? player.currentSeasonStats.assists ?? 0);
    }
    return sum + player.currentSeasonStats.assists;
  }, 0);
  const avgRating = Number(
    (
      players.reduce((s, p) => s + playerEffectiveRating(p, sport), 0) /
      Math.max(totalPlayers, 1)
    ).toFixed(2)
  );

  const topProspects = [...players]
    .filter((p) => isTopProspect(p, sport))
    .sort((a, b) => playerEffectiveRating(b, sport) - playerEffectiveRating(a, sport))
    .slice(0, 5);

  const topProspectsCount = players.filter((p) => isTopProspect(p, sport)).length;

  const bestPerformers = [...players]
    .filter((p) => {
      if (playerEffectiveRating(p, sport) < 7.5) return false;
      if (sport === "SOCCER" && !hasReliableSoccerSample(p.currentSeasonStats.minutesPlayed)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => playerEffectiveRating(b, sport) - playerEffectiveRating(a, sport))
    .slice(0, 5);

  const bestPerformersCount = players.filter((p) => {
    if (playerEffectiveRating(p, sport) < 7.5) return false;
    if (sport === "SOCCER" && !hasReliableSoccerSample(p.currentSeasonStats.minutesPlayed)) {
      return false;
    }
    return true;
  }).length;

  const marketOpportunities = [...players]
    .filter((p) => isMarketOpportunity(p, sport))
    .sort((a, b) => {
      if (sport === "AMERICAN_FOOTBALL") {
        return (
          playerEffectiveRating(b, sport) / Math.max(b.capHit ?? 1, 1) -
          playerEffectiveRating(a, sport) / Math.max(a.capHit ?? 1, 1)
        );
      }
      return (
        playerEffectiveRating(b, sport) / Math.max(b.marketValue, 1) -
        playerEffectiveRating(a, sport) / Math.max(a.marketValue, 1)
      );
    })
    .slice(0, 5);

  const marketOpportunitiesCount = players.filter((p) => isMarketOpportunity(p, sport)).length;

  const topScorers = [...players]
    .filter((p) => {
      if (sport !== "SOCCER") return true;
      return hasReliableSoccerSample(p.currentSeasonStats.minutesPlayed);
    })
    .sort((a, b) => playerScoringRate(b, sport) - playerScoringRate(a, sport))
    .slice(0, 5);

  const topRated = bestPerformers;

  const positions =
    sport === "BASKETBALL"
      ? [...BASKETBALL_POSITIONS]
      : sport === "AMERICAN_FOOTBALL"
        ? [...AMERICAN_FOOTBALL_POSITIONS]
        : SOCCER_POSITIONS;
  const goalsByPosition = positions.map((position) => ({
    position,
    goals: players
      .filter((player) => {
        const pos = player.position?.toUpperCase() ?? "";
        if (sport === "AMERICAN_FOOTBALL") {
          if (position === "OL") return /^(OL|OT|OG|C|G|T)$/.test(pos);
          if (position === "DL") return /^(DL|DE|DT|NT)$/.test(pos);
          if (position === "LB") return /^(LB|ILB|OLB|MLB)$/.test(pos);
          if (position === "S") return /^(S|SS|FS|SAF)$/.test(pos);
          return pos === position || pos.startsWith(position);
        }
        return player.position === position;
      })
      .reduce((sum, player) => {
        if (sport === "BASKETBALL") {
          return sum + statPoints(pickBasketballDisplayStats(player));
        }
        if (sport === "AMERICAN_FOOTBALL") {
          return sum + 1;
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
