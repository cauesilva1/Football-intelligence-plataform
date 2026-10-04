/**
 * Sync EuroLeague clubs, rosters, and recent boxscores into the DB spine.
 */
import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import { isDbSource } from "@/lib/data-source";
import { upsertPlayerMatchStat } from "@/lib/api/player-match-stats";
import { computeBasketballMatchRating } from "@/lib/scoring/basketball-rating";
import {
  EUROLEAGUE_ESPN_SLUG,
  EUROLEAGUE_LABEL,
  buildEuroLeagueEventKey,
  currentEuroLeagueSeasonCode,
  currentEuroLeagueSeasonYear,
  euroLeagueClubApiId,
  euroLeagueMinutes,
  euroLeaguePersonApiId,
  fetchEuroLeagueClubs,
  fetchEuroLeagueGameStats,
  fetchEuroLeagueGames,
  fetchEuroLeaguePeople,
  formatEuroLeaguePlayerName,
  mapEuroLeaguePosition,
  type EuroLeagueGame,
  type EuroLeaguePlayerLine,
} from "@/lib/api/euroleague";
import { euroLeagueFixtureDraft } from "@/lib/sync/euroleague-fixtures";

const LOG = "[euroleague-sync]";
const CACHE_PREFIX = "euroleague:boxscore:";

function rollingAverage(currentAvg: number, games: number, nextValue: number): number {
  return (currentAvg * games + nextValue) / (games + 1);
}

function shotPercent(made: number, attempted: number): number {
  if (attempted <= 0) return 0;
  return Number(((made / attempted) * 100).toFixed(1));
}

function rollingPercent(
  currentPct: number,
  games: number,
  made: number,
  attempted: number
): number {
  const next = shotPercent(made, attempted);
  if (games <= 0) return next;
  return Number((((currentPct * games + next) / (games + 1))).toFixed(1));
}

export async function ensureEuroLeagueCompetition(): Promise<string | null> {
  if (!canUseDatabase()) return null;
  const prisma = getPrisma();

  let competition = await prisma.competition.findFirst({
    where: {
      OR: [
        { espnSlug: EUROLEAGUE_ESPN_SLUG },
        { name: { equals: EUROLEAGUE_LABEL, mode: "insensitive" } },
      ],
    },
  });

  if (!competition) {
    competition = await prisma.competition.create({
      data: {
        name: EUROLEAGUE_LABEL,
        country: "Europe",
        tier: 1,
        espnSlug: EUROLEAGUE_ESPN_SLUG,
      },
    });
  } else if (competition.espnSlug !== EUROLEAGUE_ESPN_SLUG) {
    competition = await prisma.competition.update({
      where: { id: competition.id },
      data: { espnSlug: EUROLEAGUE_ESPN_SLUG, name: EUROLEAGUE_LABEL },
    });
  }

  return competition.id;
}

export async function upsertEuroLeagueFixtures(
  games: EuroLeagueGame[],
  seasonCode = currentEuroLeagueSeasonCode()
): Promise<{ upserted: number; skipped: number }> {
  const competitionId = await ensureEuroLeagueCompetition();
  if (!competitionId) return { upserted: 0, skipped: games.length };
  const prisma = getPrisma();
  const teams = await prisma.team.findMany({
    where: { competitionId },
    select: { id: true, name: true, apiSportsId: true },
  });
  const teamByApiId = new Map(
    teams.filter((team) => team.apiSportsId != null).map((team) => [team.apiSportsId!, team.id])
  );
  const teamByName = new Map(teams.map((team) => [team.name.toLowerCase(), team.id]));

  const resolveTeam = (code?: string, name?: string): string | undefined => {
    if (code) {
      const byCode = teamByApiId.get(euroLeagueClubApiId(code));
      if (byCode) return byCode;
    }
    if (name) return teamByName.get(name.toLowerCase());
    return undefined;
  };

  let upserted = 0;
  let skipped = 0;
  for (const game of games) {
    const draft = euroLeagueFixtureDraft(game, seasonCode);
    if (!draft) {
      skipped += 1;
      continue;
    }
    const homeTeamId = resolveTeam(draft.homeCode, draft.homeName);
    const awayTeamId = resolveTeam(draft.awayCode, draft.awayName);
    if (!homeTeamId || !awayTeamId) {
      skipped += 1;
      continue;
    }
    const data = {
      competitionId,
      homeTeamId,
      awayTeamId,
      homeScore: draft.homeScore,
      awayScore: draft.awayScore,
      matchDate: draft.matchDate,
      status: draft.status,
      seasonLabel: draft.seasonLabel,
      source: "euroleague",
    };
    await prisma.match.upsert({
      where: { externalKey: draft.externalKey },
      create: { externalKey: draft.externalKey, ...data },
      update: data,
    });
    upserted += 1;
  }
  return { upserted, skipped };
}

