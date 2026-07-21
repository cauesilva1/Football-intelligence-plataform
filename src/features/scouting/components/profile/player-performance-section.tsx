import { Activity, Target, Crosshair, TrendingUp, Shield } from "lucide-react";
import { GlossaryTooltip, METRIC_GLOSSARY } from "@/components/common/glossary-tooltip";
import { MetricCard } from "@/components/data/metric-card";
import { DataPanel } from "@/components/data/data-panel";
import {
  LazyPlayerSeasonChart,
  LazyStatRadarChart,
} from "@/features/scouting/components/profile/lazy-performance-charts";
import { aggregateSeasonTimeline } from "@/features/scouting/lib/season-history";
import { PlayerSeasonSelector } from "@/features/scouting/components/profile/player-season-selector";
import {
  buildPositionScorecard,
  soccerPositionGroup,
  soccerPositionGroupLabel,
} from "@/features/scouting/lib/position-scorecard";
import { toRadarProfile } from "@/lib/normalize";
import { per90 } from "@/lib/metrics/per90";
import { SOCCER_RATE_MIN_MINUTES, SOCCER_RATE_SOFT_CAP } from "@/lib/scoring";
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
  const smallSample = s.minutesPlayed > 0 && s.minutesPlayed < SOCCER_RATE_MIN_MINUTES;
  const scorecard = buildPositionScorecard(player.position, s);
  const group = soccerPositionGroup(player.position);
  const rateLabel = (total: number, totalLabel: string, rateLabelText: string) => {
    if (smallSample) {
      return { label: totalLabel, value: String(total) };
    }
    return {
      label: rateLabelText,
      value: per90(total, s.minutesPlayed, { softCap: SOCCER_RATE_SOFT_CAP }).toFixed(2),
    };
  };
  const highlight =
    group === "DEF" || group === "GK"
      ? [
          rateLabel(s.tacklesWon, "Tackles", "Tackles / 90"),
          rateLabel(s.interceptions, "Interceptions", "Interceptions / 90"),
          {
            label: "Pass accuracy",
            value: s.passAccuracy > 0 ? `${s.passAccuracy.toFixed(0)}%` : "—",
          },
        ]
      : [
          rateLabel(s.goals, "Goals", "Goals / 90"),
          smallSample
            ? { label: "xG", value: s.xG.toFixed(2) }
            : {
                label: "xG / 90",
                value: (s.minutesPlayed > 0 ? (s.xG / s.minutesPlayed) * 90 : 0).toFixed(2),
              },
          rateLabel(s.assists, "Assists", "Assists / 90"),
        ];

  return (
    <>
      {smallSample ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
          Small sample ({s.minutesPlayed}&apos;). Showing season totals until ≥ {SOCCER_RATE_MIN_MINUTES}
          &apos; — per-90 rates and rating stay provisional.
        </p>
      ) : null}

      <DataPanel
        title={scorecard.title}
        description={`${soccerPositionGroupLabel(scorecard.group)} pack for ${player.position} — role-aware metrics.`}
        density="dense"
        className="border"
        style={{ borderColor: `${theme.primaryColor}33` }}
      >
        <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {scorecard.metrics.map((m) => (
            <div
              key={m.key}
              className="flex min-h-[4.5rem] flex-col rounded-lg border bg-surface-muted/40 px-3 py-2.5"
              style={{ borderColor: `${theme.primaryColor}33` }}
            >
              <span className="line-clamp-2 min-h-[1.75rem] text-2xs uppercase leading-snug tracking-wider text-muted-foreground">
                {m.label}
              </span>
              <div className="mt-auto font-mono text-sm font-semibold tabular-nums text-foreground">
                {m.value}
              </div>
              {m.hint ? <p className="mt-0.5 text-[10px] text-amber-200/80">{m.hint}</p> : null}
            </div>
          ))}
        </div>
      </DataPanel>

      <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Minutes"
          value={s.minutesPlayed.toLocaleString("en-US")}
          icon={Activity}
          accent="info"
          borderColor={theme.primaryColor}
        />
        <MetricCard
          label={highlight[0].label}
          value={highlight[0].value}
          icon={Target}
          accent="primary"
          borderColor={theme.primaryColor}
        />
        <MetricCard
          label={highlight[1].label}
          value={highlight[1].value}
          icon={Crosshair}
          accent="warning"
          borderColor={theme.primaryColor}
        />
        <MetricCard
          label={highlight[2].label}
          value={highlight[2].value}
          icon={group === "DEF" || group === "GK" ? Shield : TrendingUp}
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
          <LazyPlayerSeasonChart data={timeline} sport="SOCCER" />
        </DataPanel>

        <DataPanel
          title="Performance Profile"
          description={`Normalized per-90 dimensions — season ${player.selectedSeason}.`}
          density="dense"
          className="border"
          style={{ borderColor: `${theme.primaryColor}33` }}
        >
          <LazyStatRadarChart
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
            { label: "Shots", value: String(s.shots) },
            { label: "Shots on Target", value: String(s.shotsOnTarget) },
            {
              label: "Shots / 90",
              value: smallSample ? "—" : s.per90.shots.toFixed(2),
            },
            { label: "Key Passes", value: String(s.keyPasses) },
            {
              label: "Key Passes / 90",
              value: smallSample ? "—" : s.per90.keyPasses.toFixed(2),
            },
            {
              label: "Passes",
              value: s.passes > 0 ? String(s.passes) : "—",
            },
            {
              label: "Pass Accuracy",
              value: s.passAccuracy > 0 ? `${s.passAccuracy.toFixed(0)}%` : "—",
            },
            { label: "Dribbles Completed", value: String(s.dribblesCompleted) },
            {
              label: "Dribbles / 90",
              value: smallSample ? "—" : s.per90.dribbles.toFixed(2),
            },
            { label: "xG total", value: s.xG.toFixed(2), glossary: METRIC_GLOSSARY.xG },
            { label: "xA total", value: s.xA.toFixed(2), glossary: METRIC_GLOSSARY.xA },
            {
              label: "Duels Won",
              value: s.duelsWonPct > 0 ? `${s.duelsWonPct.toFixed(0)}%` : "—",
            },
            { label: "Tackles Won", value: String(s.tacklesWon) },
            {
              label: "Tackles Won / 90",
              value: smallSample ? "—" : s.per90.tackles.toFixed(2),
            },
            { label: "Interceptions", value: String(s.interceptions) },
            {
              label: "Interceptions / 90",
              value: smallSample ? "—" : s.per90.interceptions.toFixed(2),
            },
            { label: "Yellow Cards", value: String(s.yellowCards) },
            { label: "Red Cards", value: String(s.redCards) },
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
          <LazyPlayerSeasonChart data={timeline} sport="BASKETBALL" />
        </DataPanel>

        <DataPanel
          title="Performance Profile"
          description={`Per-game profile — season ${player.selectedSeason}.`}
          density="dense"
          className="border"
          style={{ borderColor: `${theme.primaryColor}33` }}
        >
          <LazyStatRadarChart
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

