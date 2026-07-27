/**
 * Print league+position percentile table as JSON.
 *
 * Usage:
 *   npm run intel:percentiles -- --league=<competitionId> --position=ST
 */
import { similarPositionGroup } from "@/features/scouting/lib/position-scorecard";
import { computeLeaguePositionPercentiles } from "@/lib/intelligence/soccer/league-percentiles";
import { getPlayerRepository } from "@/features/scouting/repository";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import { CURRENT_SEASON } from "@/lib/data/generators";
import { SOCCER_RATE_MIN_MINUTES } from "@/lib/scoring";

function argValue(flag: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (hit) return hit.slice(flag.length + 1);
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--")) {
    return process.argv[idx + 1];
  }
  return undefined;
}

async function main() {
  const league = argValue("--league");
  const position = argValue("--position") ?? "ST";
  const season = argValue("--season") ?? CURRENT_SEASON;

  if (!league) {
    console.error("Usage: npm run intel:percentiles -- --league=<competitionId> [--position=ST]");
    process.exit(1);
  }

  await ensureRuntimeDataSource();
  const repo = getPlayerRepository();
  const cohort = await repo.findSample("SOCCER", {
    league,
    positions: similarPositionGroup(position),
    minMinutes: SOCCER_RATE_MIN_MINUTES,
    take: 800,
  });

  const table = await computeLeaguePositionPercentiles("SOCCER", league, position, {
    season,
    cohort,
  });

  if (!table) {
    console.error(
      JSON.stringify(
        {
          error: "Insufficient cohort",
          league,
          position,
          season,
          eligiblePlayers: cohort.length,
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ...table,
        sampleSizes: {
          production: table.distributions.production.length,
          creation: table.distributions.creation.length,
          defense: table.distributions.defense.length,
          ball_progression: table.distributions.ball_progression.length,
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
