import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import {
  ESPN_MLS_SEASON_YEAR,
  ESPN_MLS_SLUG,
  MLS_LABEL,
  MLS_SEASON_LABEL,
} from "@/lib/seasons";
import { syncEspnMatchesForCompetition } from "@/lib/api/espn-matches";
import { isStale, MATCH_SYNC_TTL_MS, needsMatchSync } from "@/lib/sync/data-staleness";

const ESPN_STANDINGS = "https://site.api.espn.com/apis/v2/sports/soccer";
const ESPN_SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

/** MLS 2026 expanded to 30 clubs — bootstrap until we hit this floor. */
export const MLS_EXPECTED_CLUBS = 28;

interface EspnStandingsEntry {
  team?: {
    id?: string | number;
    displayName?: string;
    name?: string;
    logo?: string;
    logos?: Array<{ href?: string }>;
  };
}

function teamShortName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function extractLogo(entry: EspnStandingsEntry): string | undefined {
  return entry.team?.logos?.[0]?.href ?? entry.team?.logo ?? undefined;
}

type MlsEspnTeam = { name: string; crestUrl?: string; espnTeamId?: string };

/** Flatten Eastern + Western conference standings into one team list. */
async function fetchEspnMlsTeamsFromStandings(seasonYear: number): Promise<MlsEspnTeam[]> {
  const url = `${ESPN_STANDINGS}/${ESPN_MLS_SLUG}/standings?season=${seasonYear}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "football-intelligence-platform/1.0 (mls-bootstrap)" },
    next: { revalidate: 0 },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    children?: Array<{ standings?: { entries?: EspnStandingsEntry[] } }>;
  };

  const teams: MlsEspnTeam[] = [];
  for (const child of data.children ?? []) {
    for (const entry of child.standings?.entries ?? []) {
      const name = entry.team?.displayName ?? entry.team?.name ?? "";
      if (!name) continue;
      const crestUrl = extractLogo(entry);
      const espnTeamId = entry.team?.id != null ? String(entry.team.id) : undefined;
      teams.push(crestUrl ? { name, crestUrl, espnTeamId } : { name, espnTeamId });
    }
  }
  return teams;
}

/** Full club directory from ESPN site API (preferred when standings lag expansion). */
async function fetchEspnMlsTeamsFromDirectory(): Promise<MlsEspnTeam[]> {
  const url = `${ESPN_SITE}/${ESPN_MLS_SLUG}/teams?limit=50`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "football-intelligence-platform/1.0 (mls-bootstrap)",
      Accept: "application/json",
    },
    next: { revalidate: 0 },
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
    data.sports?.flatMap((s) => s.leagues?.flatMap((l) => l.teams ?? []) ?? []) ?? [];

  return wraps
    .map((wrap): MlsEspnTeam | null => {
      const team = wrap.team;
      const name = team?.displayName ?? team?.name ?? "";
      if (!name || !team?.id) return null;
      return {
        name,
        espnTeamId: team.id,
        crestUrl: team.logos?.[0]?.href,
      };
    })
    .filter((row): row is MlsEspnTeam => row != null);
}

export async function fetchEspnMlsTeams(seasonYear = ESPN_MLS_SEASON_YEAR): Promise<MlsEspnTeam[]> {
  const fromDirectory = await fetchEspnMlsTeamsFromDirectory();
  if (fromDirectory.length >= MLS_EXPECTED_CLUBS) return fromDirectory;

  const fromStandings = await fetchEspnMlsTeamsFromStandings(seasonYear);
  if (fromStandings.length >= fromDirectory.length) return fromStandings;
  return fromDirectory;
}

async function upsertMlsClubsFromEspn(
  competitionId: string,
  espnTeams: MlsEspnTeam[]
): Promise<{ created: number; updated: number }> {
  const prisma = getPrisma();
  const existingTeams = await prisma.team.findMany({
    select: { id: true, name: true, crestUrl: true, country: true, competitionId: true },
  });
  const byName = new Map(
    existingTeams.map((team) => [team.name.toLowerCase(), team] as const)
  );

  let created = 0;
  let updated = 0;
  const toCreate: Array<{
    name: string;
    shortName: string;
    country: string;
    crestUrl?: string;
    competitionId: string;
    dataSyncedSeason: string;
    dataSyncedAt: Date;
  }> = [];

  for (const espnTeam of espnTeams) {
    const existing = byName.get(espnTeam.name.toLowerCase());
    if (existing) {
      await prisma.team.update({
        where: { id: existing.id },
        data: {
          competitionId,
          country: existing.country || "USA",
          crestUrl: espnTeam.crestUrl ?? existing.crestUrl ?? undefined,
          dataSyncedSeason: MLS_SEASON_LABEL,
          dataSyncedAt: new Date(),
        },
      });
      updated += 1;
      continue;
    }

    toCreate.push({
      name: espnTeam.name,
      shortName: teamShortName(espnTeam.name),
      country: "USA",
      crestUrl: espnTeam.crestUrl,
      competitionId,
      dataSyncedSeason: MLS_SEASON_LABEL,
      dataSyncedAt: new Date(),
    });
  }

  if (toCreate.length > 0) {
    await prisma.team.createMany({ data: toCreate, skipDuplicates: true });
    created = toCreate.length;
  }

  return { created, updated };
}

/**
 * Ensures MLS competition exists with espnSlug usa.1 and seeds clubs from ESPN 2026.
 * Pass `forceTeams` to re-pull the full club directory even when some clubs already exist.
 */
export async function ensureMlsCompetition(options?: {
  forceTeams?: boolean;
}): Promise<{ competitionId: string; teamCount: number; espnTeams: number }> {
  if (!canUseDatabase()) {
    return { competitionId: "", teamCount: 0, espnTeams: 0 };
  }

  const prisma = getPrisma();
  const forceTeams = options?.forceTeams === true;

  let competition = await prisma.competition.findFirst({
    where: {
      OR: [
        { espnSlug: ESPN_MLS_SLUG },
        { name: { equals: MLS_LABEL, mode: "insensitive" } },
        { name: { contains: "Major League Soccer", mode: "insensitive" } },
      ],
    },
  });

  if (!competition) {
    competition = await prisma.competition.create({
      data: {
        name: MLS_LABEL,
        country: "USA",
        tier: 1,
        espnSlug: ESPN_MLS_SLUG,
      },
    });
  } else {
    competition = await prisma.competition.update({
      where: { id: competition.id },
      data: {
        name: MLS_LABEL,
        country: "USA",
        espnSlug: ESPN_MLS_SLUG,
      },
    });
  }

  const existingCount = await prisma.team.count({
    where: { competitionId: competition.id },
  });

  const staleSeasonTeams = await prisma.team.count({
    where: {
      competitionId: competition.id,
      NOT: { dataSyncedSeason: MLS_SEASON_LABEL },
    },
  });

  const needsTeamBootstrap =
    forceTeams || existingCount < MLS_EXPECTED_CLUBS || staleSeasonTeams > 0;

  let espnTeamCount = 0;
  if (needsTeamBootstrap) {
    const espnTeams = await fetchEspnMlsTeams(ESPN_MLS_SEASON_YEAR);
    espnTeamCount = espnTeams.length;
    if (espnTeams.length > 0) {
      await upsertMlsClubsFromEspn(competition.id, espnTeams);
    }
  }

  const finishedMatches = await prisma.match.count({
    where: {
      competitionId: competition.id,
      status: "finished",
      seasonLabel: MLS_SEASON_LABEL,
    },
  });

  const latestMatch = await prisma.match.findFirst({
    where: {
      competitionId: competition.id,
      seasonLabel: MLS_SEASON_LABEL,
    },
    orderBy: { updatedAt: "desc" },
    select: { seasonLabel: true, updatedAt: true },
  });

  const staleScheduled = await prisma.match.findFirst({
    where: {
      competitionId: competition.id,
      seasonLabel: MLS_SEASON_LABEL,
      status: { not: "finished" },
      matchDate: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    },
    select: { id: true },
  });

  const shouldSyncFixtures =
    forceTeams ||
    finishedMatches < 10 ||
    needsMatchSync(
      latestMatch?.seasonLabel ?? null,
      MLS_LABEL,
      latestMatch?.updatedAt,
      Boolean(staleScheduled)
    ) ||
    isStale(latestMatch?.updatedAt, MATCH_SYNC_TTL_MS);

  if (shouldSyncFixtures) {
    await syncEspnMatchesForCompetition(MLS_LABEL);
  }

  const teamCount = await prisma.team.count({
    where: { competitionId: competition.id },
  });

  return { competitionId: competition.id, teamCount, espnTeams: espnTeamCount };
}

export { MLS_LABEL, ESPN_MLS_SLUG };
