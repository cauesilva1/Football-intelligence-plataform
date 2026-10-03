/**
 * NWSL teams + rosters from ESPN.
 * Does not write fixtures and is not called from the daily soccer cron.
 */
import { persistSquadFromEspn } from "@/features/scouting/repository/club.repository.prisma";
import { fetchEspnRosterByTeamId } from "@/lib/api/espn-roster";
import { isDbSource } from "@/lib/data-source";
import { getPrisma } from "@/lib/prisma";
import { ESPN_NWSL_SLUG, NWSL_LABEL, NWSL_SEASON_LABEL } from "@/lib/seasons";
import { readSystemCache, writeSystemCache } from "@/lib/system-cache";
import {
  nextNwslBackfillStep,
  type NwslBackfillStep,
  type NwslTeamProgress,
} from "@/lib/sync/nwsl-plan";

const ESPN_TEAMS_URL = `https://site.api.espn.com/apis/site/v2/sports/soccer/${ESPN_NWSL_SLUG}/teams?limit=40`;
const DIRECTORY_KEY = "nwsl:espn-teams";
const CURSOR_KEY = "nwsl:backfill:completed";
const MAX_STEPS = 20;

type EspnClub = { id: string; name: string; crestUrl?: string };

export type NwslBackfillStop = "time-budget" | "complete" | "provider-empty" | "no-database";

