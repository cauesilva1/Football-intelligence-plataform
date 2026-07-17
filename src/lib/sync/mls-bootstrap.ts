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

const ESPN_BASE = "https://site.api.espn.com/apis/v2/sports/soccer";

interface EspnStandingsEntry {
  team?: {
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

/** Flatten Eastern + Western conference standings into one team list. */
async function fetchEspnMlsTeams(seasonYear: number): Promise<
  Array<{ name: string; crestUrl?: string }>
> {
  const url = `${ESPN_BASE}/${ESPN_MLS_SLUG}/standings?season=${seasonYear}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "football-intelligence-platform/1.0 (mls-bootstrap)" },
    next: { revalidate: 0 },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    children?: Array<{ standings?: { entries?: EspnStandingsEntry[] } }>;
  };

  const teams: Array<{ name: string; crestUrl?: string }> = [];
  for (const child of data.children ?? []) {
    for (const entry of child.standings?.entries ?? []) {
      const name = entry.team?.displayName ?? entry.team?.name ?? "";
      if (!name) continue;
      const crestUrl = extractLogo(entry);
      teams.push(crestUrl ? { name, crestUrl } : { name });
    }
  }
  return teams;
}

/**
 * Ensures MLS competition exists with espnSlug usa.1 and seeds clubs from ESPN 2026.
 */
export async function ensureMlsCompetition(): Promise<void> {
  if (!canUseDatabase()) return;

  const prisma = getPrisma();

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

  const needsTeamBootstrap = existingCount < 20 || staleSeasonTeams > 0;

  if (needsTeamBootstrap) {
    const espnTeams = await fetchEspnMlsTeams(ESPN_MLS_SEASON_YEAR);
    const existingTeams = await prisma.team.findMany({
      select: { id: true, name: true, crestUrl: true, country: true },
    });
    const byName = new Map(
      existingTeams.map((team) => [team.name.toLowerCase(), team] as const)
    );

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
            competitionId: competition.id,
            country: existing.country || "USA",
            crestUrl: espnTeam.crestUrl ?? existing.crestUrl ?? undefined,
            dataSyncedSeason: MLS_SEASON_LABEL,
            dataSyncedAt: new Date(),
          },
        });
        continue;
      }

      toCreate.push({
        name: espnTeam.name,
        shortName: teamShortName(espnTeam.name),
        country: "USA",
        crestUrl: espnTeam.crestUrl,
        competitionId: competition.id,
        dataSyncedSeason: MLS_SEASON_LABEL,
        dataSyncedAt: new Date(),
      });
    }

    if (toCreate.length > 0) {
      await prisma.team.createMany({ data: toCreate, skipDuplicates: true });
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
}

export { MLS_LABEL, ESPN_MLS_SLUG };
