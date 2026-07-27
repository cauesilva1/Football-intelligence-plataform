import Link from "next/link";
import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataPanel } from "@/components/data/data-panel";
import { queryTacticalFit } from "@/features/scouting/queries/tactical-fit";

export async function PlayerTacticalFitPanel({
  playerId,
  teamId,
}: {
  playerId: string;
  teamId: string;
}) {
  const fit = await queryTacticalFit(playerId, teamId);
  if (!fit) return null;

  return (
    <DataPanel
      title="Tactical fit"
      description={`Heuristic match vs ${fit.teamName} season style — server-side only.`}
      density="dense"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{fit.fitScore}/100 fit</Badge>
          <Badge variant="secondary">{fit.teamStyleLabel}</Badge>
        </div>
        <ul className="space-y-1.5">
          {fit.reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2 text-xs text-foreground">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              {reason}
            </li>
          ))}
        </ul>
        {fit.limitations.length > 0 ? (
          <ul className="space-y-1 rounded-lg border border-border bg-surface-muted/30 p-3">
            {fit.limitations.map((line) => (
              <li key={line} className="text-2xs text-muted-foreground">
                {line}
              </li>
            ))}
          </ul>
        ) : null}
        <Link href={`/teams/${fit.teamId}`} className="text-2xs font-medium text-primary hover:underline">
          View club profile →
        </Link>
      </div>
    </DataPanel>
  );
}
