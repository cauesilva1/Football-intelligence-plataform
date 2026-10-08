-- Steals and blocks from ESPN play-by-play. Coordinates are the opponent's
-- attacking frame (their rim at y=0); the chart mirrors them onto the far half.
CREATE TABLE IF NOT EXISTS "basketball_defensive_plays" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "externalPlayId" TEXT NOT NULL,
  "x" DOUBLE PRECISION NOT NULL,
  "y" DOUBLE PRECISION NOT NULL,
  "kind" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "basketball_defensive_plays_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "basketball_defensive_plays_gameId_externalPlayId_key"
  ON "basketball_defensive_plays"("gameId", "externalPlayId");
CREATE INDEX IF NOT EXISTS "basketball_defensive_plays_playerId_season_idx"
  ON "basketball_defensive_plays"("playerId", "season");
CREATE INDEX IF NOT EXISTS "basketball_defensive_plays_gameId_idx"
  ON "basketball_defensive_plays"("gameId");

DO $$ BEGIN
  ALTER TABLE "basketball_defensive_plays"
    ADD CONSTRAINT "basketball_defensive_plays_playerId_fkey"
    FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
