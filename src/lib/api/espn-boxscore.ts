import { getPrisma, withPrismaRetry } from "@/lib/prisma";
import { namesLikelyMatch } from "@/lib/sync/data-staleness";
import { upsertPlayerMatchStat, buildEspnEventKey } from "@/lib/api/player-match-stats";
import { ESPN_BRAZIL_SEASON_YEAR } from "@/lib/seasons";

/** @deprecated Prefer processMatchBoxScore with explicit league — kept for BR scripts. */
const LEGACY_BR_SEASON = ESPN_BRAZIL_SEASON_YEAR;
const LEGACY_BR_SLUG = "bra.1";

export interface MatchPlayerBoxScore {
  espnAthleteId: string;
  fullName: string;
  teamName: string;
  goals: number;
  assists: number;
  /** null when ESPN boxscore omitted the metric */
  tackles: number | null;
  interceptions: number | null;
  passesCompleted: number;
  passesAttempted: number;
  minutesPlayed: number;
}

export interface ProcessMatchBoxScoreResult {
  matchId: string;
  espnSlug: string;
  playersProcessed: number;
  playersCreated: number;
  statsUpserted: number;
  skipped: number;
  failed: number;
  alreadyProcessed: boolean;
}

export type ProcessMatchBoxScoreOptions = {
  force?: boolean;
  /** Calendar / ESPN season year stored on PlayerSeasonStats + PlayerMatchStat */
  seasonYear: number;
  competitionLabel: string;
  /** When true, do not create players that are missing from the DB */
  createMissingPlayers?: boolean;
};

interface EspnStat {
  name?: string;
  value?: number;
}

interface EspnRosterPlayer {
  starter?: boolean;
  subbedIn?: boolean;
  subbedOut?: boolean;
  active?: boolean;
  athlete?: { id?: string; displayName?: string; fullName?: string };
  stats?: EspnStat[];
}

interface EspnSummaryResponse {
  rosters?: Array<{
    team?: { displayName?: string; name?: string };
    roster?: EspnRosterPlayer[];
  }>;
  keyEvents?: Array<{
    type?: { type?: string; text?: string };
    clock?: { value?: number; displayValue?: string };
    participants?: Array<{ athlete?: { id?: string; displayName?: string } }>;
  }>;
  header?: {
    competitions?: Array<{
      status?: { type?: { state?: string; completed?: boolean } };
      date?: string;
      competitors?: Array<{
        homeAway?: string;
        team?: { displayName?: string; name?: string };
      }>;
    }>;
  };
}

interface PlayerRef {
  id: string;
  fullName: string;
  knownAs: string;
}

function buildPlayerSlug(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "jogador";
}

function inferPosition(
  goals: number,
  assists: number,
  tackles: number,
  interceptions: number
): string {
  const defenseScore = tackles + interceptions;
  const attackScore = goals * 2 + assists;

  if (defenseScore >= 3 && defenseScore > attackScore) return "CB";
  if (goals >= 2) return "ST";
  if (assists >= 2) return "AM";
  if (attackScore >= 2) return "FW";
  if (defenseScore >= 2) return "DM";
  return "CM";
}

function statValue(stats: EspnStat[] | undefined, ...names: string[]): number {
  if (!stats?.length) return 0;

  for (const name of names) {
    const stat = stats.find((entry) => entry.name === name);
    if (stat?.value == null) continue;
    const value = Number(stat.value);
    if (Number.isFinite(value)) return value;
  }

  return 0;
}

/** Like statValue, but returns null when none of the named keys exist in the feed. */
function statValueOrNull(stats: EspnStat[] | undefined, ...names: string[]): number | null {
  if (!stats?.length) return null;
  let sawKey = false;
  for (const name of names) {
    const stat = stats.find((entry) => entry.name === name);
    if (!stat) continue;
    sawKey = true;
    if (stat.value == null) continue;
    const value = Number(stat.value);
    if (Number.isFinite(value)) return value;
  }
  return sawKey ? 0 : null;
}

