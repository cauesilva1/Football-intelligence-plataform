-- Basketball native columns on player_match_stats (also applied via prisma db push).
ALTER TABLE "player_match_stats"
  ADD COLUMN IF NOT EXISTS "points" INTEGER,
  ADD COLUMN IF NOT EXISTS "rebounds" INTEGER,
  ADD COLUMN IF NOT EXISTS "steals" INTEGER,
  ADD COLUMN IF NOT EXISTS "blocks" INTEGER,
  ADD COLUMN IF NOT EXISTS "fieldGoalsMade" INTEGER,
  ADD COLUMN IF NOT EXISTS "fieldGoalsAttempted" INTEGER;

-- Copy legacy hijack → native for basketball sources.
UPDATE "player_match_stats"
SET
  points = goals,
  rebounds = "passesCompleted",
  steals = ROUND(tackles)::int,
  blocks = ROUND(interceptions)::int,
  "fieldGoalsAttempted" = "passesAttempted"
WHERE
  (source LIKE 'espn-nba%' OR source LIKE 'espn-mens%' OR source LIKE 'euroleague%')
  AND points IS NULL;
