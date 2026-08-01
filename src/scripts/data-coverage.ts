/**
 * Print multi-sport data coverage + season-depth honesty stats.
 *
 * Usage:
 *   npm run data:coverage
 *   npm run data:coverage -- --json
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { isProductiveSeasonRow } from "@/lib/intelligence/data-depth";
import type { Sport } from "@/lib/sport";

function loadDotEnv(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
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
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

const prisma = new PrismaClient();

async function main() {
  const asJson = process.argv.includes("--json");

  const [playersBySport, playersByLeague, teamsByCompetition, seasonRows] =
    await Promise.all([
      prisma.player.groupBy({ by: ["sport"], _count: { _all: true } }),
      prisma.player.groupBy({
        by: ["sport", "league"],
        _count: { _all: true },
        orderBy: [{ sport: "asc" }, { league: "asc" }],
      }),
      prisma.team.findMany({
        select: {
          id: true,
          competition: { select: { name: true, espnSlug: true } },
        },
      }),
      prisma.playerSeasonStats.groupBy({
        by: ["season"],
        _count: { _all: true },
        orderBy: { season: "desc" },
      }),
    ]);

  const teamCounts = new Map<string, number>();
  for (const team of teamsByCompetition) {
    const key = team.competition?.name ?? "Unknown";
    teamCounts.set(key, (teamCounts.get(key) ?? 0) + 1);
  }

  const sports: Sport[] = ["SOCCER", "BASKETBALL", "AMERICAN_FOOTBALL"];
  const depthBySport: Record<
    string,
    {
      players: number;
      withZeroSeasonRows: number;
      withOneProductive: number;
      withTwoPlusProductive: number;
      trajectoryEligiblePct: number;
      /** Share of players who already have ≥1 productive season and also have ≥2. */
      amongProductivePct: number;
    }
  > = {};

  for (const sport of sports) {
    const players = await prisma.player.findMany({
      where: { sport },
      select: {
        id: true,
        stats: {
          select: {
            season: true,
            matchesPlayed: true,
            minutesPlayed: true,
          },
        },
        statistics: {
          select: {
            season: true,
            appearances: true,
            minutesPlayed: true,
          },
        },
      },
    });

    let withZero = 0;
    let withOne = 0;
    let withTwoPlus = 0;

    for (const player of players) {
      const bySeason = new Map<string, { apps: number; minutes: number }>();

      for (const row of player.stats) {
        const key = String(row.season);
        const bucket = bySeason.get(key) ?? { apps: 0, minutes: 0 };
        bucket.apps += row.matchesPlayed;
        bucket.minutes += row.minutesPlayed;
        bySeason.set(key, bucket);
      }

      for (const row of player.statistics) {
        const key = row.season;
        const bucket = bySeason.get(key) ?? { apps: 0, minutes: 0 };
        bucket.apps += row.appearances;
        bucket.minutes += row.minutesPlayed;
        bySeason.set(key, bucket);
      }

      if (bySeason.size === 0) {
        withZero += 1;
        continue;
      }

      let productive = 0;
      for (const bucket of bySeason.values()) {
        if (isProductiveSeasonRow(bucket.apps, bucket.minutes, sport)) {
          productive += 1;
        }
      }

      if (productive === 0) withZero += 1;
      else if (productive === 1) withOne += 1;
      else withTwoPlus += 1;
    }

    const total = players.length || 1;
    const productive = withOne + withTwoPlus || 1;
    depthBySport[sport] = {
      players: players.length,
      withZeroSeasonRows: withZero,
      withOneProductive: withOne,
      withTwoPlusProductive: withTwoPlus,
      trajectoryEligiblePct: Number(((withTwoPlus / total) * 100).toFixed(1)),
      amongProductivePct: Number(((withTwoPlus / productive) * 100).toFixed(1)),
    };
  }

  const euroLeaguePlayers = await prisma.player.count({
    where: { sport: "BASKETBALL", league: { contains: "Euro", mode: "insensitive" } },
  });
  const euroLeagueWithStats = await prisma.player.count({
    where: {
      sport: "BASKETBALL",
      league: { contains: "Euro", mode: "insensitive" },
      OR: [{ stats: { some: {} } }, { statistics: { some: {} } }],
    },
  });

  const cfbPlayers = await prisma.player.count({
    where: {
      sport: "AMERICAN_FOOTBALL",
      OR: [
        { league: { contains: "college", mode: "insensitive" } },
        { league: { contains: "ncaa", mode: "insensitive" } },
        { league: { contains: "cfb", mode: "insensitive" } },
      ],
    },
  });
  const nflPlayers = await prisma.player.count({
    where: {
      sport: "AMERICAN_FOOTBALL",
      league: { contains: "nfl", mode: "insensitive" },
    },
  });

  const americanFootballSplit = {
      nflPlayers,
      cfbPlayers,
    };

  // Startup KPI: Big5 (+ Ligue/Bundesliga etc.) showcase — not vanity overall %.
  const SHOWCASE_LEAGUES = [
    "Premier League",
    "La Liga",
    "Serie A",
    "Bundesliga",
    "Ligue 1",
  ];
  const showcasePlayers = await prisma.player.findMany({
    where: {
      sport: "SOCCER",
      OR: SHOWCASE_LEAGUES.map((league) => ({
        league: { equals: league, mode: "insensitive" as const },
      })),
    },
    select: {
      league: true,
      stats: {
        select: { season: true, matchesPlayed: true, minutesPlayed: true },
      },
      statistics: {
        select: { season: true, appearances: true, minutesPlayed: true },
      },
    },
  });

  let showcaseZero = 0;
  let showcaseOne = 0;
  let showcaseTwo = 0;
  const byLeague: Record<
    string,
    { players: number; zero: number; one: number; twoPlus: number; withOnePlusPct: number; twoPlusPct: number }
  > = {};

  for (const league of SHOWCASE_LEAGUES) {
    byLeague[league] = { players: 0, zero: 0, one: 0, twoPlus: 0, withOnePlusPct: 0, twoPlusPct: 0 };
  }

  for (const player of showcasePlayers) {
    const leagueKey =
      SHOWCASE_LEAGUES.find((l) => l.toLowerCase() === player.league.toLowerCase()) ??
      player.league;
    if (!byLeague[leagueKey]) {
      byLeague[leagueKey] = {
        players: 0,
        zero: 0,
        one: 0,
        twoPlus: 0,
        withOnePlusPct: 0,
        twoPlusPct: 0,
      };
    }
    const bySeason = new Map<string, { apps: number; minutes: number }>();
    for (const row of player.stats) {
      const key = String(row.season);
      const bucket = bySeason.get(key) ?? { apps: 0, minutes: 0 };
      bucket.apps += row.matchesPlayed;
      bucket.minutes += row.minutesPlayed;
      bySeason.set(key, bucket);
    }
    for (const row of player.statistics) {
      const key = row.season;
      const bucket = bySeason.get(key) ?? { apps: 0, minutes: 0 };
      bucket.apps += row.appearances;
      bucket.minutes += row.minutesPlayed;
      bySeason.set(key, bucket);
    }
    let productive = 0;
    for (const bucket of bySeason.values()) {
      if (isProductiveSeasonRow(bucket.apps, bucket.minutes, "SOCCER")) productive += 1;
    }
    byLeague[leagueKey].players += 1;
    if (productive === 0) {
      showcaseZero += 1;
      byLeague[leagueKey].zero += 1;
    } else if (productive === 1) {
      showcaseOne += 1;
      byLeague[leagueKey].one += 1;
    } else {
      showcaseTwo += 1;
      byLeague[leagueKey].twoPlus += 1;
    }
  }

  for (const league of Object.keys(byLeague)) {
    const row = byLeague[league];
    const n = row.players || 1;
    row.withOnePlusPct = Number((((row.one + row.twoPlus) / n) * 100).toFixed(1));
    row.twoPlusPct = Number(((row.twoPlus / n) * 100).toFixed(1));
  }

  const showcaseTotal = showcasePlayers.length || 1;
  const showcase = {
    target: {
      withOnePlusProductivePct: 90,
      note: "Startup KPI: ≥90% of Big5 rostered players with ≥1 productive season (honest floor). twoPlus climbs with prior-season feeds.",
    },
    players: showcasePlayers.length,
    zero: showcaseZero,
    one: showcaseOne,
    twoPlus: showcaseTwo,
    withOnePlusPct: Number((((showcaseOne + showcaseTwo) / showcaseTotal) * 100).toFixed(1)),
    twoPlusPct: Number(((showcaseTwo / showcaseTotal) * 100).toFixed(1)),
    byLeague,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    dataSource: process.env.DATA_SOURCE ?? "unset",
    playersBySport: Object.fromEntries(
      playersBySport.map((row) => [row.sport, row._count._all])
    ),
    playersByLeague: playersByLeague.map((row) => ({
      sport: row.sport,
      league: row.league,
      players: row._count._all,
    })),
    teamsByCompetition: Object.fromEntries([...teamCounts.entries()].sort()),
    seasonRowCounts: seasonRows.map((row) => ({
      season: row.season,
      rows: row._count._all,
    })),
    depthBySport,
    showcase,
    euroLeague: {
      players: euroLeaguePlayers,
      playersWithAnySeasonStats: euroLeagueWithStats,
      note:
        euroLeagueWithStats === 0
          ? "Rosters present but season stats missing — run data:sync-euroleague -- --days=30"
          : "Season stats present for at least some EuroLeague players",
    },
    americanFootballSplit,
    opsHints: [
      "npm run data:backfill-soccer-seasons -- --teams=40 --season=2024",
      "npm run data:backfill-big5 -- --days=40 --end=2025-05-25 --seasonYear=2024",
      "npm run data:sync-euroleague -- --all-played --limit=100",
      "npm run data:sync-nba-teste -- --teams=30",
      "npm run data:backfill-af-season-stats -- --league=nfl --limit=500",
    ],
  };

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("OmniScout data coverage");
    console.log(`Generated: ${report.generatedAt}`);
    console.log(`DATA_SOURCE: ${report.dataSource}`);
    console.log("\nPlayers by sport");
    for (const [sport, count] of Object.entries(report.playersBySport)) {
      console.log(`  ${sport}: ${count}`);
    }
    console.log("\nSeason depth (productive seasons)");
    for (const [sport, depth] of Object.entries(report.depthBySport)) {
      console.log(
        `  ${sport}: players=${depth.players} zero/stub=${depth.withZeroSeasonRows} one=${depth.withOneProductive} twoPlus=${depth.withTwoPlusProductive} overall=${depth.trajectoryEligiblePct}% amongProductive=${depth.amongProductivePct}%`
      );
    }
    console.log("\nStartup KPI — Soccer Big5 showcase (meta ≥90% com ≥1 produtiva)");
    console.log(
      `  players=${showcase.players} zero=${showcase.zero} one=${showcase.one} twoPlus=${showcase.twoPlus} · ≥1 produtiva=${showcase.withOnePlusPct}% · ≥2=${showcase.twoPlusPct}%`
    );
    for (const [league, row] of Object.entries(showcase.byLeague)) {
      console.log(
        `  ${league}: n=${row.players} ≥1=${row.withOnePlusPct}% ≥2=${row.twoPlusPct}% (zero=${row.zero})`
      );
    }
    console.log("\nEuroLeague");
    console.log(
      `  players=${report.euroLeague.players} withSeasonStats=${report.euroLeague.playersWithAnySeasonStats}`
    );
    console.log(`  ${report.euroLeague.note}`);
    console.log("\nAmerican football split");
    console.log(
      `  NFL≈${report.americanFootballSplit.nflPlayers} CFB≈${report.americanFootballSplit.cfbPlayers}`
    );
    console.log("\nOps hints");
    for (const hint of report.opsHints) console.log(`  ${hint}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