function playerAppeared(player: EspnRosterPlayer): boolean {
  if (statValue(player.stats, "appearances") > 0) return true;
  if (player.starter) return true;
  if (player.subbedIn) return true;
  return Boolean(player.active && (player.starter || player.subbedIn));
}

function buildSubstitutionClocks(
  keyEvents: EspnSummaryResponse["keyEvents"]
): Map<string, { onMinute?: number; offMinute?: number }> {
  const clocks = new Map<string, { onMinute?: number; offMinute?: number }>();

  for (const event of keyEvents ?? []) {
    const isSubstitution =
      event.type?.type === "substitution" || /substitution/i.test(event.type?.text ?? "");
    if (!isSubstitution) continue;

    const minute = Math.max(0, Math.round((event.clock?.value ?? 0) / 60));
    const participants = event.participants ?? [];
    if (participants.length < 2) continue;

    const incoming = participants[0]?.athlete;
    const outgoing = participants[1]?.athlete;
    if (!incoming?.id || !outgoing?.id) continue;

    const incomingClock = clocks.get(incoming.id) ?? {};
    incomingClock.onMinute = minute;
    clocks.set(incoming.id, incomingClock);

    const outgoingClock = clocks.get(outgoing.id) ?? {};
    outgoingClock.offMinute = minute;
    clocks.set(outgoing.id, outgoingClock);
  }

  return clocks;
}

function estimateMinutesPlayed(
  player: EspnRosterPlayer,
  substitutionClocks: Map<string, { onMinute?: number; offMinute?: number }>
): number {
  const athleteId = player.athlete?.id;
  const subClock = athleteId ? substitutionClocks.get(athleteId) : undefined;

  if (player.starter && !player.subbedOut) return 90;
  if (player.starter && player.subbedOut && subClock?.offMinute != null) {
    return Math.max(0, Math.min(90, subClock.offMinute));
  }
  if (player.subbedIn && subClock?.onMinute != null) {
    return Math.max(0, Math.min(90, 90 - subClock.onMinute));
  }
  if (player.starter) return 90;
  if (player.subbedIn) return 30;
  // Appeared without usable sub clocks — never use 1' (creates absurd goals/90).
  if (statValue(player.stats, "appearances") > 0) return 15;
  return 0;
}

function extractMatchPlayerBoxScores(summary: EspnSummaryResponse): MatchPlayerBoxScore[] {
  const substitutionClocks = buildSubstitutionClocks(summary.keyEvents);
  const players: MatchPlayerBoxScore[] = [];

  for (const teamRoster of summary.rosters ?? []) {
    const teamName = teamRoster.team?.displayName ?? teamRoster.team?.name ?? "Série A";

    for (const rosterPlayer of teamRoster.roster ?? []) {
      if (!playerAppeared(rosterPlayer)) continue;

      const fullName =
        rosterPlayer.athlete?.displayName?.trim() ||
        rosterPlayer.athlete?.fullName?.trim() ||
        "";
      const espnAthleteId = rosterPlayer.athlete?.id?.trim() ?? "";
      if (!fullName) continue;

      const stats = rosterPlayer.stats ?? [];
      const passesCompleted = statValue(
        stats,
        "passesCompleted",
        "accuratePasses",
        "completedPasses"
      );
      const passesAttempted = statValue(stats, "passesAttempted", "totalPasses", "attemptedPasses");

      players.push({
        espnAthleteId,
        fullName,
        teamName,
        goals: statValue(stats, "totalGoals", "goals"),
        assists: statValue(stats, "goalAssists", "assists"),
        tackles: statValueOrNull(stats, "tacklesWon", "tackles", "totalTackles"),
        interceptions: statValueOrNull(stats, "interceptions"),
        passesCompleted,
        passesAttempted,
        minutesPlayed: estimateMinutesPlayed(rosterPlayer, substitutionClocks),
      });
    }
  }

  return players;
}

function matchPassingAccuracy(completed: number, attempted: number): number {
  if (attempted <= 0) return 0;
  return (completed / attempted) * 100;
}

