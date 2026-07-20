import { getPrisma } from "@/lib/prisma";
import { namesLikelyMatch } from "@/lib/sync/data-staleness";

const SEASON = 2026;
const ESPN_SLUG = "bra.1";
const BOXSCORE_CACHE_PREFIX = `espn:${ESPN_SLUG}:boxscore:${SEASON}:`;

export interface MatchPlayerBoxScore {
  espnAthleteId: string;
  fullName: string;
  teamName: string;
  goals: number;
  assists: number;
  tackles: number;
  interceptions: number;
  passesCompleted: number;
  passesAttempted: number;
  minutesPlayed: number;
}

export interface ProcessMatchBoxScoreResult {
  matchId: string;
  playersProcessed: number;
  playersCreated: number;
  statsUpserted: number;
  skipped: number;
  failed: number;
  alreadyProcessed: boolean;
}

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
        tackles: statValue(stats, "tacklesWon", "tackles", "totalTackles"),
        interceptions: statValue(stats, "interceptions"),
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
  espnSlug: string = ESPN_SLUG
): Promise<EspnSummaryResponse> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnSlug}/summary?event=${encodeURIComponent(matchId)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "football-intelligence-platform/1.0 (brasileirao-boxscore)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`ESPN summary HTTP ${response.status} for match ${matchId}`);
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

async function findTeamIdByName(teamName: string): Promise<string | null> {
  const prisma = getPrisma();
  const teams = await prisma.team.findMany({
    where: {
      competition: { name: { contains: "Brasileir", mode: "insensitive" } },
    },
    select: { id: true, name: true, shortName: true },
  });

  const team =
    teams.find((entry) => namesLikelyMatch(entry.name, teamName)) ??
    teams.find((entry) => namesLikelyMatch(entry.shortName, teamName));

  return team?.id ?? null;
}

async function resolvePlayerId(
  cache: Map<string, PlayerRef>,
  fullName: string,
  teamName: string,
  boxScore: MatchPlayerBoxScore
): Promise<{ id: string; created: boolean }> {
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
      where: { fullName },
      select: { id: true, fullName: true, knownAs: true },
    })) ??
    (await prisma.player.findFirst({
      where: { knownAs: slug },
      select: { id: true, fullName: true, knownAs: true },
    }));

  if (existing) {
    cache.set(fullName.toLowerCase(), existing);
    cache.set(slug, existing);
    return { id: existing.id, created: false };
  }

  const teamId = await findTeamIdByName(teamName);
  const created = await prisma.player.create({
    data: {
      fullName,
      knownAs: slug,
      dateOfBirth: new Date(Date.UTC(2000, 0, 1)),
      nationality: "Brazil",
      position: inferPosition(
        boxScore.goals,
        boxScore.assists,
        boxScore.tackles,
        boxScore.interceptions
      ),
      height: 180,
      weight: 75,
      strengths: [],
      weaknesses: [],
      teamId,
      dataSyncedSeason: String(SEASON),
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
  boxScore: MatchPlayerBoxScore
): Promise<void> {
  const prisma = getPrisma();
  const existing = await prisma.playerSeasonStats.findUnique({
    where: {
      playerId_season: {
        playerId,
        season: SEASON,
      },
    },
  });

  const matchPassAccuracy = matchPassingAccuracy(
    boxScore.passesCompleted,
    boxScore.passesAttempted
  );

  if (!existing) {
    await prisma.playerSeasonStats.create({
      data: {
        playerId,
        season: SEASON,
        goals: boxScore.goals,
        assists: boxScore.assists,
        tackles: boxScore.tackles,
        interceptions: boxScore.interceptions,
        minutesPlayed: boxScore.minutesPlayed,
        matchesPlayed: 1,
        passingAccuracy: matchPassAccuracy,
      },
    });
    return;
  }

  await prisma.playerSeasonStats.update({
    where: {
      playerId_season: {
        playerId,
        season: SEASON,
      },
    },
    data: {
      goals: existing.goals + boxScore.goals,
      assists: existing.assists + boxScore.assists,
      tackles: existing.tackles + boxScore.tackles,
      interceptions: existing.interceptions + boxScore.interceptions,
      minutesPlayed: existing.minutesPlayed + boxScore.minutesPlayed,
      matchesPlayed: existing.matchesPlayed + 1,
      passingAccuracy: combinePassingAccuracy(
        existing.passingAccuracy,
        existing.matchesPlayed,
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

/**
 * Processa o box score oficial da ESPN e acumula estatísticas reais na temporada 2026.
 */
export async function processMatchBoxScore2026(
  matchId: string,
  options: { force?: boolean } = {}
): Promise<ProcessMatchBoxScoreResult> {
  const prisma = getPrisma();
  const cacheKey = `${BOXSCORE_CACHE_PREFIX}${matchId}`;

  if (!options.force) {
    const cached = await prisma.systemCache.findUnique({ where: { key: cacheKey } });
    if (cached) {
      return {
        matchId,
        playersProcessed: 0,
        playersCreated: 0,
        statsUpserted: 0,
        skipped: 0,
        failed: 0,
        alreadyProcessed: true,
      };
    }
  }

  const summary = await fetchMatchSummary(matchId);
  if (!isMatchFinished(summary)) {
    throw new Error(`Partida ${matchId} ainda não finalizada na ESPN — aguarde o término do jogo.`);
  }

  const boxScores = extractMatchPlayerBoxScores(summary);
  const playerCache = new Map<string, PlayerRef>();

  let playersProcessed = 0;
  let playersCreated = 0;
  let statsUpserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const boxScore of boxScores) {
    playersProcessed += 1;

    try {
      const { id: playerId, created } = await resolvePlayerId(
        playerCache,
        boxScore.fullName,
        boxScore.teamName,
        boxScore
      );

      if (created) playersCreated += 1;

      await accumulateSeasonStats(playerId, boxScore);
      statsUpserted += 1;
    } catch (error) {
      failed += 1;
      console.warn(`[boxscore-2026] FAIL ${boxScore.fullName}:`, error);
    }
  }

  await prisma.systemCache.upsert({
    where: { key: cacheKey },
    create: {
      key: cacheKey,
      json: {
        matchId,
        processedAt: new Date().toISOString(),
        playersProcessed,
        statsUpserted,
      },
    },
    update: {
      json: {
        matchId,
        processedAt: new Date().toISOString(),
        playersProcessed,
        statsUpserted,
      },
    },
  });

  return {
    matchId,
    playersProcessed,
    playersCreated,
    statsUpserted,
    skipped,
    failed,
    alreadyProcessed: false,
  };
}

export { SEASON as BRASILEIRAO_BOXSCORE_SEASON, ESPN_SLUG as BRASILEIRAO_ESPN_SLUG };
