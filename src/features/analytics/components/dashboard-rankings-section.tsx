import Link from "next/link";
import { queryDashboardOverview } from "@/features/analytics/queries/dashboard";
import { DataPanel } from "@/components/data/data-panel";
import { Badge } from "@/components/ui/badge";
import { ratingColor, formatMarketValue } from "@/lib/utils";

function RankingList({
  players,
  metric,
}: {
  players: { id: string; knownAs: string; position: string; teamShortName?: string; age: number; marketValue: number; currentSeasonStats: { rating: number; per90: { goals: number } } }[];
  metric: "rating" | "value" | "goals90";
}) {
  return (
    <div className="space-y-2">
      {players.map((p, i) => (
        <Link
          key={p.id}
          href={`/players/${p.id}`}
          className="flex items-center justify-between rounded-lg border border-border bg-surface-muted/30 px-3 py-2 transition-colors hover:border-primary/30"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="w-5 text-2xs text-muted-foreground">#{i + 1}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{p.knownAs}</p>
              <p className="truncate text-2xs text-muted-foreground">
                {p.teamShortName ?? "—"} · {p.age}y
              </p>
            </div>
            <Badge variant="neutral">{p.position}</Badge>
          </div>
          <span
            className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${
              metric === "rating" ? ratingColor(p.currentSeasonStats.rating) : "text-foreground"
            }`}
          >
            {metric === "rating" && p.currentSeasonStats.rating.toFixed(1)}
            {metric === "value" && formatMarketValue(p.marketValue)}
            {metric === "goals90" && `${p.currentSeasonStats.per90.goals.toFixed(2)} g/90`}
          </span>
        </Link>
      ))}
    </div>
  );
}

export async function DashboardRankingsSection() {
  const overview = await queryDashboardOverview();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4">
      <DataPanel title="Top U23 Prospects" description="Youth players with rating ≥ 7.0." density="dense">
        <RankingList players={overview.topProspects} metric="rating" />
      </DataPanel>

      <DataPanel title="Best Performers" description="Highest ratings this season." density="dense">
        <RankingList players={overview.bestPerformers} metric="rating" />
      </DataPanel>

      <DataPanel title="Market Opportunities" description="Strong performance · accessible value." density="dense">
        <RankingList players={overview.marketOpportunities} metric="value" />
      </DataPanel>

      <DataPanel title="Top Scorers (g/90)" description="Normalized offensive output." density="dense">
        <RankingList players={overview.topScorers} metric="goals90" />
      </DataPanel>
    </div>
  );
}
