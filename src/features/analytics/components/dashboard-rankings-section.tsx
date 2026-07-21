import Link from "next/link";
import { queryDashboardOverview } from "@/features/analytics/queries/dashboard";
import { getPlayerRepository } from "@/features/scouting/repository";
import { DataPanel } from "@/components/data/data-panel";
import { Badge } from "@/components/ui/badge";
import { ratingColor, formatMarketValue } from "@/lib/utils";
import { getServerSport } from "@/lib/sport-server";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import { SOCCER_RATE_SOFT_CAP } from "@/lib/scoring";
import { per90 } from "@/lib/metrics/per90";
import {
  pickBasketballDisplayStats,
  sortBasketballLeaders,
  statAssists,
  statPoints,
  statRebounds,
} from "@/lib/metrics/basketball-display";
import type { Player } from "@/types";
import { SCORE_DEFINITIONS } from "@/lib/score-definitions";

function displayGoalsPer90(player: Player): number {
  const stats = player.currentSeasonStats;
  // Recompute + soft-cap at render so stale cache / legacy rows cannot show 8+ g/90.
  return per90(stats.goals, stats.minutesPlayed, { softCap: SOCCER_RATE_SOFT_CAP });
}

function EmptyList({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
      {message}
    </p>
  );
}

function BasketballLeaderList({
  players,
  metric,
}: {
  players: Player[];
  metric: "points" | "rebounds" | "assists";
}) {
  const label = metric === "points" ? "PTS" : metric === "rebounds" ? "REB" : "AST";

  if (!players.length) {
    return (
      <EmptyList message="No season data in the database. Run the NBA sync or open franchises." />
    );
  }

  return (
    <div className="space-y-2">
      {players.map((player, index) => {
        const stats = pickBasketballDisplayStats(player);
        const value =
          metric === "points"
            ? statPoints(stats)
            : metric === "rebounds"
              ? statRebounds(stats)
              : statAssists(stats);

        return (
          <Link
            key={player.id}
            href={`/players/${player.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-surface-muted/30 px-3 py-2 transition-colors hover:border-primary/30"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="w-5 font-mono text-2xs tabular-nums text-muted-foreground">#{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{player.knownAs}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {player.teamShortName ?? "—"} · {player.position}
                </p>
              </div>
              <Badge variant="neutral">{player.league ?? "NBA"}</Badge>
            </div>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">
              {value.toFixed(1)} {label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function RatingList({
  players,
  emptyMessage,
  sport = "SOCCER",
}: {
  players: Player[];
  emptyMessage: string;
  sport?: "SOCCER" | "BASKETBALL" | "AMERICAN_FOOTBALL";
}) {
  if (!players.length) return <EmptyList message={emptyMessage} />;

  return (
    <div className="space-y-2">
      {players.map((player, index) => {
        const rating =
          sport === "BASKETBALL"
            ? pickBasketballDisplayStats(player).rating
            : player.currentSeasonStats.rating;

        return (
          <Link
            key={player.id}
            href={`/players/${player.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-surface-muted/30 px-3 py-2 transition-colors hover:border-primary/30"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="w-5 font-mono text-2xs tabular-nums text-muted-foreground">#{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{player.knownAs}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {player.teamShortName ?? "—"} · {player.age}y
                </p>
              </div>
              <Badge variant="neutral">{player.position}</Badge>
            </div>
            <span
              className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${ratingColor(rating)}`}
            >
              {rating.toFixed(1)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function SoccerRankingList({
  players,
  metric,
}: {
  players: Player[];
  metric: "rating" | "value" | "goals90";
}) {
  if (!players.length) {
    return <EmptyList message="No players in this segment yet." />;
  }

  return (
    <div className="space-y-2">
      {players.map((player, index) => (
        <Link
          key={player.id}
          href={`/players/${player.id}`}
          className="flex items-center justify-between rounded-lg border border-border bg-surface-muted/30 px-3 py-2 transition-colors hover:border-primary/30"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="w-5 font-mono text-2xs tabular-nums text-muted-foreground">#{index + 1}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{player.knownAs}</p>
              <p className="truncate text-xs text-muted-foreground">
                {player.teamShortName ?? "—"} · {player.age}y
              </p>
            </div>
            <Badge variant="neutral">{player.position}</Badge>
          </div>
          <span
            className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${
              metric === "rating" ? ratingColor(player.currentSeasonStats.rating) : "text-foreground"
            }`}
          >
            {metric === "rating" && player.currentSeasonStats.rating.toFixed(1)}
            {metric === "value" && formatMarketValue(player.marketValue)}
            {metric === "goals90" && `${displayGoalsPer90(player).toFixed(2)} g/90`}
          </span>
        </Link>
      ))}
    </div>
  );
}

export async function DashboardRankingsSection() {
  const sport = await getServerSport();
  const isBasketball = sport === "BASKETBALL";
  const isAmericanFootball = sport === "AMERICAN_FOOTBALL";
  const overview = await queryDashboardOverview();

  if (isBasketball) {
    await ensureRuntimeDataSource();
    const sample = await getPlayerRepository().findSample("BASKETBALL", { take: 350 });

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DataPanel
            title="Top Prospects"
            description={SCORE_DEFINITIONS.topProspects}
            density="dense"
          >
            <RatingList
              players={overview.topProspects}
              sport="BASKETBALL"
              emptyMessage="No U23 prospects with a rating ≥ 7.0 in a season with data (e.g. 2025/26)."
            />
          </DataPanel>
          <DataPanel
            title="Best Performers"
            description={SCORE_DEFINITIONS.bestPerformers}
            density="dense"
          >
            <RatingList
              players={overview.bestPerformers}
              sport="BASKETBALL"
            emptyMessage="No performers with a rating ≥ 7.5 — check that the season with actual stats is synced."
            />
          </DataPanel>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DataPanel title="Points Leaders" description="PTS average per game." density="dense">
            <BasketballLeaderList
              players={sortBasketballLeaders(sample, "points")}
              metric="points"
            />
          </DataPanel>
          <DataPanel title="Rebounds Leaders" description="REB average per game." density="dense">
            <BasketballLeaderList
              players={sortBasketballLeaders(sample, "rebounds")}
              metric="rebounds"
            />
          </DataPanel>
          <DataPanel
            title="Assists Leaders"
            description="AST average per game."
            density="dense"
          >
            <BasketballLeaderList
              players={sortBasketballLeaders(sample, "assists")}
              metric="assists"
            />
          </DataPanel>
        </div>
      </div>
    );
  }

  if (isAmericanFootball) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3">
        <DataPanel
          title="Top Prospects"
          description={SCORE_DEFINITIONS.topProspects}
          density="dense"
        >
          <RatingList
            players={overview.topProspects}
            sport="AMERICAN_FOOTBALL"
            emptyMessage="Open NFL/CFB franchises to sync rosters — prospects will then appear."
          />
        </DataPanel>
        <DataPanel
          title="Best Performers"
          description={SCORE_DEFINITIONS.bestPerformers}
          density="dense"
        >
          <RatingList
            players={overview.bestPerformers}
            sport="AMERICAN_FOOTBALL"
            emptyMessage="No synced players yet."
          />
        </DataPanel>
        <DataPanel
          title="Cap bargains"
          description="Strong performance indicators with a lower estimated Cap Hit (when available)."
          density="dense"
        >
          <RatingList
            players={overview.marketOpportunities}
            sport="AMERICAN_FOOTBALL"
            emptyMessage="No Cap Hit bargains in the database yet."
          />
        </DataPanel>
      </div>
    );
  }

  /* Aligned 2x2 grid: each panel holds a single-column top-5 list, so all four
     cards share the same natural height and rows line up across columns. */
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <DataPanel
        title="Top Prospects"
        description={SCORE_DEFINITIONS.topProspects}
        density="dense"
      >
        <SoccerRankingList players={overview.topProspects} metric="rating" />
      </DataPanel>
      <DataPanel
        title="Best Performers"
        description={SCORE_DEFINITIONS.bestPerformers}
        density="dense"
      >
        <SoccerRankingList players={overview.bestPerformers} metric="rating" />
      </DataPanel>
      <DataPanel
        title="Market Opportunities"
        description={SCORE_DEFINITIONS.marketOpportunities}
        density="dense"
      >
        <SoccerRankingList players={overview.marketOpportunities} metric="value" />
      </DataPanel>
      <DataPanel title="Top Scorers (g/90)" description={SCORE_DEFINITIONS.topScorers} density="dense">
        <SoccerRankingList players={overview.topScorers} metric="goals90" />
      </DataPanel>
    </div>
  );
}
