import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import {
  footballSeasonLabel,
  resolveFootballHubSeasonYears,
} from "@/lib/api/espn-football-seasons";

const CFB_STANDINGS_URL =
  "https://site.api.espn.com/apis/v2/sports/football/college-football/standings";

/** Power conferences only — same idea as NCAA basketball elite set. */
const ELITE_CONFERENCE_NAMES = [
  "southeastern conference",
  "big ten conference",
  "big 12 conference",
  "atlantic coast conference",
  "pac-12 conference",
  "pac 12 conference",
];

const COMPETITION_NAME = "College Football";
const ESPN_SLUG = "college-football";

interface EspnStandingsEntry {
  team?: {
    id?: string;
    displayName?: string;
    abbreviation?: string;
    logos?: Array<{ href?: string }>;
  };
}

interface EspnConferenceNode {
  name?: string;
  abbreviation?: string;
  standings?: { entries?: EspnStandingsEntry[] };
  children?: EspnConferenceNode[];
}

/**
 * Ensures College Football competition exists and seeds elite programs from ESPN standings.
 * Lightweight — no roster sync. Skips FCS / D-II / D-III dumps.
 */
export async function ensureCfbCompetition(): Promise<void> {
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

  // Elite set is ~70–90; bootstrap only when directory is empty/thin.
  if (existingCount >= 65) return;

  let eliteTeams: Array<{
    id?: string;
    displayName?: string;
    abbreviation?: string;
    logos?: Array<{ href?: string }>;
  }> = [];

  try {
    const response = await fetch(`${CFB_STANDINGS_URL}?season=${pastYear}`, {
      headers: {
        "User-Agent": "football-intelligence-platform/1.0 (cfb-bootstrap)",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { children?: EspnConferenceNode[] };

    for (const conf of data.children ?? []) {
      const name = (conf.name ?? "").toLowerCase();
      if (!ELITE_CONFERENCE_NAMES.some((elite) => name.includes(elite) || elite.includes(name))) {
        // also match by short abbr patterns
        const abbr = (conf.abbreviation ?? "").toLowerCase();
        if (!["sec", "big10", "b10", "big12", "b12", "acc", "pac12", "pac-12"].includes(abbr)) {
          continue;
        }
      }

      const entries = conf.standings?.entries ?? [];
      for (const entry of entries) {
        if (entry.team?.displayName) eliteTeams.push(entry.team);
      }
    }
  } catch (error) {
    console.warn("[cfb-bootstrap] ESPN standings fetch failed:", error);
    return;
  }

  // Dedupe by ESPN id / name
  const seen = new Set<string>();
  eliteTeams = eliteTeams.filter((team) => {
    const key = team.id ?? team.displayName?.toLowerCase() ?? "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

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
    const name = team.displayName?.trim();
    if (!name) continue;

    const espnId = Number.parseInt(team.id ?? "", 10);
    const crestUrl = team.logos?.[0]?.href;
    const shortName = team.abbreviation ?? name.slice(0, 3).toUpperCase();
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

export { COMPETITION_NAME as CFB_LABEL, ESPN_SLUG as CFB_ESPN_SLUG };
