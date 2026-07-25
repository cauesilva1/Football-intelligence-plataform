-- American football native columns on player_match_stats / player_season_stats.
ALTER TABLE "player_match_stats"
  ADD COLUMN IF NOT EXISTS "passingYards" INTEGER,
  ADD COLUMN IF NOT EXISTS "rushingYards" INTEGER,
  ADD COLUMN IF NOT EXISTS "receivingYards" INTEGER,
  ADD COLUMN IF NOT EXISTS "touchdowns" INTEGER,
  ADD COLUMN IF NOT EXISTS "sacks" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "totalYards" INTEGER;

ALTER TABLE "player_season_stats"
  ADD COLUMN IF NOT EXISTS "passingYards" INTEGER,
  ADD COLUMN IF NOT EXISTS "rushingYards" INTEGER,
  ADD COLUMN IF NOT EXISTS "receivingYards" INTEGER,
  ADD COLUMN IF NOT EXISTS "touchdowns" INTEGER,
  ADD COLUMN IF NOT EXISTS "sacks" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "totalYards" INTEGER;

UPDATE "player_match_stats"
SET
  "touchdowns" = goals,
  "rushingYards" = "passesCompleted",
  "passingYards" = "passesAttempted",
  "totalYards" = COALESCE("passesAttempted", 0) + COALESCE("passesCompleted", 0)
WHERE
  (source LIKE 'espn-nfl%' OR source LIKE 'espn-cfb%')
  AND "totalYards" IS NULL;

UPDATE "player_season_stats" pss
SET
  "touchdowns" = goals,
  "passingYards" = ROUND("threePointsPercent")::int,
  "rushingYards" = rebounds,
  "receivingYards" = blocks,
  "sacks" = steals / 10.0,
  "totalYards" = CASE WHEN points > 0 THEN points ELSE ROUND("threePointsPercent")::int + rebounds + blocks END
FROM players pl
WHERE pss."playerId" = pl.id
  AND pl.sport = 'AMERICAN_FOOTBALL'
  AND pss."totalYards" IS NULL;
