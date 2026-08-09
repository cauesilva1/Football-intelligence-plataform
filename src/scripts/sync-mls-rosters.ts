/**
 * Force-sync every MLS club + ESPN roster/stats for season 2026.
 *
 *   npm run data:sync-mls
 *   npm run data:sync-mls -- --skip-boxscores
 */
import fs from "fs";
import path from "path";
import { getPrisma } from "@/lib/prisma";
import { ensureMlsCompetition, MLS_EXPECTED_CLUBS } from "@/lib/sync/mls-bootstrap";
import { fetchEspnClubRoster } from "@/lib/api/espn-roster";
import { persistSquadFromEspn } from "@/features/scouting/repository/club.repository.prisma";
import { MLS_LABEL, MLS_SEASON_LABEL } from "@/lib/seasons";
import { runSoccerBoxscoreBackfill } from "@/lib/cron/soccer-daily-sync";

function loadDotEnv(): void {
  for (const file of [".env", ".env.local"]) {
    const envPath = path.join(process.cwd(), file);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

loadDotEnv();

async function main(): Promise<void> {
  const skipBoxscores = process.argv.includes("--skip-boxscores");
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente.");
  }

  process.env.PRISMA_LOG_QUIET = process.env.PRISMA_LOG_QUIET ?? "1";
  const prisma = getPrisma();

  console.log(`[sync-mls] forcing club directory (expect ≥${MLS_EXPECTED_CLUBS})…`);
  const bootstrap = await ensureMlsCompetition({ forceTeams: true });
  console.log(
    `[sync-mls] competition=${bootstrap.competitionId} · dbClubs=${bootstrap.teamCount} · espnListed=${bootstrap.espnTeams}`
  );

  const clubs = await prisma.team.findMany({
    where: { competitionId: bootstrap.competitionId },
    select: { id: true, name: true, _count: { select: { players: true } } },
    orderBy: { name: "asc" },
  });

  console.log(`[sync-mls] syncing ESPN rosters for ${clubs.length} clubs…`);

  let rosterPlayers = 0;
  let clubsWithRoster = 0;
  let emptyRosters = 0;

  for (let i = 0; i < clubs.length; i += 1) {
    const club = clubs[i];
    process.stdout.write(`[sync-mls] ${i + 1}/${clubs.length} ${club.name}… `);
    try {
      const squad = await fetchEspnClubRoster(club.name, MLS_LABEL);
      if (squad.length === 0) {
        emptyRosters += 1;
        console.log(`empty (had ${club._count.players})`);
        continue;
      }
      const saved = await persistSquadFromEspn(club.id, squad, MLS_LABEL);
      await prisma.player.updateMany({
        where: { teamId: club.id, sport: "SOCCER" },
        data: { league: MLS_LABEL, dataSyncedSeason: MLS_SEASON_LABEL },
      });
      rosterPlayers += saved;
      clubsWithRoster += 1;
      console.log(`ok ${saved} players`);
    } catch (error) {
      console.log(`FAIL ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!skipBoxscores) {
    console.log("[sync-mls] backfilling ESPN boxscores (90d)…");
    const box = await runSoccerBoxscoreBackfill({
      days: 90,
      espnSlug: "usa.1",
      seasonYear: 2026,
      createMissingPlayers: true,
    });
    console.log(
      `[sync-mls] boxscores processed=${box.processed} skipped=${box.skipped} failed=${box.failed}`
    );
  }

  const players = await prisma.player.count({
    where: {
      sport: "SOCCER",
      OR: [
        { league: { equals: MLS_LABEL, mode: "insensitive" } },
        { team: { competitionId: bootstrap.competitionId } },
      ],
    },
  });

  console.log(
    JSON.stringify(
      {
        clubs: clubs.length,
        clubsWithRoster,
        emptyRosters,
        rosterPlayersUpserted: rosterPlayers,
        mlsPlayersTotal: players,
        expectedClubs: MLS_EXPECTED_CLUBS,
        complete: clubs.length >= MLS_EXPECTED_CLUBS,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("[sync-mls] FATAL:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getPrisma().$disconnect();
    } catch {
      /* ignore */
    }
  });
