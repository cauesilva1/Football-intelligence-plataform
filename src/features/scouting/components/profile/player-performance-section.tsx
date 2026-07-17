import { Activity, Target, Crosshair, TrendingUp, Shield } from "lucide-react";
import { GlossaryTooltip, METRIC_GLOSSARY } from "@/components/common/glossary-tooltip";
import { MetricCard } from "@/components/data/metric-card";
import { DataPanel } from "@/components/data/data-panel";
import { PlayerSeasonChart } from "@/components/charts/player-season-chart";
import { StatRadarChart } from "@/components/charts/stat-radar-chart";
import { aggregateSeasonTimeline } from "@/features/scouting/lib/season-history";
import { PlayerSeasonSelector } from "@/features/scouting/components/profile/player-season-selector";
import { toRadarProfile } from "@/lib/normalize";
import { getTeamTheme } from "@/lib/team-theme";
import { getSportConfig } from "@/lib/sport-registry";
import type { Player } from "@/types";

function SoccerPerformanceSection({
  player,
  s,
  timeline,
  theme,
}: {
  player: Player;
  s: Player["currentSeasonStats"];
  timeline: ReturnType<typeof aggregateSeasonTimeline>;
  theme: ReturnType<typeof getTeamTheme>;
}) {
  const radarMetrics = [...getSportConfig("SOCCER").ui.radarMetrics];
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Minutes"
          value={s.minutesPlayed.toLocaleString("en-US")}
          icon={Activity}
          accent="info"
          borderColor={theme.primaryColor}
        />
        <MetricCard
          label="Goals / 90"
          value={s.per90.goals.toFixed(2)}
          icon={Target}
          accent="primary"
          borderColor={theme.primaryColor}
        />
        <MetricCard
          label={<GlossaryTooltip label="xG / 90" description={METRIC_GLOSSARY.xG} />}
          value={(s.minutesPlayed > 0 ? (s.xG / s.minutesPlayed) * 90 : 0).toFixed(2)}
          icon={Crosshair}
          accent="warning"
          borderColor={theme.primaryColor}
        />
        <MetricCard
          label={<GlossaryTooltip label="Assists / 90" description={METRIC_GLOSSARY.xA} />}
          value={s.per90.assists.toFixed(2)}
          icon={TrendingUp}
          accent="info"
          borderColor={theme.primaryColor}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataPanel
          title="Season Evolution"
          description="Rating, goals/90, and xG/90 aggregated by season."
          density="dense"
          className="border"
          style={{ borderColor: `${theme.primaryColor}33` }}
        >
          <PlayerSeasonChart data={timeline} sport="SOCCER" />
        </DataPanel>

        <DataPanel
          title="Performance Profile"
          description={`Normalized per-90 dimensions — season ${player.selectedSeason}.`}
          density="dense"
          className="border"
          style={{ borderColor: `${theme.primaryColor}33` }}
        >
          <StatRadarChart
            metrics={radarMetrics}
            series={[{ name: player.knownAs, color: theme.primaryColor, values: toRadarProfile(s) }]}
          />
        </DataPanel>
      </div>

      <DataPanel
        title="Detailed Metrics"
        description={`Season totals and per-90 rates for ${player.selectedSeason}.`}
        density="dense"
        className="border"
        style={{ borderColor: `${theme.primaryColor}33` }}
      >
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Appearances", value: String(s.appearances) },
            { label: "Goals", value: String(s.goals) },
            { label: "Assists", value: String(s.assists) },
            { label: "Shots / 90", value: s.per90.shots.toFixed(2) },
            { label: "Key Passes / 90", value: s.per90.keyPasses.toFixed(2) },
            { label: "xG total", value: s.xG.toFixed(2), glossary: METRIC_GLOSSARY.xG },
            { label: "xA total", value: s.xA.toFixed(2), glossary: METRIC_GLOSSARY.xA },
            { label: "Pass Accuracy", value: `${s.passAccuracy.toFixed(0)}%` },
            { label: "Duels Won", value: `${s.duelsWonPct.toFixed(0)}%` },
            { label: "Tackles Won / 90", value: s.per90.tackles.toFixed(2) },
            { label: "Interceptions / 90", value: s.per90.interceptions.toFixed(2) },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border bg-surface-muted/40 px-3 py-2.5"
              style={{ borderColor: `${theme.primaryColor}33` }}
            >
              {"glossary" in item && item.glossary ? (
                <GlossaryTooltip
                  label={
                    <span className="text-2xs uppercase tracking-wider text-muted-foreground">{item.label}</span>
                  }
                  description={item.glossary}
                />
              ) : (
                <span className="text-2xs uppercase tracking-wider text-muted-foreground">{item.label}</span>
              )}
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">{item.value}</div>
            </div>
          ))}
        </div>
      </DataPanel>
    </>
  );
}

