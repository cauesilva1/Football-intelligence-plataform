-- Per-shot NBA court events. `zone` and `shotType` are text (not enums) so a
-- future soccer shot table can reuse the same column contract with its own zones.
CREATE TABLE IF NOT EXISTS "basketball_shots" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "externalPlayId" TEXT NOT NULL,
  "x" DOUBLE PRECISION NOT NULL,
  "y" DOUBLE PRECISION NOT NULL,
  "made" BOOLEAN NOT NULL,
  "zone" TEXT NOT NULL,
  "shotType" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "basketball_shots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "basketball_shots_gameId_externalPlayId_key"
  ON "basketball_shots"("gameId", "externalPlayId");
CREATE INDEX IF NOT EXISTS "basketball_shots_playerId_season_idx"
  ON "basketball_shots"("playerId", "season");
CREATE INDEX IF NOT EXISTS "basketball_shots_gameId_idx"
  ON "basketball_shots"("gameId");

DO $$ BEGIN
  ALTER TABLE "basketball_shots"
    ADD CONSTRAINT "basketball_shots_playerId_fkey"
    FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
