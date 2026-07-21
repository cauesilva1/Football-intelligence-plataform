/**
 * Process ESPN boxscore for any soccer league (not Brasileirão-only).
 *
 * Uso:
 *   npm run data:sync-match-2026 -- 732613
 *   npm run data:sync-match-2026 -- 732613 --slug=bra.1
 *   npm run data:sync-match-2026 -- 123456 --slug=ger.1 --force
 */
import fs from "fs";
import path from "path";
import { processMatchBoxScore, processMatchBoxScore2026 } from "@/lib/api/espn-boxscore";
import { getPrisma } from "@/lib/prisma";
import { SOCCER_COMPETITIONS } from "@/lib/tournaments/soccer-competitions";
import { ESPN_BRAZIL_SEASON_YEAR } from "@/lib/seasons";

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

function readFlag(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const matchId = args.find((arg) => !arg.startsWith("--"));
  const force = args.includes("--force");
  const slug = readFlag(args, "slug") ?? "bra.1";

  if (!matchId?.trim()) {
    throw new Error(
      "Informe o ID da partida ESPN. Ex.: npm run data:sync-match-2026 -- 732613 --slug=ger.1"
    );
  }

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar o sync.");
  }

  const league = SOCCER_COMPETITIONS.find((c) => c.espnSlug === slug);
  const seasonYear = league?.seasonYear ?? ESPN_BRAZIL_SEASON_YEAR;
  const competitionLabel = league?.espnCompetitionLabel ?? league?.name ?? slug;

  console.log(
    `[sync-match] ${slug}/${matchId} · season ${seasonYear}${force ? " (force)" : ""}...`
  );

  const result =
    slug === "bra.1"
      ? await processMatchBoxScore2026(matchId.trim(), { force })
      : await processMatchBoxScore(slug, matchId.trim(), {
          force,
          seasonYear,
          competitionLabel,
          createMissingPlayers: true,
        });

  if (result.alreadyProcessed) {
    console.log(
      `[sync-match] ${slug}/${matchId} already processed. Use --force to reprocess.`
    );
    return;
  }

  console.log(
    `[sync-match] Done — athletes: ${result.playersProcessed} · created: ${result.playersCreated} · rows: ${result.statsUpserted} · failed: ${result.failed}`
  );
}

main()
  .catch((error: unknown) => {
    console.error("[sync-match] Fatal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
