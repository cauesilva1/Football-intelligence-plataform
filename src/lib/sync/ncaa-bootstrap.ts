import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import { nbaSeasonLabel, resolveNbaHubSeasonYears } from "@/lib/api/espn-nba-leaders";

const NCAA_GROUPS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/groups";

/** Power + mid-majors — same set as CLI sync-ncaa-teams. */
const ELITE_CONFERENCE_ABBRS = new Set([
  "acc",
  "bige",
  "big10",
  "big12",
  "sec",
  "atl10",
  "mwest",
]);

const COMPETITION_NAME = "NCAA Men's Basketball";
const ESPN_SLUG = "mens-college-basketball";

interface EspnGroupTeam {
  id: string;
  displayName: string;
  abbreviation: string;
  logos?: Array<{ href?: string }>;
}

interface EspnConferenceGroup {
  abbreviation?: string;
  teams?: EspnGroupTeam[];
}

/**
 * Ensures NCAA competition exists and seeds elite programs from ESPN groups.
 * Lightweight — no roster sync.
 */
export async function ensureNcaaCompetition(): Promise<void> {
  if (!canUseDatabase()) return;

  const prisma = getPrisma();
  const { pastYear } = resolveNbaHubSeasonYears();
  const seasonLabel = nbaSeasonLabel(pastYear);

  let competition = await prisma.competition.findFirst({
    where: {
      OR: [
        { espnSlug: ESPN_SLUG },
        { name: { equals: COMPETITION_NAME, mode: "insensitive" } },
        { name: { contains: "NCAA", mode: "insensitive" } },
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

  // Elite set is ~90–105; bootstrap only when directory is empty/thin.
  if (existingCount >= 80) return;

  let eliteTeams: EspnGroupTeam[] = [];
  try {
    const response = await fetch(NCAA_GROUPS_URL, {
      headers: {
        "User-Agent": "football-intelligence-platform/1.0 (ncaa-bootstrap)",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return;

    const data = (await response.json()) as {
      groups?: Array<{ children?: EspnConferenceGroup[] }>;
    };
    const conferences = data.groups?.[0]?.children ?? [];
    const seen = new Set<string>();

    for (const conf of conferences) {
      const abbr = conf.abbreviation?.toLowerCase() ?? "";
      if (!ELITE_CONFERENCE_ABBRS.has(abbr)) continue;
      for (const team of conf.teams ?? []) {
        if (!team.displayName || seen.has(team.id)) continue;
        seen.add(team.id);
        eliteTeams.push(team);
      }
    }
  } catch (error) {
    console.warn("[ncaa-bootstrap] ESPN groups fetch failed:", error);
    return;
  }

  if (!eliteTeams.length) return;

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

  for (const team of eliteTeams) {
    const name = team.displayName.trim();
    const espnId = Number.parseInt(team.id, 10);
    const crestUrl = team.logos?.[0]?.href;
    const shortName = team.abbreviation || name.slice(0, 3).toUpperCase();
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

export { COMPETITION_NAME as NCAA_LABEL, ESPN_SLUG as NCAA_ESPN_SLUG };
