/**
 * Run a headless recruitment search and print ranked candidates as JSON.
 *
 * Usage:
 *   npm run intel:recruitment -- --position=ST --maxAge=23 --maxValue=5000000
 *   npm run intel:recruitment -- --position=CM --league=<competitionId> --limit=10
 */
import { queryRecruitmentCandidates } from "@/features/scouting/queries/recruitment-candidates";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import { CURRENT_SEASON } from "@/lib/data/generators";
import type { RecruitmentBrief } from "@/lib/intelligence/soccer/recruitment-types";

function argValue(flag: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (hit) return hit.slice(flag.length + 1);
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--")) {
    return process.argv[idx + 1];
  }
  return undefined;
}

function numberArg(flag: string): number | undefined {
  const raw = argValue(flag);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

async function main() {
  const position = argValue("--position") ?? "ST";
  const brief: RecruitmentBrief = {
    sport: "SOCCER",
    position,
    league: argValue("--league"),
    season: argValue("--season") ?? CURRENT_SEASON,
    minAge: numberArg("--minAge"),
    maxAge: numberArg("--maxAge"),
    maxMarketValue: numberArg("--maxValue"),
    minMinutes: numberArg("--minMinutes"),
    minRating: numberArg("--minRating"),
    limit: numberArg("--limit") ?? 15,
    trajectory: (argValue("--trajectory") as RecruitmentBrief["trajectory"]) ?? "any",
    preferredRoles: argValue("--roles")?.split(",").map((role) => role.trim()).filter(Boolean),
  };

  await ensureRuntimeDataSource();
  const result = await queryRecruitmentCandidates(brief);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
