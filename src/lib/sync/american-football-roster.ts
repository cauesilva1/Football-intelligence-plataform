import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import {
  resolveAmericanFootballLeagueFromCompetition,
  type AmericanFootballLeagueCode,
} from "@/lib/american-football/team-league";
import { footballSeasonLabel, resolveFootballHubSeasonYears } from "@/lib/api/espn-football-seasons";

const ESPN_SITE = "https://site.api.espn.com/apis/site/v2/sports/football";

interface EspnAthlete {
  id?: string;
  displayName?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  jersey?: string;
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  headshot?: { href?: string } | null;
  position?: { abbreviation?: string; name?: string; displayName?: string };
  birthPlace?: { country?: string };
}

function espnSlugForLeague(league: AmericanFootballLeagueCode): string {
  return league === "NFL" ? "nfl" : "college-football";
}

function buildPlayerSlug(fullName: string): string {
  return fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function parsePosition(athlete: EspnAthlete): string {
  return (
    athlete.position?.abbreviation?.trim() ||
    athlete.position?.displayName?.trim() ||
    athlete.position?.name?.trim() ||
    "WR"
  );
}

function inchesToCm(inches?: number): number | null {
  if (!inches || !Number.isFinite(inches)) return null;
  return Math.round(inches * 2.54);
}

function lbsToKg(lbs?: number): number | null {
  if (!lbs || !Number.isFinite(lbs)) return null;
  return Math.round(lbs * 0.453592);
}

function parseDateOfBirth(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function fetchRoster(
  league: AmericanFootballLeagueCode,
  espnTeamId: number
): Promise<EspnAthlete[]> {
  const url = `${ESPN_SITE}/${espnSlugForLeague(league)}/teams/${espnTeamId}/roster`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "football-intelligence-platform/1.0 (af-roster)",
      Accept: "application/json",
    },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) {
    console.warn(`[af-roster] HTTP ${response.status} on ${url}`);
    return [];
  }
  const data = (await response.json()) as {
    athletes?: Array<{ items?: EspnAthlete[] } | EspnAthlete>;
  };

  // ESPN sometimes nests by position groups
  const athletes: EspnAthlete[] = [];
  for (const entry of data.athletes ?? []) {
    if (entry && typeof entry === "object" && "items" in entry && Array.isArray(entry.items)) {
      athletes.push(...entry.items);
    } else if (entry && typeof entry === "object" && "id" in entry) {
      athletes.push(entry as EspnAthlete);
    }
  }
  return athletes;
}

/**
 * Sync roster for one NFL/CFB team when the squad is thin (or force=true).
 * Mass sync uses the CLI script — not the page bootstrap path.
 */
export async function ensureAmericanFootballTeamRoster(options: {
  teamId: string;
  competitionName?: string | null;
  espnTeamId?: number | null;
  minPlayers?: number;
  /** When true, re-fetch even if the squad already looks full. */
  force?: boolean;
}): Promise<number> {
  if (!canUseDatabase()) return 0;

  const league = resolveAmericanFootballLeagueFromCompetition(options.competitionName);
  if (!league || !options.espnTeamId) return 0;

  const prisma = getPrisma();
  const minPlayers = options.minPlayers ?? 20;

  const existingCount = await prisma.player.count({
    where: {
      teamId: options.teamId,
      sport: "AMERICAN_FOOTBALL",
      league,
    },
  });
  if (!options.force && existingCount >= minPlayers) return existingCount;

  let athletes: EspnAthlete[] = [];
  try {
    athletes = await fetchRoster(league, options.espnTeamId);
  } catch (error) {
    console.warn("[af-roster] fetch failed:", error);
    return existingCount;
  }
  if (!athletes.length) return existingCount;

  const { pastYear } = resolveFootballHubSeasonYears();
  const seasonLabel = footballSeasonLabel(pastYear);
  let upserted = 0;

  for (const athlete of athletes) {
    const fullName =
      athlete.fullName?.trim() ||
      athlete.displayName?.trim() ||
      `${athlete.firstName ?? ""} ${athlete.lastName ?? ""}`.trim();
    if (!fullName) continue;

    const espnAthleteId = Number.parseInt(athlete.id ?? "", 10);
    const slug = buildPlayerSlug(fullName);
    const nationality = athlete.birthPlace?.country?.trim() || "United States";

    const existing = await prisma.player.findFirst({
      where: {
        sport: "AMERICAN_FOOTBALL",
        league,
        OR: [
          ...(Number.isFinite(espnAthleteId) ? [{ apiSportsId: espnAthleteId }] : []),
          { fullName },
          { knownAs: slug },
        ],
      },
      select: { id: true },
    });

    const playerData = {
      fullName,
      knownAs: slug,
      dateOfBirth: parseDateOfBirth(athlete.dateOfBirth) ?? new Date("2000-01-01T00:00:00.000Z"),
      nationality,
      position: parsePosition(athlete),
      height: inchesToCm(athlete.height) ?? 185,
      weight: lbsToKg(athlete.weight) ?? 90,
      photoUrl: athlete.headshot?.href ?? null,
      apiSportsId: Number.isFinite(espnAthleteId) ? espnAthleteId : null,
      sport: "AMERICAN_FOOTBALL",
      league,
      teamId: options.teamId,
      dataSyncedSeason: seasonLabel,
      dataSyncedAt: new Date(),
    };

    if (existing) {
      await prisma.player.update({ where: { id: existing.id }, data: playerData });
    } else {
      await prisma.player.create({
        data: {
          ...playerData,
          strengths: [],
          weaknesses: [],
        },
      });
    }
    upserted += 1;
  }

  return existingCount + upserted;
}
