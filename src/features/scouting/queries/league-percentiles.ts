import {
  similarBasketballPositionGroup,
  similarFootballPositionGroup,
  similarPositionGroup,
} from "@/features/scouting/lib/position-scorecard";
import { getPlayerRepository } from "@/features/scouting/repository";
import {
  computeAmericanFootballLeaguePositionPercentiles,
  type AmericanFootballLeaguePositionPercentileTable,
} from "@/lib/intelligence/american-football/league-percentiles";
import {
  computeBasketballLeaguePositionPercentiles,
  type BasketballLeaguePositionPercentileTable,
} from "@/lib/intelligence/basketball/league-percentiles";
import {
  computeLeaguePositionPercentiles,
  type LeaguePositionPercentileTable,
} from "@/lib/intelligence/soccer/league-percentiles";
import {
  AF_RATE_MIN_MINUTES,
  BB_RATE_MIN_MINUTES,
  SOCCER_RATE_MIN_MINUTES,
} from "@/lib/scoring";
import { CURRENT_SEASON } from "@/lib/data/generators";
import type { Player } from "@/types";

const LEAGUE_COHORT_TAKE = 800;

export type AnyLeaguePercentileTable =
  | LeaguePositionPercentileTable
  | BasketballLeaguePositionPercentileTable
  | AmericanFootballLeaguePositionPercentileTable;

export async function loadLeaguePercentileTable(
  league: string,
  position: string,
  season: string = CURRENT_SEASON
): Promise<LeaguePositionPercentileTable | null> {
  const repo = getPlayerRepository();
  const cohort = await repo.findSample("SOCCER", {
    league,
    positions: similarPositionGroup(position),
    minMinutes: SOCCER_RATE_MIN_MINUTES,
    take: LEAGUE_COHORT_TAKE,
  });

  return computeLeaguePositionPercentiles("SOCCER", league, position, {
    season,
    cohort,
  });
}

export async function loadBasketballLeaguePercentileTable(
  league: string,
  position: string,
  season: string = CURRENT_SEASON
): Promise<BasketballLeaguePositionPercentileTable | null> {
  const repo = getPlayerRepository();
  const cohort = await repo.findSample("BASKETBALL", {
    league,
    positions: similarBasketballPositionGroup(position),
    minMinutes: BB_RATE_MIN_MINUTES,
    take: LEAGUE_COHORT_TAKE,
  });

  return computeBasketballLeaguePositionPercentiles("BASKETBALL", league, position, {
    season,
    cohort,
  });
}

export async function loadAmericanFootballLeaguePercentileTable(
  league: string,
  position: string,
  season: string = CURRENT_SEASON
): Promise<AmericanFootballLeaguePositionPercentileTable | null> {
  const repo = getPlayerRepository();
  const cohort = await repo.findSample("AMERICAN_FOOTBALL", {
    league,
    positions: similarFootballPositionGroup(position),
    minMinutes: AF_RATE_MIN_MINUTES,
    take: LEAGUE_COHORT_TAKE,
  });

  return computeAmericanFootballLeaguePositionPercentiles(
    "AMERICAN_FOOTBALL",
    league,
    position,
    {
      season,
      cohort,
    }
  );
}

export async function loadLeaguePercentileContext(
  player: Player
): Promise<AnyLeaguePercentileTable | null> {
  const league = player.league;
  if (!league) return null;

  const season = player.selectedSeason ?? player.currentSeasonStats.season;
  const sport = player.sport ?? "SOCCER";

  if (sport === "BASKETBALL") {
    return loadBasketballLeaguePercentileTable(league, player.position, season);
  }
  if (sport === "AMERICAN_FOOTBALL") {
    return loadAmericanFootballLeaguePercentileTable(league, player.position, season);
  }
  if (sport === "SOCCER") {
    return loadLeaguePercentileTable(league, player.position, season);
  }
  return null;
}