export type NwslBackfillResult = {
  stopped: NwslBackfillStop;
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

async function readCompletedTeamIds(): Promise<string[]> {
  const payload = await readSystemCache<{ completedTeamIds?: string[] }>(CURSOR_KEY);
  return (payload?.completedTeamIds ?? []).filter((id) => typeof id === "string" && id.length > 0);
}

async function writeCompletedTeamIds(completedTeamIds: string[]): Promise<void> {
  await writeSystemCache(CURSOR_KEY, {
    completedTeamIds,
    updatedAt: new Date().toISOString(),
  });
}

async function readDirectory(): Promise<EspnClub[]> {
  const payload = await readSystemCache<{ teams?: EspnClub[] }>(DIRECTORY_KEY);
  return (payload?.teams ?? []).filter((team) => team.id && team.name);
}

async function fetchEspnDirectory(): Promise<EspnClub[]> {
  const response = await fetch(ESPN_TEAMS_URL, {
    headers: {
      "User-Agent": "football-intelligence-platform/1.0 (nwsl-sync)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return [];
  const data = (await response.json()) as {
    sports?: Array<{
      leagues?: Array<{
        teams?: Array<{
          team?: {
            id?: string;
            displayName?: string;
            name?: string;
            logos?: Array<{ href?: string }>;
          };
        }>;
      }>;
    }>;
  };
  const wraps =
    data.sports?.flatMap((sport) => sport.leagues?.flatMap((league) => league.teams ?? []) ?? []) ??
    [];
  const clubs: EspnClub[] = [];
  for (const wrap of wraps) {
    const team = wrap.team;
    const name = team?.displayName ?? team?.name ?? "";
    if (!team?.id || !name) continue;
    const crestUrl = team.logos?.[0]?.href;
    clubs.push(crestUrl ? { id: team.id, name, crestUrl } : { id: team.id, name });
  }
  return clubs;
}

async function ensureCompetitionId(): Promise<string> {
  const prisma = getPrisma();
  const existing = await prisma.competition.findFirst({
    where: {
      OR: [
        { espnSlug: ESPN_NWSL_SLUG },
        { name: { equals: NWSL_LABEL, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (existing) {
    await prisma.competition.update({
      where: { id: existing.id },
      data: { name: NWSL_LABEL, country: "USA", espnSlug: ESPN_NWSL_SLUG },
    });
    return existing.id;
  }
  const created = await prisma.competition.create({
    data: { name: NWSL_LABEL, country: "USA", tier: 1, espnSlug: ESPN_NWSL_SLUG },
    select: { id: true },
  });
  return created.id;
}

async function upsertClubs(competitionId: string, clubs: readonly EspnClub[]): Promise<void> {
  const prisma = getPrisma();
  for (const club of clubs) {
    const existing = await prisma.team.findFirst({
      where: {
        competitionId,
        name: { equals: club.name, mode: "insensitive" },
      },
      select: { id: true, crestUrl: true },
    });
    const data = {
      name: club.name,
      shortName: teamShortName(club.name),
      country: "USA",
      crestUrl: existing?.crestUrl ?? club.crestUrl,
      competitionId,
      dataSyncedAt: new Date(),
      dataSyncedSeason: NWSL_SEASON_LABEL,
    };
    if (existing) {
      await prisma.team.update({ where: { id: existing.id }, data });
    } else {
      await prisma.team.create({ data });
    }
  }
}

async function loadTeamProgress(clubs: readonly EspnClub[]): Promise<NwslTeamProgress[]> {
  if (clubs.length === 0) return [];
  const prisma = getPrisma();
  const competition = await prisma.competition.findFirst({
    where: { espnSlug: ESPN_NWSL_SLUG },
    select: { id: true },
  });
  if (!competition) {
    return clubs.map((club) => ({ espnTeamId: club.id, playerCount: 0 }));
  }
  const teams = await prisma.team.findMany({
    where: { competitionId: competition.id },
    select: { name: true, _count: { select: { players: true } } },
  });
  const counts = new Map(teams.map((team) => [team.name.toLowerCase(), team._count.players]));
  return clubs.map((club) => ({
    espnTeamId: club.id,
    playerCount: counts.get(club.name.toLowerCase()) ?? 0,
  }));
}

async function teamIdForEspnClub(club: EspnClub): Promise<string | null> {
  const team = await getPrisma().team.findFirst({
    where: {
      competition: { espnSlug: ESPN_NWSL_SLUG },
      name: { equals: club.name, mode: "insensitive" },
    },
    select: { id: true },
  });
  return team?.id ?? null;
}

export async function runNwslBackfill(options: {
  deadlineAt: number;
  now?: () => number;
}): Promise<NwslBackfillResult> {
  const result: NwslBackfillResult = {
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

  let clubs = await readDirectory();
  let teamsKnown = clubs.length > 0;
  let teams = teamsKnown ? await loadTeamProgress(clubs) : [];
  let completedTeamIds = await readCompletedTeamIds();

  for (let stepIndex = 0; stepIndex < MAX_STEPS; stepIndex += 1) {
    const step: NwslBackfillStep = nextNwslBackfillStep({
      teamsKnown,
      teams,
      completedTeamIds,
      pastDeadline: now() >= options.deadlineAt,
    });

    if (step.kind === "stop") {
      result.stopped = step.reason;
      return result;
    }

    if (step.kind === "fetch-teams") {
      const fetched = await fetchEspnDirectory();
      if (fetched.length === 0) {
        result.stopped = "provider-empty";
        return result;
      }
      const competitionId = await ensureCompetitionId();
      await upsertClubs(competitionId, fetched);
      await writeSystemCache(DIRECTORY_KEY, { teams: fetched });
      clubs = fetched;
      teams = await loadTeamProgress(clubs);
      teamsKnown = teams.length > 0;
      result.teamsFetched = true;
      if (!teamsKnown) {
        result.stopped = "provider-empty";
        return result;
      }
      continue;
    }

    const club = clubs.find((entry) => entry.id === step.espnTeamId);
    if (!club) {
      completedTeamIds = [...new Set([...completedTeamIds, step.espnTeamId])];
      await writeCompletedTeamIds(completedTeamIds);
      continue;
    }

    const squad = await fetchEspnRosterByTeamId(ESPN_NWSL_SLUG, step.espnTeamId);
    if (squad.length === 0) {
      result.stopped = "provider-empty";
      return result;
    }
    const dbTeamId = await teamIdForEspnClub(club);
    if (!dbTeamId) {
      result.stopped = "provider-empty";
      return result;
    }
    result.playersUpserted += await persistSquadFromEspn(dbTeamId, squad, NWSL_LABEL);
    result.squadsFetched += 1;
    completedTeamIds = [...new Set([...completedTeamIds, step.espnTeamId])];
    await writeCompletedTeamIds(completedTeamIds);
    teams = await loadTeamProgress(clubs);
  }

  result.stopped = "time-budget";
  return result;
}
