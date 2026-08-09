/**
 * Fill Brasileirão clubs whose ESPN directory still points at bra.2 (Ceará, Fortaleza, etc.).
 *
 *   npx tsx src/scripts/fill-bra-missing-rosters.ts
 */
import fs from "fs";
import path from "path";
import { getPrisma } from "@/lib/prisma";
import { persistSquadFromEspn } from "@/features/scouting/repository/club.repository.prisma";
import { BRAZIL_SEASON_LABEL } from "@/lib/seasons";
import { BRASILEIRAO_NAME } from "@/lib/sync/brasileirao-bootstrap";
import type { EspnRosterPlayer } from "@/lib/api/espn-roster";

function loadDotEnv(): void {
  for (const file of [".env", ".env.local"]) {
    const envPath = path.join(process.cwd(), file);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
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
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

loadDotEnv();

const ESPN_SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

const TARGETS = [
  { name: "Ceará", espnId: "9969", slug: "bra.2" },
  { name: "Fortaleza", espnId: "6272", slug: "bra.2" },
  { name: "Juventude", espnId: "6270", slug: "bra.2" },
  { name: "Sport", espnId: "7635", slug: "bra.2" },
] as const;

function mapPos(raw?: string): string {
  const v = (raw ?? "").toLowerCase();
  if (!v) return "CM";
  if (v === "g" || v.includes("goal")) return "GK";
  if (v === "d" || v.includes("defender") || v.includes("back")) return "CB";
  if (v === "m" || v.includes("mid")) return "CM";
  if (v === "f" || v.includes("forward") || v.includes("attack")) return "ST";
  return "CM";
}

function num(
  statistics: {
    splits?: { categories?: Array<{ stats?: Array<{ name?: string; value?: number; displayValue?: string }> }> };
  } | undefined,
  names: string[]
): number {
  for (const cat of statistics?.splits?.categories ?? []) {
    for (const s of cat.stats ?? []) {
      if (names.includes((s.name ?? "").toLowerCase())) {
        const n = Number(s.value ?? s.displayValue);
        if (Number.isFinite(n)) return n;
      }
    }
  }
  return 0;
}

async function fetchRosterById(slug: string, espnId: string): Promise<EspnRosterPlayer[]> {
  const res = await fetch(`${ESPN_SITE}/${slug}/teams/${espnId}/roster`, {
    headers: { Accept: "application/json", "User-Agent": "omniscout/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${slug}/${espnId}`);
  const data = (await res.json()) as {
    athletes?: Array<{
      id?: string;
      displayName?: string;
      fullName?: string;
      jersey?: string;
      dateOfBirth?: string;
      citizenship?: string;
      headshot?: { href?: string } | null;
      position?: { abbreviation?: string; name?: string };
      statistics?: {
        splits?: {
          categories?: Array<{
            stats?: Array<{ name?: string; value?: number; displayValue?: string }>;
          }>;
        };
      };
    }>;
  };

  return (data.athletes ?? [])
    .map((a): EspnRosterPlayer | null => {
      const fullName = a.displayName?.trim() || a.fullName?.trim() || "";
      if (!fullName || !a.id) return null;
      const appearances = num(a.statistics, ["appearances", "gamesplayed", "games"]);
      const subIns = num(a.statistics, ["subins", "substituteappearances"]);
      const goals = num(a.statistics, ["totalgoals", "goals"]);
      const assists = num(a.statistics, ["goalassists", "assists"]);
      const shots = num(a.statistics, ["totalshots", "shots"]);
      const shotsOnTarget = num(a.statistics, ["shotsontarget"]);
      const yellowCards = num(a.statistics, ["yellowcards"]);
      const redCards = num(a.statistics, ["redcards"]);
      const minutesPlayed = Math.max(0, (appearances - subIns) * 90 + subIns * 30);
      return {
        espnAthleteId: String(a.id),
        fullName,
        position: mapPos(a.position?.abbreviation ?? a.position?.name),
        nationality: a.citizenship ?? "Unknown",
        dateOfBirth: a.dateOfBirth,
        jersey: a.jersey,
        photoUrl: a.headshot?.href ?? undefined,
        seasonStats: {
          appearances,
          subIns,
          goals,
          assists,
          shots,
          shotsOnTarget,
          yellowCards,
          redCards,
          minutesPlayed,
        },
      };
    })
    .filter((row): row is EspnRosterPlayer => row != null);
}

async function main(): Promise<void> {
  process.env.PRISMA_LOG_QUIET = process.env.PRISMA_LOG_QUIET ?? "1";
  const prisma = getPrisma();
  const comp = await prisma.competition.findFirst({ where: { espnSlug: "bra.1" } });
  if (!comp) throw new Error("Brasileirão competition not found");

  for (const t of TARGETS) {
    const team = await prisma.team.findFirst({
      where: {
        competitionId: comp.id,
        name: { equals: t.name, mode: "insensitive" },
      },
    });
    if (!team) {
      console.log(`MISSING TEAM ${t.name}`);
      continue;
    }
    const squad = await fetchRosterById(t.slug, t.espnId);
    const saved = await persistSquadFromEspn(team.id, squad, BRASILEIRAO_NAME);
    await prisma.player.updateMany({
      where: { teamId: team.id, sport: "SOCCER" },
      data: { league: BRASILEIRAO_NAME, dataSyncedSeason: BRAZIL_SEASON_LABEL },
    });
    console.log(`${t.name}: ${saved} players`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getPrisma().$disconnect();
    } catch {
      /* ignore */
    }
  });
