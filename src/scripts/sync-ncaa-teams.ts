/**
 * NCAA Men's Basketball — ingestão de universidades de elite (Power + Mid-Majors).
 * ~90–105 programas: ACC, Big East, Big Ten, Big 12, SEC, Atlantic 10 e Mountain West.
 *
 * Uso: npm run data:sync-ncaa-teams
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const NCAA_GROUPS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/groups";

/** Power conferences + principais mid-majors competitivos (~93–105 times). */
const ELITE_CONFERENCE_ABBRS = [
  "acc", // Atlantic Coast (inclui ex-Pac-12 como Stanford, Cal, SMU)
  "bige", // Big East
  "big10", // Big Ten
  "big12", // Big 12
  "sec", // SEC
  "atl10", // Atlantic 10
  "mwest", // Mountain West
] as const;

const SPORT = "BASKETBALL";
const LEAGUE = "NCAA";
const COMPETITION_NAME = "NCAA Men's Basketball";
const COMPETITION_SLUG = "mens-college-basketball";

const FETCH_HEADERS: HeadersInit = {
  "User-Agent": "football-intelligence-platform/1.0 (ncaa-teams-sync)",
  Accept: "application/json",
};

interface EspnGroupTeam {
  id: string;
  displayName: string;
  abbreviation: string;
  shortDisplayName?: string;
  logos?: Array<{ href?: string }>;
}

interface EspnConferenceGroup {
  name: string;
  abbreviation: string;
  teams?: EspnGroupTeam[];
}

interface EspnGroupsResponse {
  groups?: Array<{
    children?: EspnConferenceGroup[];
  }>;
}

function loadDotEnv(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

async function fetchEliteNcaTeams(): Promise<{
  teams: EspnGroupTeam[];
  byConference: Record<string, number>;
}> {
  const response = await fetch(NCAA_GROUPS_URL, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(`ESPN NCAA groups HTTP ${response.status}`);
  }

  const payload = (await response.json()) as EspnGroupsResponse;
  const conferences = payload.groups?.[0]?.children ?? [];
  const byConference: Record<string, number> = {};
  const byId = new Map<string, EspnGroupTeam>();

  for (const conference of conferences) {
    const abbr = conference.abbreviation?.toLowerCase();
    if (!abbr || !ELITE_CONFERENCE_ABBRS.includes(abbr as (typeof ELITE_CONFERENCE_ABBRS)[number])) {
      continue;
    }

    const conferenceTeams = (conference.teams ?? []).filter((team) => team.id && team.displayName);
    byConference[conference.name] = conferenceTeams.length;

    for (const team of conferenceTeams) {
      byId.set(team.id, team);
    }
  }

  const teams = [...byId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  return { teams, byConference };
}

async function ensureCompetition(prisma: PrismaClient): Promise<string> {
  const existing = await prisma.competition.findFirst({
    where: { name: COMPETITION_NAME },
    select: { id: true },
  });

  if (existing) return existing.id;

  const created = await prisma.competition.create({
    data: {
      name: COMPETITION_NAME,
      country: "United States",
      tier: 2,
      espnSlug: COMPETITION_SLUG,
    },
    select: { id: true },
  });

  return created.id;
}

async function upsertNcaTeam(
  prisma: PrismaClient,
  competitionId: string,
  espnTeam: EspnGroupTeam
): Promise<"created" | "updated"> {
  const espnTeamId = Number.parseInt(espnTeam.id, 10);
  const logoUrl = espnTeam.logos?.[0]?.href ?? null;

  const existing = await prisma.team.findFirst({
    where: {
      competitionId,
      OR: [
        ...(Number.isFinite(espnTeamId) ? [{ apiSportsId: espnTeamId }] : []),
        { name: espnTeam.displayName },
      ],
    },
    select: { id: true },
  });

  const teamData = {
    name: espnTeam.displayName,
    shortName: espnTeam.abbreviation || espnTeam.displayName.slice(0, 4).toUpperCase(),
    country: "United States",
    crestUrl: logoUrl,
    apiSportsId: Number.isFinite(espnTeamId) ? espnTeamId : null,
    competitionId,
    dataSyncedSeason: `${SPORT}:${LEAGUE}`,
    dataSyncedAt: new Date(),
  };

  if (existing) {
    await prisma.team.upsert({
      where: { id: existing.id },
      update: teamData,
      create: teamData,
    });
    return "updated";
  }

  await prisma.team.create({ data: teamData });
  return "created";
}

async function pruneNonEliteTeams(
  prisma: PrismaClient,
  competitionId: string,
  eliteApiIds: number[]
): Promise<number> {
  const result = await prisma.team.updateMany({
    where: {
      competitionId,
      OR: [{ apiSportsId: null }, { apiSportsId: { notIn: eliteApiIds } }],
    },
    data: { competitionId: null },
  });

  if (result.count > 0) {
    console.log(`[NCAA-SYNC] ${result.count} times fora da elite desvinculados da NCAA.`);
  }

  return result.count;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar o sync.");
  }

  const prisma = new PrismaClient();

  try {
    console.log(`[NCAA-SYNC] Buscando elite ${SPORT} / ${LEAGUE} via conferências ESPN...`);
    const competitionId = await ensureCompetition(prisma);
    const { teams, byConference } = await fetchEliteNcaTeams();

    console.log("[NCAA-SYNC] Conferências incluídas:");
    for (const [name, count] of Object.entries(byConference)) {
      console.log(`  · ${name}: ${count}`);
    }
    console.log(`[NCAA-SYNC] ${teams.length} universidades únicas na lista elite.`);

    const eliteApiIds = teams
      .map((team) => Number.parseInt(team.id, 10))
      .filter((id) => Number.isFinite(id));

    const detached = await pruneNonEliteTeams(prisma, competitionId, eliteApiIds);

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const team of teams) {
      try {
        const result = await upsertNcaTeam(prisma, competitionId, team);
        if (result === "created") created += 1;
        else updated += 1;
      } catch (error) {
        failed += 1;
        console.warn(`[NCAA-SYNC] FAIL ${team.displayName}:`, error);
      }
    }

    console.log(
      `[NCAA-SYNC] Concluído — ${teams.length} elite · ${detached} desvinculados · ${created} novos · ${updated} atualizados · ${failed} falhas`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[NCAA-SYNC] Erro fatal:", error);
  process.exit(1);
});
