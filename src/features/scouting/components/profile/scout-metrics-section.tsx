import { DataPanel } from "@/components/data/data-panel";
import { queryScoutMetrics } from "@/features/scouting/queries/scout-metrics";

export async function ScoutMetricsSection({
  playerId,
  competitionName,
  season,
}: {
  playerId: string;
  competitionName: string | null | undefined;
  season?: string;
}) {
  const model = await queryScoutMetrics(playerId, competitionName, season);
  const source = model.provider === "fbref" ? "FBref" : model.provider;

  return (
    <DataPanel
      title="Scout metrics"
      description="Season totals scouts use. Each number is stored only when the source published it. Under eight players in the league, the percentile stays hidden."
    >
      {model.rows.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          No scout metrics for {model.competitionName ?? "this competition"}
          {model.seasonLabel ? ` · ${model.seasonLabel}` : ""}. Coverage is Big 5 and MLS season totals from FBref.
          A blank cell is left blank. Nothing here is estimated.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {model.rows.map((row) => (
            <li key={row.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="min-w-0">
                <p className="text-sm font-medium">{row.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{row.explainer}</p>
                <p className="mt-1 text-2xs uppercase tracking-wider text-muted-foreground">
                  {source} · {row.seasonLabel}
                  {row.percentile == null
                    ? ` · percentile hidden (${row.cohortSize} in the league, need ${model.minCohort})`
                    : ` · ${row.percentile}th percentile of ${row.cohortSize} in the league`}
                </p>
              </div>
              <p className="font-display text-2xl font-semibold tabular-nums sm:text-right">{row.valueLabel}</p>
            </li>
          ))}
        </ul>
      )}
    </DataPanel>
  );
}
