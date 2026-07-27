import Link from "next/link";
import { queryRecruitmentCandidates } from "@/features/scouting/queries/recruitment-candidates";
import { resolveRecruitmentBrief } from "@/features/recruitment/lib/resolve-recruitment-brief";
import { recordRecruitmentBriefRun } from "@/lib/actions/workspace";
import { getOrCreateDeviceId } from "@/lib/workspace/device-id";
import { Badge } from "@/components/ui/badge";
import { formatMarketValue, ratingColor } from "@/lib/utils";

export async function RecruitmentResults({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const resolved = await resolveRecruitmentBrief(searchParams);
  if (!resolved) {
    return (
      <p className="text-sm text-muted-foreground">
        Set filters and run a search to see ranked recruitment candidates — or open a player
        profile and use <span className="text-foreground/80">Find replacements</span>.
      </p>
    );
  }

  const { brief, replaceTarget } = resolved;
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
      {replaceTarget ? (
        <p className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-foreground/90">
          Replacing{" "}
          <Link href={`/players/${replaceTarget.id}`} className="font-semibold text-primary hover:underline">
            {replaceTarget.knownAs || replaceTarget.fullName}
          </Link>{" "}
          ({replaceTarget.position}
          {replaceTarget.teamName ? ` · ${replaceTarget.teamName}` : ""}) — brief seeded from
          role/dimensions; target excluded from results. Decision support, not certainty.
        </p>
      ) : null}
      <p className="rounded-lg border border-border bg-surface-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {result.disclaimer} Evaluated {result.totalEvaluated} players; showing{" "}
        {result.candidates.length}.
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
                <Badge variant="outline">Confidence: {candidate.dataConfidence}</Badge>
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