function BasketballPerformanceSection({
  player,
  s,
  timeline,
  theme,
}: {
  player: Player;
  s: Player["currentSeasonStats"];
  timeline: ReturnType<typeof aggregateSeasonTimeline>;
  theme: ReturnType<typeof getTeamTheme>;
}) {
  const g = s.perGame ?? {
    points: s.points ?? 0,
    rebounds: s.rebounds ?? 0,
    steals: s.steals ?? 0,
    blocks: s.blocks ?? 0,
    assists: s.assists ?? 0,
  };
  const radarMetrics = [...getSportConfig("BASKETBALL").ui.radarMetrics];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Games"
          value={String(s.appearances)}
          icon={Activity}
          accent="info"
          borderColor={theme.primaryColor}
        />
        <MetricCard
          label="Points / Game"
          value={g.points.toFixed(1)}
          icon={Target}
          accent="primary"
          borderColor={theme.primaryColor}
        />
        <MetricCard
          label="Rebounds / Game"
          value={g.rebounds.toFixed(1)}
          icon={Shield}
          accent="warning"
          borderColor={theme.primaryColor}
        />
        <MetricCard
          label="Assists / Game"
          value={g.assists.toFixed(1)}
          icon={TrendingUp}
          accent="info"
          borderColor={theme.primaryColor}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataPanel
          title="Season Evolution"
          description="Rating and points per game by season."
          density="dense"
          className="border"
          style={{ borderColor: `${theme.primaryColor}33` }}
        >
          <PlayerSeasonChart data={timeline} sport="BASKETBALL" />
        </DataPanel>

        <DataPanel
          title="Performance Profile"
          description={`Per-game profile — season ${player.selectedSeason}.`}
          density="dense"
          className="border"
          style={{ borderColor: `${theme.primaryColor}33` }}
        >
          <StatRadarChart
            metrics={radarMetrics}
            series={[{ name: player.knownAs, color: theme.primaryColor, values: toRadarProfile(s) }]}
          />
        </DataPanel>
      </div>

      <DataPanel
        title="Detailed Metrics"
        description={`Season averages for ${player.selectedSeason}.`}
        density="dense"
        className="border"
        style={{ borderColor: `${theme.primaryColor}33` }}
      >
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Minutes", value: s.minutesPlayed.toLocaleString("en-US") },
            { label: "Points", value: g.points.toFixed(1) },
            { label: "Rebounds", value: g.rebounds.toFixed(1) },
            { label: "Assists", value: g.assists.toFixed(1) },
            { label: "Steals", value: g.steals.toFixed(1) },
            { label: "Blocks", value: g.blocks.toFixed(1) },
            { label: "FG%", value: `${(s.fieldGoalsPercent ?? 0).toFixed(1)}%` },
            { label: "3P%", value: `${(s.threePointsPercent ?? 0).toFixed(1)}%` },
            { label: "Steals / 48", value: s.per90.shots.toFixed(2) },
            { label: "Blocks / 48", value: s.per90.keyPasses.toFixed(2) },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border bg-surface-muted/40 px-3 py-2.5"
              style={{ borderColor: `${theme.primaryColor}33` }}
            >
              <span className="text-2xs uppercase tracking-wider text-muted-foreground">{item.label}</span>
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">{item.value}</div>
            </div>
          ))}
        </div>
      </DataPanel>
    </>
  );
}

export function PlayerPerformanceSection({ player }: { player: Player }) {
  const s = player.currentSeasonStats;
  const timeline = aggregateSeasonTimeline(player.history, player.sport ?? s.sport);
  const theme = getTeamTheme(player.competitionName, player.teamName);
  const isBasketball = player.sport === "BASKETBALL" || s.sport === "BASKETBALL";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PlayerSeasonSelector
          playerId={player.id}
          availableSeasons={player.availableSeasons}
          selectedSeason={player.selectedSeason}
        />
        <p className="text-xs text-muted-foreground">
          Showing campaign <span className="font-medium text-foreground">{player.selectedSeason}</span>
        </p>
      </div>

      {isBasketball ? (
        <BasketballPerformanceSection player={player} s={s} timeline={timeline} theme={theme} />
      ) : (
        <SoccerPerformanceSection player={player} s={s} timeline={timeline} theme={theme} />
      )}
    </div>
  );
}