function combinePassingAccuracy(
  currentAccuracy: number,
  currentMatches: number,
  matchCompleted: number,
  matchAttempted: number
): number {
  const matchAccuracy = matchPassingAccuracy(matchCompleted, matchAttempted);
  if (matchAttempted <= 0) return currentAccuracy;
  if (currentMatches <= 0 || currentAccuracy <= 0) return matchAccuracy;

  return (currentAccuracy * currentMatches + matchAccuracy) / (currentMatches + 1);
}

async function fetchMatchSummary(
  matchId: string,
  espnSlug: string
): Promise<EspnSummaryResponse> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnSlug}/summary?event=${encodeURIComponent(matchId)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "football-intelligence-platform/1.0 (soccer-boxscore)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`ESPN summary HTTP ${response.status} for ${espnSlug}/${matchId}`);
  }

  return (await response.json()) as EspnSummaryResponse;
}

/** Public read of per-match player stats from ESPN summary (no DB write). */
export async function fetchEspnMatchBoxScores(
  espnSlug: string,
  eventId: string
): Promise<MatchPlayerBoxScore[]> {
  try {
    const summary = await fetchMatchSummary(eventId, espnSlug);
    return extractMatchPlayerBoxScores(summary);
  } catch (error) {
    console.warn(`[boxscore] fetch failed ${espnSlug}/${eventId}:`, error);
    return [];
  }
}

async function findTeamIdByName(
  teamName: string,
  competitionLabel?: string
): Promise<string | null> {
  const prisma = getPrisma();
  const teams = await prisma.team.findMany({
    select: {
      id: true,
      name: true,
      shortName: true,
      competition: { select: { name: true } },
    },
    take: 1200,
  });

  const needle = competitionLabel?.toLowerCase().slice(0, 10) ?? "";
  const inCompetition = needle
    ? teams.filter((t) => (t.competition?.name ?? "").toLowerCase().includes(needle))
    : teams;
  const pool = inCompetition.length > 0 ? inCompetition : teams;

  const team =
    pool.find((entry) => namesLikelyMatch(entry.name, teamName)) ??
    pool.find((entry) => namesLikelyMatch(entry.shortName, teamName));

  return team?.id ?? null;
}

async function resolvePlayerId(
  cache: Map<string, PlayerRef>,
  fullName: string,
  teamName: string,
  boxScore: MatchPlayerBoxScore,
  ctx: { seasonYear: number; competitionLabel: string; createMissingPlayers: boolean }
): Promise<{ id: string; created: boolean } | null> {
  const prisma = getPrisma();
  const slug = buildPlayerSlug(fullName);
  const cached =
    cache.get(fullName.toLowerCase()) ??
    cache.get(slug) ??
    [...cache.values()].find(
      (player) => namesLikelyMatch(player.fullName, fullName) || namesLikelyMatch(player.knownAs, fullName)
    );

  if (cached) {
    return { id: cached.id, created: false };
  }

  const existing =
    (await prisma.player.findFirst({
      where: { fullName, sport: "SOCCER" },
      select: { id: true, fullName: true, knownAs: true },
    })) ??
    (await prisma.player.findFirst({
      where: {
        sport: "SOCCER",
        OR: [
          { knownAs: { equals: fullName, mode: "insensitive" } },
          { knownAs: slug },
        ],
      },
      select: { id: true, fullName: true, knownAs: true },
    }));

  if (existing) {
    cache.set(fullName.toLowerCase(), existing);
    cache.set(slug, existing);
    return { id: existing.id, created: false };
  }

  if (!ctx.createMissingPlayers) {
    return null;
  }

  const teamId = await findTeamIdByName(teamName, ctx.competitionLabel);
  const created = await prisma.player.create({
    data: {
      fullName,
      knownAs: slug,
      dateOfBirth: new Date(Date.UTC(2000, 0, 1)),
      nationality: "Unknown",
      position: inferPosition(
        boxScore.goals,
        boxScore.assists,
        boxScore.tackles ?? 0,
        boxScore.interceptions ?? 0
      ),
      height: 180,
      weight: 75,
      strengths: [],
      weaknesses: [],
      teamId,
      sport: "SOCCER",
      league: ctx.competitionLabel,
      dataSyncedSeason: String(ctx.seasonYear),
      dataSyncedAt: new Date(),
    },
    select: { id: true, fullName: true, knownAs: true },
  });

  cache.set(fullName.toLowerCase(), created);
  cache.set(slug, created);
  return { id: created.id, created: true };
}

