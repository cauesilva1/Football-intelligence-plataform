import { similarPositionGroup } from "@/features/scouting/lib/position-scorecard";
import { getPlayerRepository } from "@/features/scouting/repository";
import {
  computeLeaguePositionPercentiles,
  type LeaguePositionPercentileTable,
} from "@/lib/intelligence/soccer/league-percentiles";
import { SOCCER_RATE_MIN_MINUTES } from "@/lib/scoring";
import type { Player } from "@/types";

const LEAGUE_COHORT_TAKE = 800;

export async function loadLeaguePercentileContext(
  player: Player
): Promise<LeaguePositionPercentileTable | null> {
  const league = player.league;
  if (!league) return null;

  const repo = getPlayerRepository();
  const season = player.selectedSeason ?? player.currentSeasonStats.season;
  const positions = similarPositionGroup(player.position);
  const cohort = await repo.findSample("SOCCER", {
    league,
    positions,
    minMinutes: SOCCER_RATE_MIN_MINUTES,
    take: LEAGUE_COHORT_TAKE,
  });

  return computeLeaguePositionPercentiles("SOCCER", league, player.position, {
    season,
    cohort,
  });
}