function AmericanFootballPerformanceSection({
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
  const radarMetrics = [...getSportConfig("AMERICAN_FOOTBALL").ui.radarMetrics];
  const totalYards = s.totalYards ?? s.points ?? 0;
  const touchdowns = s.touchdowns ?? s.goals ?? 0;

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
          label="Total Yards"
          value={totalYards.toLocaleString("en-US")}
          icon={Target}
          accent="primary"
          borderColor={theme.primaryColor}
        />
        <MetricCard
          label="Touchdowns"
          value={String(touchdowns)}
          icon={Crosshair}
          accent="warning"
          borderColor={theme.primaryColor}
        />
        <MetricCard
          label="Tackles"
          value={String(s.tacklesWon)}
          icon={Shield}
          accent="info"
          borderColor={theme.primaryColor}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataPanel
          title="Season Progression"
          description={
            s.appearances === 0
              ? "The current/planned season has no games yet — actual production is available in the previous season."
              : "Rating and yards by season (previous season with production plus current season when games are available)."
          }
          density="dense"
          className="border"
          style={{ borderColor: `${theme.primaryColor}33` }}
        >
          <LazyPlayerSeasonChart data={timeline} sport="AMERICAN_FOOTBALL" />
        </DataPanel>

        <DataPanel
          title="Performance Profile"
          description={`Production profile — ${player.selectedSeason} season.`}
          density="dense"
          className="border"
          style={{ borderColor: `${theme.primaryColor}33` }}
        >
          <LazyStatRadarChart
            metrics={radarMetrics}
            series={[{ name: player.knownAs, color: theme.primaryColor, values: toRadarProfile(s) }]}
          />
        </DataPanel>
      </div>

      <DataPanel
        title="Detailed Metrics"
        description={
          s.appearances === 0
            ? `${player.selectedSeason} has no games yet (upcoming stub). Select the previous season to view ESPN production.`
            : `Season totals for ${player.selectedSeason}.`
        }
        density="dense"
        className="border"
        style={{ borderColor: `${theme.primaryColor}33` }}
      >
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Pass Yards", value: (s.passingYards ?? 0).toLocaleString("en-US") },
            { label: "Rush Yards", value: (s.rushingYards ?? 0).toLocaleString("en-US") },
            { label: "Rec Yards", value: (s.receivingYards ?? 0).toLocaleString("en-US") },
            { label: "Touchdowns", value: String(touchdowns) },
            { label: "Receptions", value: String(s.assists) },
            { label: "Comp %", value: `${s.passAccuracy.toFixed(1)}%` },
            { label: "Tackles", value: String(s.tacklesWon) },
            { label: "Sacks", value: (s.sacks ?? 0).toFixed(1) },
            { label: "INTs", value: String(s.interceptions) },
            { label: "Rating", value: s.rating.toFixed(2) },
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
  const sport = player.sport ?? s.sport;

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

      {sport === "BASKETBALL" ? (
        <BasketballPerformanceSection player={player} s={s} timeline={timeline} theme={theme} />
      ) : sport === "AMERICAN_FOOTBALL" ? (
        <AmericanFootballPerformanceSection player={player} s={s} timeline={timeline} theme={theme} />
      ) : (
        <SoccerPerformanceSection player={player} s={s} timeline={timeline} theme={theme} />
      )}
    </div>
  );
}