async function accumulateSeasonStats(
  playerId: string,
  boxScore: MatchPlayerBoxScore,
  seasonYear: number
): Promise<void> {
  const prisma = getPrisma();
  const matchPassAccuracy = matchPassingAccuracy(
    boxScore.passesCompleted,
    boxScore.passesAttempted
  );

  // Upsert + increments avoids P2002 races when two matches/backfills hit the same player.
  const existing = await prisma.playerSeasonStats.findUnique({
    where: { playerId_season: { playerId, season: seasonYear } },
  });

  if (!existing) {
    try {
      await prisma.playerSeasonStats.create({
        data: {
          playerId,
          season: seasonYear,
          goals: boxScore.goals,
          assists: boxScore.assists,
          tackles: boxScore.tackles ?? 0,
          interceptions: boxScore.interceptions ?? 0,
          minutesPlayed: boxScore.minutesPlayed,
          matchesPlayed: 1,
          passingAccuracy: matchPassAccuracy,
        },
      });
      return;
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: unknown }).code)
          : "";
      if (code !== "P2002") throw error;
      // Concurrent create won the race — fall through to increment update.
    }
  }

  const row = await prisma.playerSeasonStats.findUniqueOrThrow({
    where: { playerId_season: { playerId, season: seasonYear } },
  });

  await prisma.playerSeasonStats.update({
    where: { playerId_season: { playerId, season: seasonYear } },
    data: {
      goals: row.goals + boxScore.goals,
      assists: row.assists + boxScore.assists,
      tackles: row.tackles + (boxScore.tackles ?? 0),
      interceptions: row.interceptions + (boxScore.interceptions ?? 0),
      minutesPlayed: row.minutesPlayed + boxScore.minutesPlayed,
      matchesPlayed: row.matchesPlayed + 1,
      passingAccuracy: combinePassingAccuracy(
        row.passingAccuracy,
        row.matchesPlayed,
        boxScore.passesCompleted,
        boxScore.passesAttempted
      ),
    },
  });
}

function isMatchFinished(summary: EspnSummaryResponse): boolean {
  const status = summary.header?.competitions?.[0]?.status?.type;
  return status?.completed === true || status?.state === "post";
}

function boxscoreCacheKey(espnSlug: string, seasonYear: number, eventId: string): string {
  return `espn:${espnSlug}:boxscore:${seasonYear}:${eventId}`;
}

/**
 * Process ESPN boxscore for any soccer league slug.
 * Writes PlayerSeasonStats (aggregate) + PlayerMatchStat (per appearance).
 */
