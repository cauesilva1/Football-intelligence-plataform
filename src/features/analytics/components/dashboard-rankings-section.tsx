import Link from "next/link";
import { queryDashboardOverview } from "@/features/analytics/queries/dashboard";
import { getPlayerRepository } from "@/features/scouting/repository";
import { DataPanel } from "@/components/data/data-panel";
import { Badge } from "@/components/ui/badge";
import { ratingColor, formatMarketValue } from "@/lib/utils";
import { getServerSport } from "@/lib/sport-server";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import {
  pickBasketballDisplayStats,
  sortBasketballLeaders,
  statAssists,
  statPoints,
  statRebounds,
} from "@/lib/metrics/basketball-display";
import type { Player } from "@/types";

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
      <EmptyList message="Sem dados de temporada no banco. Rode o sync NBA ou abra franquias." />
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
              <span className="w-5 text-2xs text-muted-foreground">#{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{player.knownAs}</p>
                <p className="truncate text-2xs text-muted-foreground">
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
              <span className="w-5 text-2xs text-muted-foreground">#{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{player.knownAs}</p>
                <p className="truncate text-2xs text-muted-foreground">
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
    return <EmptyList message="Sem jogadores neste recorte ainda." />;
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
            <span className="w-5 text-2xs text-muted-foreground">#{index + 1}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{player.knownAs}</p>
              <p className="truncate text-2xs text-muted-foreground">
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
            {metric === "goals90" && `${player.currentSeasonStats.per90.goals.toFixed(2)} g/90`}
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
    const allPlayers = await getPlayerRepository().getAll("BASKETBALL");

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DataPanel
            title="Top Prospects"
            description="U23 com rating ≥ 7.0 — independente da temporada atual."
            density="dense"
          >
            <RatingList
              players={overview.topProspects}
              sport="BASKETBALL"
              emptyMessage="Nenhum prospect U23 com rating ≥ 7.0 na temporada com dados (ex.: 2025/26)."
            />
          </DataPanel>
          <DataPanel
            title="Best Performers"
            description="Rating ≥ 7.5 na melhor temporada com produção real."
            density="dense"
          >
            <RatingList
              players={overview.bestPerformers}
              sport="BASKETBALL"
              emptyMessage="Sem performers com rating ≥ 7.5 — confira se a temporada com stats reais está sincronizada."
            />
          </DataPanel>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DataPanel title="Líderes em Pontos" description="Média de PTS por jogo." density="dense">
            <BasketballLeaderList
              players={sortBasketballLeaders(allPlayers, "points")}
              metric="points"
            />
          </DataPanel>
          <DataPanel title="Líderes em Rebotes" description="Média de REB por jogo." density="dense">
            <BasketballLeaderList
              players={sortBasketballLeaders(allPlayers, "rebounds")}
              metric="rebounds"
            />
          </DataPanel>
          <DataPanel
            title="Líderes em Assistências"
            description="Média de AST por jogo."
            density="dense"
          >
            <BasketballLeaderList
              players={sortBasketballLeaders(allPlayers, "assists")}
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
          description="U23 com rating ≥ 7.0 no elenco sincronizado."
          density="dense"
        >
          <RatingList
            players={overview.topProspects}
            sport="AMERICAN_FOOTBALL"
            emptyMessage="Abra franquias NFL/CFB para syncar elenco — aí os prospects aparecem."
          />
        </DataPanel>
        <DataPanel title="Best Performers" description="Maiores ratings no banco." density="dense">
          <RatingList
            players={overview.bestPerformers}
            sport="AMERICAN_FOOTBALL"
            emptyMessage="Sem jogadores sincronizados ainda."
          />
        </DataPanel>
        <DataPanel
          title="Cap bargains"
          description="Rating alto · Cap Hit acessível (quando houver)."
          density="dense"
        >
          <RatingList
            players={overview.marketOpportunities}
            sport="AMERICAN_FOOTBALL"
            emptyMessage="Sem bargains de Cap Hit no banco ainda."
          />
        </DataPanel>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4">
      <DataPanel title="Top U23 Prospects" description="Youth players with rating ≥ 7.0." density="dense">
        <SoccerRankingList players={overview.topProspects} metric="rating" />
      </DataPanel>
      <DataPanel title="Best Performers" description="Highest ratings this season." density="dense">
        <SoccerRankingList players={overview.bestPerformers} metric="rating" />
      </DataPanel>
      <DataPanel title="Market Opportunities" description="Strong performance · accessible value." density="dense">
        <SoccerRankingList players={overview.marketOpportunities} metric="value" />
      </DataPanel>
      <DataPanel title="Top Scorers (g/90)" description="Normalized offensive output." density="dense">
        <SoccerRankingList players={overview.topScorers} metric="goals90" />
      </DataPanel>
    </div>
  );
}