/** Heal rows that already have a final score but were left as scheduled. */
export async function markScoredEuroLeagueGamesFinished(
  since = new Date("2026-09-24T00:00:00Z")
): Promise<number> {
  if (!canUseDatabase()) return 0;
  const result = await getPrisma().match.updateMany({
    where: {
      externalKey: { startsWith: "euroleague:" },
      matchDate: { gte: since },
      status: { not: "finished" },
      OR: [{ homeScore: { gt: 0 } }, { awayScore: { gt: 0 } }],
    },
    data: { status: "finished" },
  });
  return result.count;
}

export async function syncEuroLeagueClubs(competitionId: string): Promise<number> {
  const prisma = getPrisma();
  const clubs = await fetchEuroLeagueClubs();
  const seasonLabel = currentEuroLeagueSeasonCode();
  let upserted = 0;

  for (const club of clubs) {
    const apiSportsId = euroLeagueClubApiId(club.code);
    const shortName = club.abbreviatedName ?? club.code;
    const country = club.country?.name ?? "Europe";
    const crestUrl = club.images?.crest;

    const existing = await prisma.team.findFirst({
      where: {
        OR: [
          { apiSportsId },
          { competitionId, name: { equals: club.name, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.team.update({
        where: { id: existing.id },
        data: {
          name: club.name,
          shortName,
          country,
          crestUrl: crestUrl ?? undefined,
          apiSportsId,
          competitionId,
          dataSyncedSeason: seasonLabel,
          dataSyncedAt: new Date(),
        },
      });
    } else {
      await prisma.team.create({
        data: {
          name: club.name,
          shortName,
          country,
          crestUrl,
          apiSportsId,
          competitionId,
          dataSyncedSeason: seasonLabel,
          dataSyncedAt: new Date(),
        },
      });
    }
    upserted += 1;
  }

  return upserted;
}

const ROSTER_STALE_MS = 3 * 24 * 60 * 60 * 1000;

export type EuroLeagueRosterSyncOptions = {
  /** Epoch ms after which no new player is started (cron time budget). */
  deadlineMs?: number;
  /** Re-sync players already refreshed for the current season within the stale window. */
  force?: boolean;
  staleMs?: number;
};

export type EuroLeagueRosterSyncResult = {
  total: number;
  upserted: number;
  skippedFresh: number;
  timedOut: boolean;
};

export async function syncEuroLeagueRosters(
  competitionId: string,
  options: EuroLeagueRosterSyncOptions = {}
): Promise<EuroLeagueRosterSyncResult> {
  const prisma = getPrisma();
  const seasonCode = currentEuroLeagueSeasonCode();
  const staleMs = options.staleMs ?? ROSTER_STALE_MS;
  const people = await fetchEuroLeaguePeople();
  const syncedRows = await prisma.player.findMany({
    where: { sport: "BASKETBALL", league: EUROLEAGUE_LABEL },
    select: { apiSportsId: true, dataSyncedSeason: true, dataSyncedAt: true },
  });
  const lastSyncByApiId = new Map(
    syncedRows
      .filter((p) => p.apiSportsId != null && p.dataSyncedSeason === seasonCode && p.dataSyncedAt)
      .map((p) => [p.apiSportsId!, p.dataSyncedAt!.getTime()] as const)
  );
  const teams = await prisma.team.findMany({
    where: { competitionId },
    select: { id: true, name: true, apiSportsId: true },
  });
  const teamByApiId = new Map(
    teams.filter((t) => t.apiSportsId != null).map((t) => [t.apiSportsId!, t.id] as const)
  );
  const teamByName = new Map(teams.map((t) => [t.name.toLowerCase(), t.id] as const));

  let upserted = 0;
  let skippedFresh = 0;
  let total = 0;
  let timedOut = false;

  for (const row of people) {
    if (row.active === false) continue;
    const code = row.person?.code;
    if (!code) continue;
    total += 1;

    const apiSportsId = euroLeaguePersonApiId(code);
    const lastSync = lastSyncByApiId.get(apiSportsId);
    if (!options.force && lastSync != null && Date.now() - lastSync < staleMs) {
      skippedFresh += 1;
      continue;
    }
    if (options.deadlineMs != null && Date.now() > options.deadlineMs) {
      timedOut = true;
      break;
    }

    const { fullName, knownAs } = formatEuroLeaguePlayerName(row.person.name ?? "Unknown");
    const clubCode = row.club?.code;
    const teamId =
      (clubCode ? teamByApiId.get(euroLeagueClubApiId(clubCode)) : undefined) ??
      (row.club?.name ? teamByName.get(row.club.name.toLowerCase()) : undefined) ??
      null;

    const birthDate = row.person.birthDate
      ? new Date(row.person.birthDate)
      : new Date("1995-01-01T00:00:00Z");
    const heightCm = Math.round(row.person.height ?? 0) || 190;
    const weightKg = Math.round(row.person.weight ?? 0) || 90;
    const nationality = row.person.country?.name ?? "Unknown";
    const position = mapEuroLeaguePosition(row.positionName);
    const photoUrl = row.images?.headshot ?? undefined;

    const existing = await prisma.player.findFirst({
      where: { sport: "BASKETBALL", apiSportsId },
      select: { id: true },
    });

    if (existing) {
      await prisma.player.update({
        where: { id: existing.id },
        data: {
          fullName,
          knownAs,
          nationality,
          position,
          height: heightCm,
          weight: weightKg,
          photoUrl: photoUrl ?? undefined,
          teamId: teamId ?? undefined,
          league: EUROLEAGUE_LABEL,
          dataSyncedSeason: currentEuroLeagueSeasonCode(),
          dataSyncedAt: new Date(),
        },
      });
    } else {
      await prisma.player.create({
        data: {
          fullName,
          knownAs,
          dateOfBirth: birthDate,
          nationality,
          position,
          height: heightCm,
          weight: weightKg,
          photoUrl,
          apiSportsId,
          sport: "BASKETBALL",
          league: EUROLEAGUE_LABEL,
          teamId: teamId ?? undefined,
          dataSyncedSeason: currentEuroLeagueSeasonCode(),
          dataSyncedAt: new Date(),
        },
      });
    }
    upserted += 1;
  }

  return { total, upserted, skippedFresh, timedOut };
}

async function resolvePlayerIdByEuroCode(code: string): Promise<string | null> {
  const prisma = getPrisma();
  const apiSportsId = euroLeaguePersonApiId(code);
  const player = await prisma.player.findFirst({
    where: { sport: "BASKETBALL", apiSportsId },
    select: { id: true },
  });
  return player?.id ?? null;
}

async function accumulateEuroLeagueSeasonStats(
  playerId: string,
  line: {
    minutes: number;
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    fgMade: number;
    fgAtt: number;
    threeMade: number;
    threeAtt: number;
  }
): Promise<void> {
  const prisma = getPrisma();
  const season = currentEuroLeagueSeasonYear();
  const existing = await prisma.playerSeasonStats.findUnique({
    where: { playerId_season: { playerId, season } },
  });
  const games = existing?.matchesPlayed ?? 0;

  if (!existing) {
    await prisma.playerSeasonStats.create({
      data: {
        playerId,
        season,
        matchesPlayed: 1,
        minutesPlayed: line.minutes,
        points: Math.round(line.points),
        rebounds: Math.round(line.rebounds),
        assists: Math.round(line.assists),
        steals: Math.round(line.steals),
        blocks: Math.round(line.blocks),
        fieldGoalsPercent: shotPercent(line.fgMade, line.fgAtt),
        threePointsPercent: shotPercent(line.threeMade, line.threeAtt),
      },
    });
    return;
  }

  await prisma.playerSeasonStats.update({
    where: { playerId_season: { playerId, season } },
    data: {
      matchesPlayed: existing.matchesPlayed + 1,
      minutesPlayed: existing.minutesPlayed + line.minutes,
      points: Math.round(rollingAverage(existing.points, games, line.points)),
      rebounds: Math.round(rollingAverage(existing.rebounds, games, line.rebounds)),
      assists: Math.round(rollingAverage(existing.assists, games, line.assists)),
      steals: Math.round(rollingAverage(existing.steals, games, line.steals)),
      blocks: Math.round(rollingAverage(existing.blocks, games, line.blocks)),
      fieldGoalsPercent: rollingPercent(
        existing.fieldGoalsPercent,
        games,
        line.fgMade,
        line.fgAtt
      ),
      threePointsPercent: rollingPercent(
        existing.threePointsPercent,
        games,
        line.threeMade,
        line.threeAtt
      ),
    },
  });
}

function parsePlayerLine(line: EuroLeaguePlayerLine): {
  code: string;
  name: string;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fgMade: number;
  fgAtt: number;
  threeMade: number;
  threeAtt: number;
} | null {
  const code = line.player?.person?.code;
  if (!code) return null;
  const stats = line.stats;
  if (!stats) return null;

  const threeMade = stats.fieldGoalsMade3 ?? 0;
  const threeAtt = stats.fieldGoalsAttempted3 ?? 0;
  const twoMade = stats.fieldGoalsMade2 ?? 0;
  const twoAtt = stats.fieldGoalsAttempted2 ?? 0;
  const fgMade = stats.fieldGoalsMadeTotal ?? twoMade + threeMade;
  const fgAtt = stats.fieldGoalsAttemptedTotal ?? twoAtt + threeAtt;

  return {
    code,
    name: line.player?.person?.name ?? code,
    minutes: euroLeagueMinutes(stats.timePlayed),
    points: stats.points ?? 0,
    rebounds: stats.totalRebounds ?? 0,
    assists: stats.assistances ?? 0,
    steals: stats.steals ?? 0,
    blocks: stats.blocksFavour ?? 0,
    fgMade,
    fgAtt,
    threeMade,
    threeAtt,
  };
}

export async function processEuroLeagueGame(
  gameCode: number,
  options: {
    force?: boolean;
    matchDate?: Date | null;
    homeName?: string | null;
    awayName?: string | null;
  } = {}
): Promise<{
  gameCode: number;
  statsUpdated: number;
  skipped: number;
  failed: number;
  alreadyProcessed: boolean;
}> {
  const prisma = getPrisma();
  const cacheKey = `${CACHE_PREFIX}${currentEuroLeagueSeasonCode()}:${gameCode}`;

  if (!options.force) {
    const cached = await prisma.systemCache.findUnique({ where: { key: cacheKey } });
    if (cached) {
      return {
        gameCode,
        statsUpdated: 0,
        skipped: 0,
        failed: 0,
        alreadyProcessed: true,
      };
    }
  }

  const payload = await fetchEuroLeagueGameStats(gameCode);
  const homeName = options.homeName ?? "Home";
  const awayName = options.awayName ?? "Away";
  const sides: Array<{ teamName: string; opponent: string; isHome: boolean; lines: EuroLeaguePlayerLine[] }> =
    [
      { teamName: homeName, opponent: awayName, isHome: true, lines: payload.local?.players ?? [] },
      { teamName: awayName, opponent: homeName, isHome: false, lines: payload.road?.players ?? [] },
    ];

  let statsUpdated = 0;
  let skipped = 0;
  let failed = 0;
  const eventKey = buildEuroLeagueEventKey(currentEuroLeagueSeasonCode(), gameCode);
  const matchRow = await prisma.match.findUnique({
    where: { externalKey: eventKey },
    select: { id: true },
  });

  for (const side of sides) {
    for (const raw of side.lines) {
      const parsed = parsePlayerLine(raw);
      if (!parsed) {
        skipped += 1;
        continue;
      }
      if (parsed.minutes <= 0 && parsed.points <= 0) {
        skipped += 1;
        continue;
      }

      try {
        const playerId = await resolvePlayerIdByEuroCode(parsed.code);
        if (!playerId) {
          skipped += 1;
          continue;
        }

        await accumulateEuroLeagueSeasonStats(playerId, parsed);

        if (isDbSource()) {
          await upsertPlayerMatchStat({
            playerId,
            externalEventKey: eventKey,
            matchId: matchRow?.id,
            matchDate: options.matchDate ?? undefined,
            competitionLabel: EUROLEAGUE_LABEL,
            teamName: side.teamName,
            opponentName: side.opponent,
            isHome: side.isHome,
            minutesPlayed: parsed.minutes,
            goals: 0,
            assists: Math.round(parsed.assists),
            tackles: 0,
            interceptions: 0,
            passesCompleted: 0,
            passesAttempted: 0,
            points: Math.round(parsed.points),
            rebounds: Math.round(parsed.rebounds),
            steals: Math.round(parsed.steals),
            blocks: Math.round(parsed.blocks),
            fieldGoalsMade: Math.round(parsed.fgMade),
            fieldGoalsAttempted: Math.round(parsed.fgAtt),
            season: currentEuroLeagueSeasonYear(),
            source: `euroleague-${currentEuroLeagueSeasonCode()}`,
            ratingOverride: computeBasketballMatchRating({
              minutesPlayed: parsed.minutes,
              points: parsed.points,
              rebounds: parsed.rebounds,
              assists: parsed.assists,
              steals: parsed.steals,
              blocks: parsed.blocks,
              fieldGoalsMade: parsed.fgMade,
              fieldGoalsAttempted: parsed.fgAtt,
            }),
          });
        }

        statsUpdated += 1;
      } catch (error) {
        failed += 1;
        console.warn(`${LOG} FAIL ${parsed.name}:`, error);
      }
    }
  }

  await prisma.systemCache.upsert({
    where: { key: cacheKey },
    create: {
      key: cacheKey,
      json: {
        gameCode,
        processedAt: new Date().toISOString(),
        statsUpdated,
        skipped,
        failed,
      },
    },
    update: {
      json: {
        gameCode,
        processedAt: new Date().toISOString(),
        statsUpdated,
        skipped,
        failed,
      },
    },
  });

  return { gameCode, statsUpdated, skipped, failed, alreadyProcessed: false };
}

export async function syncEuroLeagueRecentBoxscores(options: {
  days?: number;
  force?: boolean;
  now?: Date;
  /** Process every played game in the season (ignores days window). */
  allPlayed?: boolean;
  /** Cap games processed this run (useful for long full-season backfills). */
  limit?: number;
  /** Epoch ms after which no new game is started (cron time budget). */
  deadlineMs?: number;
}): Promise<{
  gamesFound: number;
  processed: number;
  skipped: number;
  failed: number;
  statsUpdated: number;
}> {
  const days = Math.max(1, Math.min(options.days ?? 2, 365));
  const now = options.now ?? new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  cutoff.setHours(0, 0, 0, 0);

  const games = await fetchEuroLeagueGames();
  const fixtures = await upsertEuroLeagueFixtures(games);
  const marked = await markScoredEuroLeagueGamesFinished();
  console.log(
    `${LOG} fixtures — upserted ${fixtures.upserted} · skipped ${fixtures.skipped} · marked finished ${marked}`
  );
  const played = games.filter((g) => {
    if (!g.played) return false;
    if (options.allPlayed) return true;
    const raw = g.utcDate ?? g.date;
    if (!raw) return false;
    const d = new Date(raw);
    return d >= cutoff && d <= now;
  });

  // Oldest first so season aggregates build chronologically when force-refreshing.
  played.sort((a, b) => {
    const da = new Date(a.utcDate ?? a.date ?? 0).getTime();
    const db = new Date(b.utcDate ?? b.date ?? 0).getTime();
    return da - db;
  });

  // With --limit, prefer games not yet in systemCache so batches advance past the first N.
  let candidate = played;
  if (!options.force && typeof options.limit === "number" && options.limit > 0) {
    const prisma = getPrisma();
    const keys = played.map(
      (g) => `${CACHE_PREFIX}${currentEuroLeagueSeasonCode()}:${g.gameCode}`
    );
    const cached = await prisma.systemCache.findMany({
      where: { key: { in: keys } },
      select: { key: true },
    });
    const cachedKeys = new Set(cached.map((row) => row.key));
    const pending = played.filter(
      (g) => !cachedKeys.has(`${CACHE_PREFIX}${currentEuroLeagueSeasonCode()}:${g.gameCode}`)
    );
    candidate = pending.length > 0 ? pending : played;
    console.log(
      `${LOG} queue — pending ${pending.length}/${played.length} uncached` +
        (pending.length === 0 ? " (all cached)" : "")
    );
  }

  const queue =
    typeof options.limit === "number" && options.limit > 0
      ? candidate.slice(0, options.limit)
      : candidate;

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let statsUpdated = 0;

  console.log(
    `${LOG} boxscores — ${queue.length}/${played.length} games` +
      `${options.allPlayed ? " (all-played)" : ` (${days}d window)`} · processing…`
  );

  for (const game of queue) {
    if (options.deadlineMs != null && Date.now() > options.deadlineMs) {
      console.warn(`${LOG} deadline reached — remaining games deferred to the next run`);
      break;
    }
    try {
      const result = await processEuroLeagueGame(game.gameCode, {
        force: options.force,
        matchDate: game.utcDate || game.date ? new Date(game.utcDate ?? game.date!) : null,
        homeName: game.local?.club?.name ?? null,
        awayName: game.road?.club?.name ?? null,
      });
      if (result.alreadyProcessed) skipped += 1;
      else {
        processed += 1;
        statsUpdated += result.statsUpdated;
        failed += result.failed;
      }
      if ((processed + skipped) % 5 === 0 || processed + skipped === queue.length) {
        console.log(
          `${LOG} progress ${processed + skipped}/${queue.length} · new=${processed} cache=${skipped} stats=${statsUpdated}`
        );
      }
    } catch (error) {
      failed += 1;
      console.warn(`${LOG} game ${game.gameCode}:`, error);
    }
  }

  return {
    gamesFound: queue.length,
    processed,
    skipped,
    failed,
    statsUpdated,
  };
}

export type EuroLeagueSyncResult = {
  competitionId: string;
  clubs: number;
  players: number;
  boxscores: Awaited<ReturnType<typeof syncEuroLeagueRecentBoxscores>>;
};

/** Full bootstrap: competition + clubs + rosters + optional recent boxscores. */
export async function runEuroLeagueSync(options: {
  days?: number;
  force?: boolean;
  skipBoxscores?: boolean;
  allPlayed?: boolean;
  limit?: number;
} = {}): Promise<EuroLeagueSyncResult> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de sincronizar a EuroLeague.");
  }

  const competitionId = await ensureEuroLeagueCompetition();
  if (!competitionId) {
    throw new Error("Database unavailable for EuroLeague sync.");
  }

  console.log(`${LOG} clubs…`);
  const clubs = await syncEuroLeagueClubs(competitionId);
  console.log(`${LOG} clubs upserted: ${clubs}`);

  console.log(`${LOG} rosters…`);
  const roster = await syncEuroLeagueRosters(competitionId, { force: options.force });
  const players = roster.upserted;
  console.log(`${LOG} players upserted: ${players} (fresh skipped: ${roster.skippedFresh})`);

  const boxscores = options.skipBoxscores
    ? { gamesFound: 0, processed: 0, skipped: 0, failed: 0, statsUpdated: 0 }
    : await syncEuroLeagueRecentBoxscores({
        days: options.days ?? 14,
        force: options.force,
        allPlayed: options.allPlayed,
        limit: options.limit,
      });

  console.log(
    `${LOG} boxscores — found ${boxscores.gamesFound} · new ${boxscores.processed} · cache ${boxscores.skipped} · stats ${boxscores.statsUpdated}`
  );

  return { competitionId, clubs, players, boxscores };
}
