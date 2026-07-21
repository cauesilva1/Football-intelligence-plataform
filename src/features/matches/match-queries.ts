import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import {
  fetchEspnMatchBoxScores,
  type MatchPlayerBoxScore,
} from "@/lib/api/espn-boxscore";
import { persistEspnBoxScoresForKnownPlayers } from "@/lib/api/player-match-stats";
import { isDbSource } from "@/lib/data-source";
import { fetchEspnScoreboard } from "@/lib/api/espn-matches";
import { resolveEspnLeagueBySlug } from "@/lib/crests/espn-standings";
import { fromEspnScoreboardEvent, fromStatsBombMatch } from "@/lib/tournaments/match-normalizer";
import { loadWorldCup2026Matches } from "@/lib/tournaments/world-cup-2026";
import { fetchStatsBombMatches } from "@/lib/statsbomb/fetch-matches";
import { TOURNAMENTS } from "@/lib/statsbomb/constants";
import type { MatchStatus, TournamentMatch } from "@/lib/tournaments/types";

export interface MatchDetailPayload {
  match: TournamentMatch;
  competitionName?: string;
  boxScores: MatchPlayerBoxScore[];
  sourceLabel: string;
}

function parseEspnExternalKey(id: string): { slug: string; eventId: string } | null {
  const match = /^espn:([^:]+):(.+)$/.exec(id);
  if (!match) return null;
  return { slug: match[1], eventId: match[2] };
}

function mapDbStatus(status: string | null | undefined): MatchStatus {
  if (status === "live" || status === "finished" || status === "postponed") return status;
  return "scheduled";
}

async function loadFromDatabase(id: string): Promise<MatchDetailPayload | null> {
  if (!canUseDatabase()) return null;

  const prisma = getPrisma();
  const row = await prisma.match.findFirst({
    where: {
      OR: [{ id }, { externalKey: id }],
    },
    include: {
      homeTeam: { select: { name: true, crestUrl: true } },
      awayTeam: { select: { name: true, crestUrl: true } },
      competition: { select: { name: true, espnSlug: true } },
    },
  });

  if (!row) return null;

  const externalKey = row.externalKey ?? row.id;
  const status = mapDbStatus(row.status);
  const match: TournamentMatch = {
    id: externalKey,
    source: "scraped",
    date: row.matchDate.toISOString().slice(0, 10),
    kickOff: row.matchDate.toISOString(),
    homeTeam: row.homeTeam.name,
    awayTeam: row.awayTeam.name,
    homeScore: status === "scheduled" ? null : row.homeScore,
    awayScore: status === "scheduled" ? null : row.awayScore,
    stageName: row.round ?? "Match",
    stageKey: "group",
    stageOrder: 1,
    stadium: "—",
    status,
    statusLabel:
      status === "live"
        ? "Live"
        : status === "finished"
          ? "Final"
          : status === "postponed"
            ? "Postponed"
            : "Scheduled",
    homeCrestUrl: row.homeTeam.crestUrl ?? undefined,
    awayCrestUrl: row.awayTeam.crestUrl ?? undefined,
  };

  const parsed = parseEspnExternalKey(externalKey);
  const boxScores =
    parsed && (status === "finished" || status === "live")
      ? await fetchEspnMatchBoxScores(parsed.slug, parsed.eventId)
      : [];

  if (parsed && boxScores.length > 0 && isDbSource()) {
    const { resolveEspnSeasonYear } = await import("@/lib/seasons");
    void persistEspnBoxScoresForKnownPlayers(boxScores, {
      espnSlug: parsed.slug,
      eventId: parsed.eventId,
      matchId: row.id,
      matchDate: row.matchDate,
      competitionLabel: row.competition?.name,
      homeTeamName: row.homeTeam.name,
      awayTeamName: row.awayTeam.name,
      season: resolveEspnSeasonYear(row.competition?.name),
    }).catch((error) => {
      console.warn("[match-detail] player match stat persist failed:", error);
    });
  }

  return {
    match,
    competitionName: row.competition?.name,
    boxScores,
    sourceLabel: "ESPN / database",
  };
}

async function loadFromEspnScoreboard(id: string): Promise<MatchDetailPayload | null> {
  const parsed = parseEspnExternalKey(id);
  if (!parsed) return null;

  const league = resolveEspnLeagueBySlug(parsed.slug);
  if (!league) return null;

  try {
    const events = await fetchEspnScoreboard(league.slug, league.competitionLabel, {
      seasonYear: league.preferredSeason,
    });
    const event = events.find((e) => e.externalKey === id);
    if (!event) return null;

    const match = fromEspnScoreboardEvent(event);
    const boxScores =
      match.status === "finished" || match.status === "live"
        ? await fetchEspnMatchBoxScores(parsed.slug, parsed.eventId)
        : [];

    if (boxScores.length > 0 && isDbSource()) {
      void persistEspnBoxScoresForKnownPlayers(boxScores, {
        espnSlug: parsed.slug,
        eventId: parsed.eventId,
        matchDate: match.kickOff ? new Date(match.kickOff) : undefined,
        competitionLabel: league.competitionLabel,
        homeTeamName: match.homeTeam,
        awayTeamName: match.awayTeam,
        season: league.preferredSeason,
      }).catch((error) => {
        console.warn("[match-detail] player match stat persist failed:", error);
      });
    }

    return {
      match,
      competitionName: league.competitionLabel,
      boxScores,
      sourceLabel: "ESPN scoreboard",
    };
  } catch (error) {
    console.warn(`[match-detail] ESPN scoreboard lookup failed for ${id}:`, error);
    return null;
  }
}

