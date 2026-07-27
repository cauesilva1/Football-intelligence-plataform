import { similarPositionGroup } from "@/features/scouting/lib/position-scorecard";
import { getPlayerRepository } from "@/features/scouting/repository";
import {
  computeLeaguePositionPercentiles,
  type LeaguePositionPercentileTable,
} from "@/lib/intelligence/soccer/league-percentiles";
import { SOCCER_RATE_MIN_MINUTES } from "@/lib/scoring";
import { CURRENT_SEASON } from "@/lib/data/generators";
import type { Player } from "@/types";

const LEAGUE_COHORT_TAKE = 800;

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

export async function loadLeaguePercentileContext(
  player: Player
): Promise<LeaguePositionPercentileTable | null> {
  const league = player.league;
  if (!league) return null;

  const season = player.selectedSeason ?? player.currentSeasonStats.season;
  return loadLeaguePercentileTable(league, player.position, season);
}
