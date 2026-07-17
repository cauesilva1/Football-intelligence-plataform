import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import { BRAZIL_SEASON_LABEL, ESPN_BRAZIL_SEASON_YEAR } from "@/lib/seasons";
import { syncBrasileiraoHistoricalMatches } from "@/lib/api/espn-matches";
import { isStale, MATCH_SYNC_TTL_MS, needsMatchSync } from "@/lib/sync/data-staleness";

const ESPN_BASE = "https://site.api.espn.com/apis/v2/sports/soccer";
const BRASILEIRAO_NAME = "Brasileirão Série A";
const ESPN_SLUG = "bra.1";

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

async function fetchEspnStandingsTeams(seasonYear: number): Promise<
  Array<{ name: string; crestUrl?: string }>
> {
  const url = `${ESPN_BASE}/${ESPN_SLUG}/standings?season=${seasonYear}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "football-intelligence-platform/1.0 (brasileirao-bootstrap)" },
    next: { revalidate: 0 },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    children?: Array<{ standings?: { entries?: EspnStandingsEntry[] } }>;
  };

  return (data.children?.[0]?.standings?.entries ?? [])
    .map((entry) => {
      const name = entry.team?.displayName ?? entry.team?.name ?? "";
      if (!name) return null;
      const crestUrl = extractLogo(entry);
      return crestUrl ? { name, crestUrl } : { name };
    })
    .filter((row): row is { name: string; crestUrl?: string } => row != null);
}

/**
 * Ensures Brasileirão competition exists with espnSlug and seeds teams from ESPN season 2026.
 * Ingests fixtures from the 2026 campaign to unlock `/teams` with live standings data.
 */
export async function ensureBrasileiraoCompetition(): Promise<void> {
  if (!canUseDatabase()) return;

  const prisma = getPrisma();

  let competition = await prisma.competition.findFirst({
    where: {
      OR: [
        { name: { contains: "Brasileir", mode: "insensitive" } },
        { espnSlug: ESPN_SLUG },
      ],
    },
  });

  if (!competition) {
    competition = await prisma.competition.create({
      data: {
        name: BRASILEIRAO_NAME,
        country: "Brazil",
        tier: 1,
        espnSlug: ESPN_SLUG,
      },
    });
  } else {
    competition = await prisma.competition.update({
      where: { id: competition.id },
      data: {
        name: BRASILEIRAO_NAME,
        country: "Brazil",
        espnSlug: ESPN_SLUG,
      },
    });
  }

  const existingCount = await prisma.team.count({
    where: { competitionId: competition.id },
  });

  const staleSeasonTeams = await prisma.team.count({
    where: {
      competitionId: competition.id,
      NOT: { dataSyncedSeason: BRAZIL_SEASON_LABEL },
    },
  });

  const needsTeamBootstrap = existingCount < 15 || staleSeasonTeams > 0;

  if (needsTeamBootstrap) {
    const espnTeams = await fetchEspnStandingsTeams(ESPN_BRAZIL_SEASON_YEAR);
    if (espnTeams.length) {
      const existingTeams = await prisma.team.findMany({
        select: { id: true, name: true, crestUrl: true },
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
              country: "Brazil",
              crestUrl: espnTeam.crestUrl ?? existing.crestUrl ?? undefined,
              dataSyncedSeason: BRAZIL_SEASON_LABEL,
              dataSyncedAt: new Date(),
            },
          });
          continue;
        }

        toCreate.push({
          name: espnTeam.name,
          shortName: teamShortName(espnTeam.name),
          country: "Brazil",
          crestUrl: espnTeam.crestUrl,
          competitionId: competition.id,
          dataSyncedSeason: BRAZIL_SEASON_LABEL,
          dataSyncedAt: new Date(),
        });
      }

      if (toCreate.length > 0) {
        await prisma.team.createMany({ data: toCreate, skipDuplicates: true });
      }
    }
  }

  const finishedMatches = await prisma.match.count({
    where: {
      competitionId: competition.id,
      status: "finished",
      seasonLabel: BRAZIL_SEASON_LABEL,
    },
  });

  const latestMatch = await prisma.match.findFirst({
    where: {
      competitionId: competition.id,
      seasonLabel: BRAZIL_SEASON_LABEL,
    },
    orderBy: { updatedAt: "desc" },
    select: { seasonLabel: true, updatedAt: true },
  });

  const staleScheduled = await prisma.match.findFirst({
    where: {
      competitionId: competition.id,
      seasonLabel: BRAZIL_SEASON_LABEL,
      status: { not: "finished" },
      matchDate: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    },
    select: { id: true },
  });

  const shouldSyncFixtures =
    finishedMatches < 20 ||
    needsMatchSync(
      latestMatch?.seasonLabel ?? null,
      BRASILEIRAO_NAME,
      latestMatch?.updatedAt,
      Boolean(staleScheduled)
    ) ||
    isStale(latestMatch?.updatedAt, MATCH_SYNC_TTL_MS);

  if (shouldSyncFixtures) {
    await syncBrasileiraoHistoricalMatches();
  }
}

export { BRASILEIRAO_NAME, ESPN_SLUG };
