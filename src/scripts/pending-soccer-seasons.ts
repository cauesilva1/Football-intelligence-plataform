/**
 * List showcase clubs still missing PlayerSeasonStats for a season.
 *
 *   npm run data:pending-soccer-seasons
 *   npm run data:pending-soccer-seasons -- --season=2024
 */
import fs from "fs";
import path from "path";
import { getPrisma } from "@/lib/prisma";

function loadDotEnv(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
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
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

function argValue(flag: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : undefined;
}

async function main(): Promise<void> {
  const season = Number(argValue("--season") ?? "2024");
  if (!process.env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL ausente.");

  const prisma = getPrisma();
  const teams = await prisma.team.findMany({
    where: {
      apiSportsId: { not: null },
      players: { some: { sport: "SOCCER" } },
      OR: [
        { competition: { name: { contains: "Premier", mode: "insensitive" } } },
        { competition: { name: { contains: "La Liga", mode: "insensitive" } } },
        { competition: { name: { equals: "Serie A", mode: "insensitive" } } },
        { competition: { name: { contains: "Bundesliga", mode: "insensitive" } } },
        { competition: { name: { contains: "Ligue", mode: "insensitive" } } },
        { competition: { name: { contains: "MLS", mode: "insensitive" } } },
        { competition: { name: { contains: "Brasileir", mode: "insensitive" } } },
      ],
      NOT: {
        players: { some: { sport: "SOCCER", stats: { some: { season } } } },
      },
    },
    select: {
      name: true,
      apiSportsId: true,
      competition: { select: { name: true } },
    },
    orderBy: [{ competition: { name: "asc" } }, { name: "asc" }],
  });

  console.log(
    JSON.stringify(
      {
        season,
        pendingClubs: teams.length,
        clubs: teams.map((t) => ({
          name: t.name,
          competition: t.competition?.name ?? null,
          apiSportsId: t.apiSportsId,
        })),
        next: `npm run data:backfill-soccer-seasons -- --teams=${Math.min(40, Math.max(1, teams.length))} --season=${season}`,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[pending-soccer-seasons] fatal", error);
  process.exit(1);
});
