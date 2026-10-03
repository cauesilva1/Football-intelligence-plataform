/**
 * Canadian Premier League teams + squads via API-Football.
 * Does not write fixtures and is not called from the daily soccer cron.
 */
import { getPrisma } from "@/lib/prisma";
import { isDbSource } from "@/lib/data-source";
import { readSystemCache, writeSystemCache } from "@/lib/system-cache";
import { fetchTeamSquad, fetchTeamsForLeagueSeason } from "@/lib/api-sports";
import type { ApiQuotaTracker } from "@/lib/api-quota";
import { resolvePlayerPhotoUrl } from "@/lib/player-media";
import {
  API_FOOTBALL_CPL_LEAGUE_ID,
  API_FOOTBALL_PLAYER_MEDIA_SEASON,
  CPL_LABEL,
} from "@/lib/seasons";
import {
  mapApiFootballSquadPosition,
  nextCplBackfillStep,
  type CplBackfillStep,
  type CplTeamProgress,
} from "@/lib/sync/cpl-plan";

const CURSOR_KEY = "cpl:backfill:completed";
const MAX_STEPS = 12;

export type CplBackfillStop = "low-quota" | "time-budget" | "complete" | "provider-empty" | "no-database";

export type CplBackfillResult = {
  stopped: CplBackfillStop;
  teamsFetched: boolean;
  squadsFetched: number;
  playersUpserted: number;
};

function teamShortName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function dobFromAge(age: number | null): Date {
  if (age == null || age < 15 || age > 45) return new Date(Date.UTC(2000, 0, 1));
  return new Date(Date.UTC(new Date().getUTCFullYear() - age, 0, 1));
}

async function readCompletedTeamIds(): Promise<number[]> {
  const payload = await readSystemCache<{ completedTeamIds?: number[] }>(CURSOR_KEY);
  return (payload?.completedTeamIds ?? []).filter((id) => Number.isFinite(id));
}

async function writeCompletedTeamIds(completedTeamIds: number[]): Promise<void> {
  await writeSystemCache(CURSOR_KEY, {
    completedTeamIds,
    updatedAt: new Date().toISOString(),
  });
}

