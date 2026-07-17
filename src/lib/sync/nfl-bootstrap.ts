import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import {
  footballSeasonLabel,
  resolveFootballHubSeasonYears,
} from "@/lib/api/espn-football-seasons";

const NFL_TEAMS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=40";

const COMPETITION_NAME = "NFL";
const ESPN_SLUG = "nfl";

interface EspnTeamEntry {
  team?: {
    id?: string;
    displayName?: string;
    abbreviation?: string;
    logos?: Array<{ href?: string }>;
  };
}

/**
 * Ensures NFL competition exists and seeds 32 franchises from ESPN.
 * Lightweight — no roster sync.
 */
export async function ensureNflCompetition(): Promise<void> {
  if (!canUseDatabase()) return;

  const prisma = getPrisma();
  const { pastYear } = resolveFootballHubSeasonYears();
  const seasonLabel = footballSeasonLabel(pastYear);

  let competition = await prisma.competition.findFirst({
    where: {
      OR: [
        { espnSlug: ESPN_SLUG },
        { name: { equals: COMPETITION_NAME, mode: "insensitive" } },
      ],
    },
  });

  if (!competition) {
    competition = await prisma.competition.create({
      data: {
        name: COMPETITION_NAME,
        country: "United States",
        tier: 1,
        espnSlug: ESPN_SLUG,
      },
    });
  } else if (competition.espnSlug !== ESPN_SLUG) {
    competition = await prisma.competition.update({
      where: { id: competition.id },
      data: { espnSlug: ESPN_SLUG, name: COMPETITION_NAME },
    });
  }

  const existingCount = await prisma.team.count({
    where: { competitionId: competition.id },
  });

  if (existingCount >= 30) return;

  let entries: EspnTeamEntry[] = [];
  try {
    const response = await fetch(NFL_TEAMS_URL, {
      headers: {
        "User-Agent": "football-intelligence-platform/1.0 (nfl-bootstrap)",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return;
    const data = (await response.json()) as {
      sports?: Array<{ leagues?: Array<{ teams?: EspnTeamEntry[] }> }>;
    };
    entries = data.sports?.[0]?.leagues?.[0]?.teams ?? [];
  } catch (error) {
    console.warn("[nfl-bootstrap] ESPN teams fetch failed:", error);
    return;
  }

  const existingTeams = await prisma.team.findMany({
    where: { competitionId: competition.id },
    select: { id: true, name: true, crestUrl: true, apiSportsId: true },
  });
  const byName = new Map(existingTeams.map((t) => [t.name.toLowerCase(), t] as const));
  const byApiId = new Map(
    existingTeams
      .filter((t) => t.apiSportsId != null)
      .map((t) => [t.apiSportsId!, t] as const)
  );

  const toCreate: Array<{
    name: string;
    shortName: string;
    country: string;
    crestUrl?: string;
    apiSportsId?: number;
    competitionId: string;
    dataSyncedSeason: string;
    dataSyncedAt: Date;
  }> = [];

  for (const entry of entries) {
    const team = entry.team;
    const name = team?.displayName?.trim();
    if (!name) continue;

    const espnId = Number.parseInt(team?.id ?? "", 10);
    const crestUrl = team?.logos?.[0]?.href;
    const shortName = team?.abbreviation ?? name.slice(0, 3).toUpperCase();
    const existing =
      (Number.isFinite(espnId) ? byApiId.get(espnId) : undefined) ??
      byName.get(name.toLowerCase());

    if (existing) {
      await prisma.team.update({
        where: { id: existing.id },
        data: {
          competitionId: competition.id,
          shortName,
          crestUrl: crestUrl ?? existing.crestUrl ?? undefined,
          apiSportsId: Number.isFinite(espnId) ? espnId : undefined,
          dataSyncedSeason: seasonLabel,
          dataSyncedAt: new Date(),
        },
      });
      continue;
    }

    toCreate.push({
      name,
      shortName,
      country: "United States",
      crestUrl,
      apiSportsId: Number.isFinite(espnId) ? espnId : undefined,
      competitionId: competition.id,
      dataSyncedSeason: seasonLabel,
      dataSyncedAt: new Date(),
    });
  }

  if (toCreate.length > 0) {
    await prisma.team.createMany({ data: toCreate, skipDuplicates: true });
  }
}

export { COMPETITION_NAME as NFL_LABEL, ESPN_SLUG as NFL_ESPN_SLUG };
