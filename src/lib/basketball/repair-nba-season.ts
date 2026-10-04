import type { PrismaClient } from "@prisma/client";

/**
 * Move NBA appearances onto the campaign of their tip-off, then clear 2026/27
 * totals that were built from games played before that regular season.
 * Historical season lines that came from the season feed are left alone.
 * EuroLeague rows are not espn:nba and are not touched.
 */
export async function repairMisfiledNbaSeasonTotals(prisma: PrismaClient): Promise<{
  relabeled: number;
  playersRebuilt: number;
}> {
  const relabeled = await prisma.$executeRaw`
    WITH next AS (
      SELECT
        id,
        (
          (
            CASE
              WHEN EXTRACT(MONTH FROM ("matchDate" AT TIME ZONE 'UTC')) >= 7
                THEN EXTRACT(YEAR FROM ("matchDate" AT TIME ZONE 'UTC'))::int
              ELSE EXTRACT(YEAR FROM ("matchDate" AT TIME ZONE 'UTC'))::int - 1
            END
          ) * 100
          + (
            (
              CASE
                WHEN EXTRACT(MONTH FROM ("matchDate" AT TIME ZONE 'UTC')) >= 7
                  THEN EXTRACT(YEAR FROM ("matchDate" AT TIME ZONE 'UTC'))::int
                ELSE EXTRACT(YEAR FROM ("matchDate" AT TIME ZONE 'UTC'))::int - 1
              END + 1
            ) % 100
          )
        )::int AS campaign
      FROM player_match_stats
      WHERE "externalEventKey" LIKE 'espn:nba:%'
        AND "matchDate" IS NOT NULL
    )
    UPDATE player_match_stats AS stats
    SET season = next.campaign
    FROM next
    WHERE stats.id = next.id
      AND stats.season IS DISTINCT FROM next.campaign
  `;

  const playersRebuilt = await prisma.$executeRaw`
    UPDATE player_season_stats AS season_stats
    SET
      "matchesPlayed" = 0,
      "minutesPlayed" = 0,
      points = 0,
      rebounds = 0,
      assists = 0,
      steals = 0,
      blocks = 0,
      "fieldGoalsPercent" = 0,
      "threePointsPercent" = 0
    WHERE season_stats.season = 202627
      AND EXISTS (
        SELECT 1
        FROM player_match_stats AS appearance
        WHERE appearance."playerId" = season_stats."playerId"
          AND appearance."externalEventKey" LIKE 'espn:nba:%'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM player_match_stats AS appearance
        WHERE appearance."playerId" = season_stats."playerId"
          AND appearance."externalEventKey" LIKE 'espn:nba:%'
          AND appearance."matchDate" >= TIMESTAMPTZ '2026-10-20 00:00:00+00'
          AND appearance.season = 202627
      )
  `;

  return { relabeled: Number(relabeled), playersRebuilt: Number(playersRebuilt) };
}
