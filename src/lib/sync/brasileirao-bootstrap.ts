import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import { CURRENT_SEASON, ESPN_BRAZIL_SEASON_YEAR } from "@/lib/seasons";

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
 * Ensures Brasileirão competition exists with espnSlug and seeds teams from ESPN (season 2026).
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

  if (existingCount >= 15) return;

  const espnTeams = await fetchEspnStandingsTeams(ESPN_BRAZIL_SEASON_YEAR);
  if (!espnTeams.length) return;

  for (const espnTeam of espnTeams) {
    const existing = await prisma.team.findFirst({
      where: { name: { equals: espnTeam.name, mode: "insensitive" } },
    });

    if (existing) {
      if (existing.competitionId !== competition.id || !existing.crestUrl) {
        await prisma.team.update({
          where: { id: existing.id },
          data: {
            competitionId: competition.id,
            country: "Brazil",
            crestUrl: espnTeam.crestUrl ?? existing.crestUrl ?? undefined,
            dataSyncedSeason: CURRENT_SEASON,
            dataSyncedAt: new Date(),
          },
        });
      }
      continue;
    }

    await prisma.team.create({
      data: {
        name: espnTeam.name,
        shortName: teamShortName(espnTeam.name),
        country: "Brazil",
        crestUrl: espnTeam.crestUrl,
        competitionId: competition.id,
        dataSyncedSeason: CURRENT_SEASON,
        dataSyncedAt: new Date(),
      },
    });
  }
}

export { BRASILEIRAO_NAME, ESPN_SLUG };
