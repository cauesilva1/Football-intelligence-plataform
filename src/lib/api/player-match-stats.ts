import { getPrisma } from "@/lib/prisma";
import { isDbSource } from "@/lib/data-source";
import { computeMatchRating } from "@/lib/scoring/soccer-rating";
import { namesLikelyMatch } from "@/lib/sync/data-staleness";
import type { MatchPlayerBoxScore } from "@/lib/api/espn-boxscore";

export type PlayerMatchStatUpsertInput = {
  playerId: string;
  externalEventKey: string;
  matchId?: string | null;
  matchDate?: Date | null;
  competitionLabel?: string | null;
  teamName?: string | null;
  opponentName?: string | null;
  isHome?: boolean | null;
  minutesPlayed: number;
  goals: number;
  assists: number;
  /** null = provider did not supply the metric */
  tackles: number | null;
  interceptions: number | null;
  passesCompleted: number;
  passesAttempted: number;
  season?: number | null;
  source?: string;
};

export function buildEspnEventKey(espnSlug: string, eventId: string): string {
  return `espn:${espnSlug}:${eventId}`;
}

export async function upsertPlayerMatchStat(input: PlayerMatchStatUpsertInput): Promise<void> {
  if (!isDbSource()) return;

  const prisma = getPrisma();
  const rating = computeMatchRating({
    minutesPlayed: input.minutesPlayed,
    goals: input.goals,
    assists: input.assists,
    tackles: input.tackles ?? 0,
    interceptions: input.interceptions ?? 0,
    passesCompleted: input.passesCompleted,
    passesAttempted: input.passesAttempted,
  });

  // On update: do not overwrite non-null defensive fields with ESPN nulls
  // (API-Football enrichment must survive ESPN re-sync).
  const defensiveUpdate: { tackles?: number | null; interceptions?: number | null } = {};
  if (input.tackles != null) defensiveUpdate.tackles = input.tackles;
  if (input.interceptions != null) defensiveUpdate.interceptions = input.interceptions;

  await prisma.playerMatchStat.upsert({
    where: {
      playerId_externalEventKey: {
        playerId: input.playerId,
        externalEventKey: input.externalEventKey,
      },
    },
    create: {
      playerId: input.playerId,
      externalEventKey: input.externalEventKey,
      matchId: input.matchId ?? undefined,
      matchDate: input.matchDate ?? undefined,
      competitionLabel: input.competitionLabel ?? undefined,
      teamName: input.teamName ?? undefined,
      opponentName: input.opponentName ?? undefined,
      isHome: input.isHome ?? undefined,
      minutesPlayed: input.minutesPlayed,
      goals: input.goals,
      assists: input.assists,
      tackles: input.tackles,
      interceptions: input.interceptions,
      passesCompleted: input.passesCompleted,
      passesAttempted: input.passesAttempted,
      rating: rating ?? undefined,
      season: input.season ?? undefined,
      source: input.source ?? "espn",
    },
    update: {
      matchId: input.matchId ?? undefined,
      matchDate: input.matchDate ?? undefined,
      competitionLabel: input.competitionLabel ?? undefined,
      teamName: input.teamName ?? undefined,
      opponentName: input.opponentName ?? undefined,
      isHome: input.isHome ?? undefined,
      minutesPlayed: input.minutesPlayed,
      goals: input.goals,
      assists: input.assists,
      ...defensiveUpdate,
      passesCompleted: input.passesCompleted,
      passesAttempted: input.passesAttempted,
      rating: rating ?? undefined,
      season: input.season ?? undefined,
      // Keep enriched source tags if present
      ...(input.source ? { source: input.source } : {}),
    },
  });
}

async function resolveExistingPlayerId(fullName: string): Promise<string | null> {
  const prisma = getPrisma();
  const byExact = await prisma.player.findFirst({
    where: {
      sport: "SOCCER",
      OR: [
        { fullName: { equals: fullName, mode: "insensitive" } },
        { knownAs: { equals: fullName, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (byExact) return byExact.id;

  const candidates = await prisma.player.findMany({
    where: { sport: "SOCCER" },
    select: { id: true, fullName: true, knownAs: true },
    take: 800,
  });
  const hit = candidates.find(
    (p) => namesLikelyMatch(p.fullName, fullName) || namesLikelyMatch(p.knownAs, fullName)
  );
  return hit?.id ?? null;
}

export type PersistBoxScoreMeta = {
  espnSlug: string;
  eventId: string;
  matchId?: string | null;
  matchDate?: Date | null;
  competitionLabel?: string | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  season?: number | null;
};

/**
 * Persist boxscore rows for players already in the DB (no create).
 * Used by match detail (lazy) and can complement the Brasileirão sync path.
 */
export async function persistEspnBoxScoresForKnownPlayers(
  boxScores: MatchPlayerBoxScore[],
  meta: PersistBoxScoreMeta
): Promise<{ upserted: number; skipped: number }> {
  if (!isDbSource() || boxScores.length === 0) {
    return { upserted: 0, skipped: boxScores.length };
  }

  const externalEventKey = buildEspnEventKey(meta.espnSlug, meta.eventId);
  let upserted = 0;
  let skipped = 0;

  for (const row of boxScores) {
    if (row.minutesPlayed <= 0 && row.goals === 0 && row.assists === 0) {
      skipped += 1;
      continue;
    }

    const playerId = await resolveExistingPlayerId(row.fullName);
    if (!playerId) {
      skipped += 1;
      continue;
    }

    const isHome =
      meta.homeTeamName != null
        ? namesLikelyMatch(meta.homeTeamName, row.teamName)
        : undefined;
    const opponentName =
      isHome === true
        ? meta.awayTeamName
        : isHome === false
          ? meta.homeTeamName
          : undefined;

    try {
      await upsertPlayerMatchStat({
        playerId,
        externalEventKey,
        matchId: meta.matchId,
        matchDate: meta.matchDate,
        competitionLabel: meta.competitionLabel,
        teamName: row.teamName,
        opponentName: opponentName ?? undefined,
        isHome,
        minutesPlayed: row.minutesPlayed,
        goals: row.goals,
        assists: row.assists,
        tackles: row.tackles,
        interceptions: row.interceptions,
        passesCompleted: row.passesCompleted,
        passesAttempted: row.passesAttempted,
        season: meta.season,
      });
      upserted += 1;
    } catch (error) {
      skipped += 1;
      console.warn(`[player-match-stat] upsert failed ${row.fullName}:`, error);
    }
  }

  return { upserted, skipped };
}
