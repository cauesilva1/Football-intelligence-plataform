import Link from "next/link";
import { queryRecruitmentCandidates } from "@/features/scouting/queries/recruitment-candidates";
import { recordRecruitmentBriefRun } from "@/lib/actions/workspace";
import { getOrCreateDeviceId } from "@/lib/workspace/device-id";
import type { RecruitmentBrief } from "@/lib/intelligence/soccer/recruitment-types";
import { Badge } from "@/components/ui/badge";
import { formatMarketValue, ratingColor } from "@/lib/utils";

function parseBrief(searchParams: Record<string, string | string[] | undefined>): RecruitmentBrief | null {
  const position = typeof searchParams.position === "string" ? searchParams.position : undefined;
  if (!position) return null;

  const num = (key: string) => {
    const raw = searchParams[key];
    const value = typeof raw === "string" ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : undefined;
  };

  return {
    sport: "SOCCER",
    position,
    league: typeof searchParams.league === "string" ? searchParams.league : undefined,
    maxAge: num("maxAge"),
    maxMarketValue: num("maxValue"),
    minRating: num("minRating"),
    limit: num("limit") ?? 15,
    trajectory: "any",
  };
}

export async function RecruitmentResults({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const brief = parseBrief(searchParams);
  if (!brief) {
    return (
      <p className="text-sm text-muted-foreground">
        Set filters and run a search to see ranked recruitment candidates.
      </p>
    );
  }

  const result = await queryRecruitmentCandidates(brief);

  const deviceId = await getOrCreateDeviceId();
  if (deviceId) {
    await recordRecruitmentBriefRun({
      brief,
      totalEvaluated: result.totalEvaluated,
      resultCount: result.candidates.length,
    }).catch(() => undefined);
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-border bg-surface-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {result.disclaimer} Evaluated {result.totalEvaluated} players; showing {result.candidates.length}.
      </p>
      {result.candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No candidates matched this brief.</p>
      ) : (
        <div className="space-y-2">
          {result.candidates.map((candidate, index) => (
            <Link
              key={candidate.playerId}
              href={`/players/${candidate.playerId}`}
              className="block rounded-lg border border-border bg-surface-muted/20 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-surface-muted/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    #{index + 1} {candidate.playerName}
                  </p>
                  <p className="mt-1 text-2xs text-muted-foreground">
                    {candidate.position} · {candidate.teamName ?? "—"} · {candidate.age} yo ·{" "}
                    {formatMarketValue(candidate.marketValue)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-primary">{candidate.fitScore}</p>
                  <p className="text-2xs uppercase tracking-wider text-muted-foreground">Fit score</p>
                  <p className={`font-mono text-2xs ${ratingColor(candidate.rating)}`}>
                    {candidate.rating.toFixed(1)} rating
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">{candidate.matchedRole}</Badge>
                <Badge variant="outline">Trajectory: {candidate.trajectory}</Badge>
              </div>
              <ul className="mt-2 space-y-1">
                {candidate.reasons.map((reason) => (
                  <li key={reason} className="text-2xs text-muted-foreground">
                    {reason}
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
