import { GitCompareArrows, Lightbulb, Trophy } from "lucide-react";
import { queryPlayersForComparison } from "@/features/comparison/queries/compare";
import { buildComparisonReport } from "@/features/comparison/lib/analysis";
import { COMPARISON_CATEGORIES, toComparisonProfile } from "@/features/comparison/lib/categories";
import { ComparisonPlayerCards } from "@/features/comparison/components/comparison-player-cards";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { StatRadarChart } from "@/components/charts/stat-radar-chart";
import { DataPanel } from "@/components/data/data-panel";
import { Badge } from "@/components/ui/badge";
import { chartTheme } from "@/lib/chart-theme";
import { toRadarProfile } from "@/lib/normalize";
import { notFound } from "next/navigation";

const RADAR_METRICS = ["Finishing", "Creation", "Passing", "Dribbling", "Defense", "Physical"];

export async function ComparisonResult({ playerA, playerB }: { playerA: string; playerB: string }) {
  const pair = await queryPlayersForComparison(playerA, playerB);
  if (!pair) notFound();

  const [a, b] = pair;
  const report = buildComparisonReport(a, b);
  const profileA = toComparisonProfile(a.currentSeasonStats);
  const profileB = toComparisonProfile(b.currentSeasonStats);

  return (
    <div className="space-y-4">
      <ComparisonPlayerCards players={[a, b]} />

      <DataPanel
        title="Comparison Summary"
        description={report.summary}
        density="dense"
      >
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="mb-1 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Recommendation</p>
          </div>
          <p className="text-sm text-foreground">{report.recommendation}</p>
        </div>
      </DataPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataPanel
          title="Category Comparison"
          description="Attack, creativity, finishing, passing, physical, and defense (0–100 index)."
          density="dense"
        >
          <ComparisonBarChart
            categories={[...COMPARISON_CATEGORIES]}
            playerAName={a.knownAs}
            playerBName={b.knownAs}
            valuesA={profileA}
            valuesB={profileB}
          />
        </DataPanel>

        <DataPanel title="Radar Profile" description="Normalized multidimensional view per 90." density="dense">
          <StatRadarChart
            metrics={RADAR_METRICS}
            series={[
              { name: a.knownAs, color: chartTheme.series.primary, values: toRadarProfile(a.currentSeasonStats) },
              { name: b.knownAs, color: chartTheme.series.secondary, values: toRadarProfile(b.currentSeasonStats) },
            ]}
          />
        </DataPanel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DataPanel title={`Competitive Advantages — ${a.knownAs}`} density="dense">
          <ul className="space-y-2">
            {report.advantagesA.map((item) => (
              <li
                key={item}
                className="rounded-lg border border-border bg-surface-muted/30 px-3 py-2 text-xs text-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
          {report.categoryWinsA.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {report.categoryWinsA.map((c) => (
                <Badge key={c} variant="default">{c}</Badge>
              ))}
            </div>
          )}
        </DataPanel>

        <DataPanel title={`Competitive Advantages — ${b.knownAs}`} density="dense">
          <ul className="space-y-2">
            {report.advantagesB.map((item) => (
              <li
                key={item}
                className="rounded-lg border border-border bg-surface-muted/30 px-3 py-2 text-xs text-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
          {report.categoryWinsB.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {report.categoryWinsB.map((c) => (
                <Badge key={c} variant="azure">{c}</Badge>
              ))}
            </div>
          )}
        </DataPanel>
      </div>

      <DataPanel
        title="Automated Insights"
        description="Quantitative analysis for the current season."
        density="dense"
      >
        <div className="space-y-2">
          {report.insights.map((line) => (
            <div
              key={line}
              className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted/30 px-3 py-2 text-xs text-foreground"
            >
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-warning" />
              {line}
            </div>
          ))}
        </div>
      </DataPanel>
    </div>
  );
}