async function ensureCompetitionId(): Promise<string> {
  const prisma = getPrisma();
  const existing = await prisma.competition.findFirst({
    where: { name: { equals: CPL_LABEL, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.competition.create({
    data: { name: CPL_LABEL, country: "Canada", tier: 1 },
    select: { id: true },
  });
  return created.id;
}

async function loadTeamProgress(competitionId: string): Promise<CplTeamProgress[]> {
  const teams = await getPrisma().team.findMany({
    where: { competitionId, apiSportsId: { not: null } },
    select: { apiSportsId: true, _count: { select: { players: true } } },
    orderBy: { apiSportsId: "asc" },
  });
  return teams
    .filter((team): team is typeof team & { apiSportsId: number } => team.apiSportsId != null)
    .map((team) => ({ apiSportsId: team.apiSportsId, playerCount: team._count.players }));
}

async function upsertTeams(
  competitionId: string,
  apiTeams: Array<{ id: number; name: string; logo: string | null }>
): Promise<void> {
  const prisma = getPrisma();
  const seasonLabel = String(API_FOOTBALL_PLAYER_MEDIA_SEASON);
  for (const apiTeam of apiTeams) {
    const existing = await prisma.team.findFirst({
      where: {
        OR: [
          { apiSportsId: apiTeam.id },
          {
            competitionId,
            name: { equals: apiTeam.name, mode: "insensitive" },
          },
        ],
      },
      select: { id: true, crestUrl: true },
    });
    const data = {
      name: apiTeam.name,
      shortName: teamShortName(apiTeam.name),
      country: "Canada",
      apiSportsId: apiTeam.id,
      crestUrl: existing?.crestUrl ?? apiTeam.logo ?? undefined,
      competitionId,
      dataSyncedAt: new Date(),
      dataSyncedSeason: seasonLabel,
    };
    if (existing) {
      await prisma.team.update({ where: { id: existing.id }, data });
    } else {
      await prisma.team.create({ data });
    }
  }
}

async function upsertSquad(
  teamApiId: number,
  players: Array<{ id: number; name: string; age: number | null; position: string | null; photo: string | null }>
): Promise<number> {
  const prisma = getPrisma();
  const team = await prisma.team.findFirst({
    where: { apiSportsId: teamApiId },
    select: { id: true },
  });
  if (!team) return 0;

  let saved = 0;
  for (const player of players) {
    const existing = await prisma.player.findFirst({
      where: {
        OR: [
          { apiSportsId: player.id },
          { teamId: team.id, fullName: { equals: player.name, mode: "insensitive" } },
        ],
      },
      select: { id: true, photoUrl: true },
    });
    const photoUrl = resolvePlayerPhotoUrl({
      photoUrl: player.photo ?? existing?.photoUrl,
      apiSportsId: player.id,
      externalPhoto: player.photo,
    });
    const shared = {
      teamId: team.id,
      position: mapApiFootballSquadPosition(player.position),
      photoUrl,
      apiSportsId: player.id,
      sport: "SOCCER",
      league: CPL_LABEL,
      dataSyncedAt: new Date(),
      dataSyncedSeason: String(new Date().getUTCFullYear()),
    };
    if (existing) {
      await prisma.player.update({ where: { id: existing.id }, data: shared });
    } else {
      const knownAs = player.name.split(" ").pop() ?? player.name;
      await prisma.player.create({
        data: {
          ...shared,
          fullName: player.name,
          knownAs,
          dateOfBirth: dobFromAge(player.age),
          nationality: "UNK",
          height: 180,
          weight: 75,
          strengths: [],
          weaknesses: [],
        },
      });
    }
    saved += 1;
  }
  return saved;
}

export async function runCplBackfill(options: {
  deadlineAt: number;
  quota: ApiQuotaTracker;
  now?: () => number;
}): Promise<CplBackfillResult> {
  const result: CplBackfillResult = {
    stopped: "complete",
    teamsFetched: false,
    squadsFetched: 0,
    playersUpserted: 0,
  };
  const now = options.now ?? Date.now;

  if (!isDbSource()) {
    result.stopped = "no-database";
    return result;
  }

  let teamsKnown = false;
  let teams: CplTeamProgress[] = [];
  let competitionId: string | null = null;
  const existingCompetition = await getPrisma().competition.findFirst({
    where: { name: { equals: CPL_LABEL, mode: "insensitive" } },
    select: { id: true },
  });
  if (existingCompetition) {
    competitionId = existingCompetition.id;
    teams = await loadTeamProgress(competitionId);
    teamsKnown = teams.length > 0;
  }

  let completedTeamIds = await readCompletedTeamIds();

  for (let stepIndex = 0; stepIndex < MAX_STEPS; stepIndex += 1) {
    const step: CplBackfillStep = nextCplBackfillStep({
      teamsKnown,
      teams,
      completedTeamIds,
      canSpend: options.quota.canSpend(1),
      pastDeadline: now() >= options.deadlineAt,
    });

    if (step.kind === "stop") {
      result.stopped = step.reason;
      return result;
    }

    if (step.kind === "fetch-teams") {
      const apiTeams = await fetchTeamsForLeagueSeason(
        API_FOOTBALL_CPL_LEAGUE_ID,
        API_FOOTBALL_PLAYER_MEDIA_SEASON
      );
      if (!apiTeams.length) {
        result.stopped = options.quota.isLow() ? "low-quota" : "provider-empty";
        return result;
      }
      competitionId = competitionId ?? (await ensureCompetitionId());
      await upsertTeams(competitionId, apiTeams);
      teams = await loadTeamProgress(competitionId);
      teamsKnown = teams.length > 0;
      result.teamsFetched = true;
      if (!teamsKnown) {
        result.stopped = "provider-empty";
        return result;
      }
      continue;
    }

    const squad = await fetchTeamSquad(step.apiSportsId);
    if (!squad) {
      result.stopped = options.quota.isLow() ? "low-quota" : "provider-empty";
      return result;
    }
    result.playersUpserted += await upsertSquad(step.apiSportsId, squad);
    result.squadsFetched += 1;
    completedTeamIds = [...new Set([...completedTeamIds, step.apiSportsId])];
    await writeCompletedTeamIds(completedTeamIds);
    if (competitionId) teams = await loadTeamProgress(competitionId);
  }

  result.stopped = options.quota.canSpend(1) ? "time-budget" : "low-quota";
  return result;
}
