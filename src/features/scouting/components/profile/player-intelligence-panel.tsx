import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  Brain,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataPanel } from "@/components/data/data-panel";
import { queryPlayerIntelligenceProfile } from "@/features/scouting/queries/player-intelligence";
import type { SoccerTrajectory } from "@/lib/intelligence/soccer/types";
import { cn } from "@/lib/utils";

function trajectoryMeta(trajectory: SoccerTrajectory): {
  label: string;
  variant: "azure" | "neutral" | "rose" | "amber";
  Icon: typeof TrendingUp;
} {
  switch (trajectory) {
    case "improving":
      return { label: "Improving", variant: "azure", Icon: TrendingUp };
    case "declining":
      return { label: "Declining", variant: "rose", Icon: TrendingDown };
    case "stable":
      return { label: "Stable", variant: "neutral", Icon: Minus };
    default:
      return { label: "Insufficient data", variant: "amber", Icon: AlertCircle };
  }
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.85) return "High confidence";
  if (confidence >= 0.7) return "Good confidence";
  if (confidence >= 0.4) return "Moderate confidence";
  return "Low confidence";
}

function scoreBarClass(score: number): string {
  if (score >= 75) return "bg-primary";
  if (score >= 55) return "bg-accent-info";
  if (score >= 35) return "bg-accent-warning";
  return "bg-muted-foreground/50";
}

export async function PlayerIntelligencePanel({ playerId }: { playerId: string }) {
  const profile = await queryPlayerIntelligenceProfile(playerId);
  if (!profile) return null;

  const trajectory = trajectoryMeta(profile.trajectory);
  const TrajectoryIcon = trajectory.Icon;
  const avgConfidence =
    profile.dimensions.reduce((sum, dimension) => sum + dimension.confidence, 0) /
    Math.max(profile.dimensions.length, 1);

  return (
    <DataPanel
      title="Intelligence Profile"
      description="Server-computed role, dimensions, and trajectory — no client-side scoring."
      density="dense"
      action={
        <Link
          href="/methodology"
          className="inline-flex items-center gap-1 text-2xs font-medium text-primary hover:underline"
        >
          Methodology
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-muted/30 p-3">
          <Badge variant="default">{profile.role}</Badge>
          <Badge variant="secondary">
            <Sparkles className="mr-1 h-3 w-3" />
            {profile.styleLabel}
          </Badge>
          <Badge variant={trajectory.variant}>
            <TrajectoryIcon className="mr-1 h-3 w-3" />
            {trajectory.label}
          </Badge>
          <Badge variant="outline">{confidenceLabel(avgConfidence)}</Badge>
          {profile.leagueContext?.scoringMethod === "league_percentile" ? (
            <Badge variant="azure">
              League percentile · n={profile.leagueContext.cohortSize}
            </Badge>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {profile.dimensions.map((dimension) => (
            <div
              key={dimension.key}
              className="rounded-lg border border-border bg-surface-muted/20 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">{dimension.label}</p>
                <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {dimension.score}
                  <span className="text-2xs font-normal text-muted-foreground">/100</span>
                </p>
              </div>
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={cn("h-full rounded-full transition-all", scoreBarClass(dimension.score))}
                  style={{ width: `${Math.min(100, Math.max(0, dimension.score))}%` }}
                />
              </div>
              <p className="mb-2 text-2xs text-muted-foreground">
                {confidenceLabel(dimension.confidence)} ({Math.round(dimension.confidence * 100)}%)
              </p>
              <ul className="space-y-1">
                {dimension.evidence.map((item) => (
                  <li key={`${dimension.key}-${item.label}`} className="text-2xs text-muted-foreground">
                    <span className="text-foreground/80">{item.label}:</span> {item.value}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {profile.limitations.length > 0 ? (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-200/90">
              <Brain className="h-3.5 w-3.5" />
              Limitations
            </div>
            <ul className="space-y-1.5">
              {profile.limitations.map((line) => (
                <li key={line} className="text-2xs leading-relaxed text-amber-100/80">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </DataPanel>
  );
}