async function findWorldCupJsonMatch(id: string): Promise<TournamentMatch | null> {
  const raw = await loadWorldCup2026Matches();
  const mapped = raw.map((m) => fromStatsBombMatch(m, "scraped"));
  return mapped.find((m) => m.id === id || m.id === decodeURIComponent(id)) ?? null;
}

async function loadFromWorldCupJson(id: string): Promise<MatchDetailPayload | null> {
  const match = await findWorldCupJsonMatch(id);
  if (!match) return null;

  const parsed = parseEspnExternalKey(match.id);
  const boxScores =
    parsed && (match.status === "finished" || match.status === "live")
      ? await fetchEspnMatchBoxScores(parsed.slug, parsed.eventId)
      : [];

  return {
    match,
    competitionName: "FIFA World Cup",
    boxScores,
    sourceLabel: "World Cup 2026 JSON",
  };
}

async function loadFromStatsBomb(id: string): Promise<MatchDetailPayload | null> {
  if (!id.startsWith("sb-")) return null;
  const numericId = Number(id.replace(/^sb-/, ""));
  if (!Number.isFinite(numericId)) return null;

  for (const tournament of TOURNAMENTS) {
    if (
      tournament.source !== "statsbomb" ||
      tournament.competitionId == null ||
      tournament.seasonId == null
    ) {
      continue;
    }
    try {
      const raw = await fetchStatsBombMatches(tournament.competitionId, tournament.seasonId);
      const found = raw.find((m) => m.match_id === numericId);
      if (!found) continue;
      return {
        match: fromStatsBombMatch(found),
        competitionName: tournament.label,
        boxScores: [],
        sourceLabel: "StatsBomb Open Data",
      };
    } catch {
      continue;
    }
  }

  return null;
}

async function loadWorldCupFromHealthyDb(id: string): Promise<MatchDetailPayload | null> {
  if (!canUseDatabase()) return null;

  const prisma = getPrisma();
  const row = await prisma.match.findFirst({
    where: { OR: [{ id }, { externalKey: id }] },
    include: {
      homeTeam: { select: { name: true, crestUrl: true, competitionId: true } },
      awayTeam: { select: { name: true, crestUrl: true, competitionId: true } },
      competition: { select: { id: true, name: true, espnSlug: true } },
    },
  });

  if (!row || row.competition?.espnSlug !== "fifa.world") return null;

  const wcCompetitionId = row.competition.id;
  // Reject rows still linked to club teams (pre-v2 seed).
  if (
    row.homeTeam.competitionId !== wcCompetitionId ||
    row.awayTeam.competitionId !== wcCompetitionId
  ) {
    return null;
  }

  const externalKey = row.externalKey ?? row.id;
  const status = mapDbStatus(row.status);
  const match: TournamentMatch = {
    id: externalKey,
    source: "scraped",
    date: row.matchDate.toISOString().slice(0, 10),
    kickOff: row.matchDate.toISOString(),
    homeTeam: row.homeTeam.name,
    awayTeam: row.awayTeam.name,
    homeScore: status === "scheduled" ? null : row.homeScore,
    awayScore: status === "scheduled" ? null : row.awayScore,
    stageName: row.round ?? "Match",
    stageKey: "group",
    stageOrder: 1,
    stadium: "—",
    status,
    statusLabel:
      status === "live"
        ? "Live"
        : status === "finished"
          ? "Final"
          : status === "postponed"
            ? "Postponed"
            : "Scheduled",
    homeCrestUrl: row.homeTeam.crestUrl ?? undefined,
    awayCrestUrl: row.awayTeam.crestUrl ?? undefined,
  };

  const parsed = parseEspnExternalKey(externalKey);
  const boxScores =
    parsed && (status === "finished" || status === "live")
      ? await fetchEspnMatchBoxScores(parsed.slug, parsed.eventId)
      : [];

  return {
    match,
    competitionName: row.competition.name,
    boxScores,
    sourceLabel: "ESPN / database",
  };
}

export async function resolveMatchDetail(rawId: string): Promise<MatchDetailPayload | null> {
  const id = decodeURIComponent(rawId);

  if (parseEspnExternalKey(id)?.slug === "fifa.world") {
    const fromHealthyDb = await loadWorldCupFromHealthyDb(id);
    if (fromHealthyDb) return fromHealthyDb;

    const fromWc = await loadFromWorldCupJson(id);
    if (fromWc) return fromWc;
  }

  if (id.startsWith("sb-")) {
    const fromWc = await loadFromWorldCupJson(id);
    if (fromWc) return fromWc;
  }

  const fromDb = await loadFromDatabase(id);
  if (fromDb) return fromDb;

  const fromEspn = await loadFromEspnScoreboard(id);
  if (fromEspn) return fromEspn;

  return loadFromStatsBomb(id);
}

/** Lightweight title for metadata — skips ESPN boxscore. */
export async function resolveMatchTitle(rawId: string): Promise<string | null> {
  const id = decodeURIComponent(rawId);

  if (parseEspnExternalKey(id)?.slug === "fifa.world") {
    const fromHealthyDb = await loadWorldCupFromHealthyDb(id);
    if (fromHealthyDb) {
      return `${fromHealthyDb.match.homeTeam} vs ${fromHealthyDb.match.awayTeam}`;
    }
    const match = await findWorldCupJsonMatch(id);
    if (match) return `${match.homeTeam} vs ${match.awayTeam}`;
  }

  if (!canUseDatabase()) return null;

  const row = await getPrisma().match.findFirst({
    where: { OR: [{ id }, { externalKey: id }] },
    select: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  });

  if (!row) return null;
  return `${row.homeTeam.name} vs ${row.awayTeam.name}`;
}
