import { SEASONS } from "@/lib/data/generators";
import { computeXGPer90 } from "@/features/scouting/lib/filter-players";
import type { Competition, DashboardInsight, DashboardOverview, Player, Team } from "@/types";

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];

const U23_MAX_AGE = 23;
const PROSPECT_MIN_RATING = 7;
const OPPORTUNITY_MAX_AGE = 25;
const OPPORTUNITY_MIN_RATING = 7.2;
const OPPORTUNITY_MAX_VALUE = 8_000_000;

function buildInsights(
  players: Player[],
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
      title: `${overview.topProspectsCount} prospects U23 em destaque`,
      description: "Jogadores sub-23 com rating ≥ 7.0 na temporada atual.",
      href: "/scouting?maxAge=23&minRating=7",
    });
  }

  if (overview.marketOpportunitiesCount > 0) {
    insights.push({
      id: "market",
      type: "opportunity",
      title: `${overview.marketOpportunitiesCount} oportunidades de mercado`,
      description: "Alto desempenho com valor de mercado abaixo do patamar de elite.",
      href: "/scouting?maxAge=25&minRating=7.2",
    });
  }

  if (overview.ratingChange !== 0) {
    const direction = overview.ratingChange > 0 ? "subiu" : "caiu";
    insights.push({
      id: "rating-trend",
      type: "trend",
      title: `Rating médio ${direction} ${Math.abs(overview.ratingChange).toFixed(2)} pts`,
      description: "Comparativo entre a temporada atual e a anterior na base monitorada.",
    });
  }

  const eliteCount = players.filter((p) => p.currentSeasonStats.rating >= 8).length;
  if (eliteCount > 0) {
    insights.push({
      id: "elite",
      type: "alert",
      title: `${eliteCount} jogadores com rating ≥ 8.0`,
      description: "Performers de elite identificados para acompanhamento prioritário.",
      href: "/scouting?minRating=8",
    });
  }

  const topScorer = overview.topScorers[0];
  if (topScorer) {
    insights.push({
      id: "top-scorer",
      type: "alert",
      title: `Artilheiro: ${topScorer.knownAs}`,
      description: `${topScorer.currentSeasonStats.per90.goals.toFixed(2)} gols/90 · ${topScorer.teamShortName ?? "—"}`,
      href: `/players/${topScorer.id}`,
    });
  }

  const highXgLowGoals = players.filter((p) => {
    const s = p.currentSeasonStats;
    const xg90 = computeXGPer90(s.minutesPlayed, s.xG);
    return xg90 >= 0.35 && s.per90.goals < xg90 * 0.65 && s.minutesPlayed >= 600;
  });

  if (highXgLowGoals.length > 0) {
    insights.push({
      id: "underperform",
      type: "opportunity",
      title: `${highXgLowGoals.length} finalizadores subperformando xG`,
      description: "Jogadores criando chances acima da média de conversão — potencial de regressão positiva.",
      href: "/scouting?minXGPer90=0.35&minMinutes=600",
    });
  }

  return insights.slice(0, 5);
}

export function buildDashboardOverview(
  players: Player[],
  teams: Team[],
  competitions: Competition[]
): DashboardOverview {
  const totalPlayers = players.length;
  const avgAge = Number((players.reduce((s, p) => s + p.age, 0) / Math.max(totalPlayers, 1)).toFixed(1));
  const totalGoals = players.reduce((s, p) => s + p.currentSeasonStats.goals, 0);
  const totalAssists = players.reduce((s, p) => s + p.currentSeasonStats.assists, 0);
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
    .sort((a, b) => b.currentSeasonStats.per90.goals - a.currentSeasonStats.per90.goals)
    .slice(0, 5);

  const topRated = bestPerformers;

  const goalsByPosition = POSITIONS.map((position) => ({
    position,
    goals: players
      .filter((p) => p.position === position)
      .reduce((s, p) => s + p.currentSeasonStats.goals, 0),
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
    insights: buildInsights(players, base),
  };
}