export async function processMatchBoxScore(
  espnSlug: string,
  eventId: string,
  options: ProcessMatchBoxScoreOptions
): Promise<ProcessMatchBoxScoreResult> {
  const prisma = getPrisma();
  const cacheKey = boxscoreCacheKey(espnSlug, options.seasonYear, eventId);
  const createMissingPlayers = options.createMissingPlayers ?? true;

  if (!options.force) {
    const cached = await prisma.systemCache.findUnique({ where: { key: cacheKey } });
    if (cached) {
      return {
        matchId: eventId,
        espnSlug,
        playersProcessed: 0,
        playersCreated: 0,
        statsUpserted: 0,
        skipped: 0,
        failed: 0,
        alreadyProcessed: true,
      };
    }
  }

  const summary = await fetchMatchSummary(eventId, espnSlug);
  if (!isMatchFinished(summary)) {
    throw new Error(
      `Match ${espnSlug}/${eventId} is not finished on ESPN yet — wait for full time.`
    );
  }

  const boxScores = extractMatchPlayerBoxScores(summary);
  const playerCache = new Map<string, PlayerRef>();

  let playersProcessed = 0;
  let playersCreated = 0;
  let statsUpserted = 0;
  let skipped = 0;
  let failed = 0;

  const competition = summary.header?.competitions?.[0];
  const competitors = competition?.competitors ?? [];
  const homeName =
    competitors.find((c) => c.homeAway === "home")?.team?.displayName ??
    competitors.find((c) => c.homeAway === "home")?.team?.name;
  const awayName =
    competitors.find((c) => c.homeAway === "away")?.team?.displayName ??
    competitors.find((c) => c.homeAway === "away")?.team?.name;
  const matchDateRaw = competition?.date;
  const matchDate = matchDateRaw ? new Date(matchDateRaw) : undefined;
  const matchRow = await prisma.match.findFirst({
    where: { externalKey: buildEspnEventKey(espnSlug, eventId) },
    select: { id: true },
  });

  for (const boxScore of boxScores) {
    playersProcessed += 1;

    try {
      await withPrismaRetry(
        async () => {
          const resolved = await resolvePlayerId(
            playerCache,
            boxScore.fullName,
            boxScore.teamName,
            boxScore,
            {
              seasonYear: options.seasonYear,
              competitionLabel: options.competitionLabel,
              createMissingPlayers,
            }
          );

          if (!resolved) {
            skipped += 1;
            return;
          }

          const { id: playerId, created } = resolved;
          if (created) playersCreated += 1;

          const isHome = homeName ? namesLikelyMatch(homeName, boxScore.teamName) : undefined;

          // Appearances first — season aggregate must not block Recent appearances on race errors.
          await upsertPlayerMatchStat({
            playerId,
            externalEventKey: buildEspnEventKey(espnSlug, eventId),
            matchId: matchRow?.id,
            matchDate: matchDate && Number.isFinite(matchDate.getTime()) ? matchDate : undefined,
            competitionLabel: options.competitionLabel,
            teamName: boxScore.teamName,
            opponentName:
              isHome === true ? awayName : isHome === false ? homeName : undefined,
            isHome,
            minutesPlayed: boxScore.minutesPlayed,
            goals: boxScore.goals,
            assists: boxScore.assists,
            tackles: boxScore.tackles,
            interceptions: boxScore.interceptions,
            passesCompleted: boxScore.passesCompleted,
            passesAttempted: boxScore.passesAttempted,
            season: options.seasonYear,
          });

          statsUpserted += 1;

          try {
            await accumulateSeasonStats(playerId, boxScore, options.seasonYear);
          } catch (seasonError) {
            console.warn(
              `[boxscore] season aggregate skip ${espnSlug} ${boxScore.fullName}:`,
              seasonError
            );
          }
        },
        { label: `boxscore:${espnSlug}:${boxScore.fullName}` }
      );
    } catch (error) {
      failed += 1;
      console.warn(`[boxscore] FAIL ${espnSlug} ${boxScore.fullName}:`, error);
    }
  }

  await prisma.systemCache.upsert({
    where: { key: cacheKey },
    create: {
      key: cacheKey,
      json: {
        espnSlug,
        eventId,
        processedAt: new Date().toISOString(),
        playersProcessed,
        statsUpserted,
      },
    },
    update: {
      json: {
        espnSlug,
        eventId,
        processedAt: new Date().toISOString(),
        playersProcessed,
        statsUpserted,
      },
    },
  });

  return {
    matchId: eventId,
    espnSlug,
    playersProcessed,
    playersCreated,
    statsUpserted,
    skipped,
    failed,
    alreadyProcessed: false,
  };
}

/**
 * @deprecated Prefer processMatchBoxScore(espnSlug, eventId, options).
 * Kept for Brasileirão scripts/cron callers.
 */
export async function processMatchBoxScore2026(
  matchId: string,
  options: { force?: boolean } = {}
): Promise<ProcessMatchBoxScoreResult> {
  return processMatchBoxScore(LEGACY_BR_SLUG, matchId, {
    force: options.force,
    seasonYear: LEGACY_BR_SEASON,
    competitionLabel: "Brasileirão Série A",
    createMissingPlayers: true,
  });
}

export { LEGACY_BR_SEASON as BRASILEIRAO_BOXSCORE_SEASON, LEGACY_BR_SLUG as BRASILEIRAO_ESPN_SLUG };
