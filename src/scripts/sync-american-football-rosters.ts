/**
 * American Football — bootstrap NFL + CFB elite teams, then sync every roster from ESPN.
 *
 * Uso:
 *   npm run data:sync-af-rosters
 *   npm run data:sync-af-rosters -- --league=nfl --force
 *   npm run data:sync-af-rosters -- --league=nfl --seasons-only --with-stats
 *   npm run data:sync-af-rosters -- --league=nfl --seasons-only --with-stats --limit=200
 *   npm run data:backfill-af-season-stats -- --league=nfl
 *
 * Default roster sync: Cap Hit + stubs only. Past-season ESPN production:
 * use --seasons-only --with-stats (or data:backfill-af-season-stats).
 */

// Mass sync prefers DIRECT_URL to avoid Supabase pooler starvation.
// Must run before any Prisma import (dynamic imports below).
if (process.env.DIRECT_URL?.trim()) {
  process.env.DATABASE_URL = process.env.DIRECT_URL.trim();
}

process.stdout.write(`[af-rosters] boot pid=${process.pid}\n`);

const FETCH_DELAY_MS = 150;
const TEAM_CONCURRENCY = 3;
const PLAYER_SEASON_CONCURRENCY = 8;

type LeagueFilter = "all" | "nfl" | "cfb";

function parseArgs(argv: string[]): {
  league: LeagueFilter;
  force: boolean;
  seasonsOnly: boolean;
  skipStats: boolean;
  limit: number | null;
} {
  let league: LeagueFilter = "all";
  let force = false;
  let seasonsOnly = false;
  // Fast by default — ESPN past stats are fetched on profile open / seasons-only --with-stats.
  let skipStats = true;
  let limit: number | null = null;
  for (const arg of argv) {
    if (arg === "--force") force = true;
    if (arg === "--seasons-only") seasonsOnly = true;
    if (arg === "--skip-stats") skipStats = true;
    if (arg === "--with-stats") skipStats = false;
    if (arg.startsWith("--league=")) {
      const value = arg.slice("--league=".length).toLowerCase();
      if (value === "nfl" || value === "cfb" || value === "all") league = value;
    }
    if (arg.startsWith("--limit=")) {
      const n = Number.parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
  }
  return { league, force, seasonsOnly, skipStats, limit };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { ensureNflCompetition } = await import("@/lib/sync/nfl-bootstrap");
  const { ensureCfbCompetition } = await import("@/lib/sync/cfb-bootstrap");
  const {
    ensureAmericanFootballTeamRoster,
    ensureAmericanFootballPlayerSeasons,
  } = await import("@/lib/sync/american-football-roster");
  const { getPrisma } = await import("@/lib/prisma");
  const { canUseDatabase } = await import("@/lib/system-cache");
  const { resolveAmericanFootballLeagueFromCompetition } = await import(
    "@/lib/american-football/team-league"
  );

  const { league, force, seasonsOnly, skipStats, limit } = parseArgs(process.argv.slice(2));

  if (!canUseDatabase()) {
    console.error(
      "[af-rosters] Database unavailable. Set DATA_SOURCE=db and a valid DATABASE_URL."
    );
    process.exit(1);
  }

  console.log(
    `[af-rosters] Starting · league=${league} · force=${force} · seasonsOnly=${seasonsOnly} · skipStats=${skipStats} · limit=${limit ?? "none"}`
  );

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

  if (seasonsOnly) {
    const { resolveFootballHubSeasonYears } = await import("@/lib/api/espn-football-seasons");
    const { footballSeasonRowHasSignal } = await import("@/lib/api/espn-football-athlete-stats");
    const { pastYear } = resolveFootballHubSeasonYears();
    const olderYear = pastYear - 1;
    const priorYears = [pastYear, olderYear];

    let players = await prisma.player.findMany({
      where: {
        sport: "AMERICAN_FOOTBALL",
        team: { competitionId: { in: competitions.map((c) => c.id) } },
        ...(skipStats ? {} : { apiSportsId: { not: null } }),
      },
      select: {
        id: true,
        fullName: true,
        apiSportsId: true,
        team: { select: { competition: { select: { name: true } } } },
        stats: {
          where: { season: { in: priorYears } },
          select: {
            season: true,
            points: true,
            goals: true,
            tackles: true,
            steals: true,
            totalYards: true,
            touchdowns: true,
            sacks: true,
            passingYards: true,
            rushingYards: true,
            receivingYards: true,
          },
        },
      },
      orderBy: { fullName: "asc" },
    });

    if (!skipStats) {
      players = players.filter((player) => {
        const bySeason = new Map(player.stats.map((row) => [row.season, row]));
        return priorYears.some((year) => !footballSeasonRowHasSignal(bySeason.get(year)));
      });
    }
    if (limit != null) {
      players = players.slice(0, limit);
    }

    console.log(
      `[af-rosters] seasons-only · ${players.length} players` +
        (skipStats
          ? " (stubs)"
          : ` missing ${priorYears.join("/")}/production → ESPN fetch`)
    );

    let ok = 0;
    let fetched = 0;
    let failed = 0;
    for (let i = 0; i < players.length; i += PLAYER_SEASON_CONCURRENCY) {
      const batch = players.slice(i, i + PLAYER_SEASON_CONCURRENCY);
      await Promise.all(
        batch.map(async (player, offset) => {
          const index = i + offset + 1;
          const leagueCode = resolveAmericanFootballLeagueFromCompetition(
            player.team?.competition?.name
          );
          if (!leagueCode) {
            console.warn(`[${index}/${players.length}] ${player.fullName} — liga desconhecida`);
            failed += 1;
            return;
          }
          try {
            const didFetch = await ensureAmericanFootballPlayerSeasons({
              playerId: player.id,
              espnAthleteId: player.apiSportsId,
              league: leagueCode,
              fetchPastStats: !skipStats,
              priorSeasonCount: 2,
            });
            ok += 1;
            if (didFetch) fetched += 1;
            if (index % 50 === 0 || index === players.length) {
              console.log(
                `[${index}/${players.length}] seasons ok=${ok} fetched=${fetched} failed=${failed}`
              );
            }
          } catch (error) {
            failed += 1;
            console.error(`[${index}/${players.length}] ${player.fullName} — falhou:`, error);
          }
        })
      );
      await sleep(FETCH_DELAY_MS);
    }

    console.log(
      `[af-rosters] Done seasons-only · ok=${ok} fetched=${fetched} failed=${failed}`
    );
    return;
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

  async function syncOne(i: number): Promise<void> {
    const team = teams[i]!;
    const label = `[${i + 1}/${teams.length}] ${team.name}`;

    if (!team.apiSportsId) {
      console.warn(`${label} — sem apiSportsId (ESPN), pulando`);
      skipped += 1;
      return;
    }

    try {
      const count = await ensureAmericanFootballTeamRoster({
        teamId: team.id,
        competitionName: team.competition?.name,
        espnTeamId: team.apiSportsId,
        minPlayers: force ? Number.MAX_SAFE_INTEGER : 20,
        force,
        skipStats,
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

  for (let i = 0; i < teams.length; i += TEAM_CONCURRENCY) {
    const indexes = Array.from(
      { length: Math.min(TEAM_CONCURRENCY, teams.length - i) },
      (_, offset) => i + offset
    );
    await Promise.all(indexes.map((idx) => syncOne(idx)));
  }

  console.log(
    `[af-rosters] Done · ok=${ok} skipped=${skipped} failed=${failed} · roster rows touched≈${playersUpserted}`
  );
}

main().catch((error) => {
  console.error("[af-rosters] Fatal:", error);
  process.exit(1);
});
