/**
 * American Football — bootstrap NFL + CFB elite teams, then sync every roster from ESPN.
 *
 * Uso:
 *   npm run data:sync-af-rosters
 *   npm run data:sync-af-rosters -- --league=nfl
 *   npm run data:sync-af-rosters -- --league=cfb --force
 */
import { ensureNflCompetition } from "@/lib/sync/nfl-bootstrap";
import { ensureCfbCompetition } from "@/lib/sync/cfb-bootstrap";
import { ensureAmericanFootballTeamRoster } from "@/lib/sync/american-football-roster";
import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";

const FETCH_DELAY_MS = 350;

type LeagueFilter = "all" | "nfl" | "cfb";

function parseArgs(argv: string[]): { league: LeagueFilter; force: boolean } {
  let league: LeagueFilter = "all";
  let force = false;
  for (const arg of argv) {
    if (arg === "--force") force = true;
    if (arg.startsWith("--league=")) {
      const value = arg.slice("--league=".length).toLowerCase();
      if (value === "nfl" || value === "cfb" || value === "all") league = value;
    }
  }
  return { league, force };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { league, force } = parseArgs(process.argv.slice(2));

  if (!canUseDatabase()) {
    console.error(
      "[af-rosters] Database unavailable. Set DATA_SOURCE=db and a valid DATABASE_URL."
    );
    process.exit(1);
  }

  console.log(`[af-rosters] Starting · league=${league} · force=${force}`);

  if (league === "all" || league === "nfl") {
    console.log("[af-rosters] Bootstrapping NFL franchises…");
    await ensureNflCompetition();
  }
  if (league === "all" || league === "cfb") {
    console.log("[af-rosters] Bootstrapping CFB elite programs…");
    await ensureCfbCompetition();
  }

  const prisma = getPrisma();
  const competitions = await prisma.competition.findMany({
    where: {
      OR: [
        ...(league === "all" || league === "nfl"
          ? [{ espnSlug: "nfl" }, { name: { equals: "NFL", mode: "insensitive" as const } }]
          : []),
        ...(league === "all" || league === "cfb"
          ? [
              { espnSlug: "college-football" },
              { name: { equals: "College Football", mode: "insensitive" as const } },
            ]
          : []),
      ],
    },
    select: { id: true, name: true, espnSlug: true },
  });

  if (!competitions.length) {
    console.error("[af-rosters] No NFL/CFB competitions found after bootstrap.");
    process.exit(1);
  }

  const teams = await prisma.team.findMany({
    where: { competitionId: { in: competitions.map((c) => c.id) } },
    select: {
      id: true,
      name: true,
      apiSportsId: true,
      competition: { select: { name: true, espnSlug: true } },
    },
    orderBy: { name: "asc" },
  });

  console.log(`[af-rosters] ${teams.length} teams to sync`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  let playersUpserted = 0;

  for (let i = 0; i < teams.length; i++) {
    const team = teams[i]!;
    const label = `[${i + 1}/${teams.length}] ${team.name}`;

    if (!team.apiSportsId) {
      console.warn(`${label} — sem apiSportsId (ESPN), pulando`);
      skipped += 1;
      continue;
    }

    try {
      const count = await ensureAmericanFootballTeamRoster({
        teamId: team.id,
        competitionName: team.competition?.name,
        espnTeamId: team.apiSportsId,
        minPlayers: force ? Number.MAX_SAFE_INTEGER : 20,
        force,
      });
      playersUpserted += count;
      ok += 1;
      console.log(`${label} — ok (~${count} players on roster)`);
    } catch (error) {
      failed += 1;
      console.error(`${label} — falhou:`, error);
    }

    await sleep(FETCH_DELAY_MS);
  }

  console.log(
    `[af-rosters] Done · ok=${ok} skipped=${skipped} failed=${failed} · roster rows touched≈${playersUpserted}`
  );
}

main().catch((error) => {
  console.error("[af-rosters] Fatal:", error);
  process.exit(1);
});
