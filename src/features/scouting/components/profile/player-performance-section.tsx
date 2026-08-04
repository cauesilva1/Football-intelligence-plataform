import { Activity, Target, Crosshair, TrendingUp, Shield } from "lucide-react";
import { GlossaryTooltip } from "@/components/common/glossary-tooltip";
import { METRIC_GLOSSARY } from "@/components/common/glossary-copy";
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
  buildBasketballPositionScorecard,
  buildFootballPositionScorecard,
  soccerPositionGroupLabel,
  type SoccerPositionGroup,
} from "@/features/scouting/lib/position-scorecard";
import { toRadarProfile } from "@/lib/normalize";
import {
  AF_RATE_MIN_GAMES,
  AF_RATE_MIN_MINUTES,
  BB_RATE_MIN_GAMES,
  BB_RATE_MIN_MINUTES,
  SOCCER_RATE_MIN_MINUTES,
} from "@/lib/scoring";
import { getTeamTheme, chartSafeTeamColor } from "@/lib/team-theme";
import { ratingColor } from "@/lib/utils";
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
  const ink = chartSafeTeamColor(theme);
  const smallSample = s.minutesPlayed > 0 && s.minutesPlayed < SOCCER_RATE_MIN_MINUTES;
  const scorecard = buildPositionScorecard(player.position, s);
  const ratingMetric = scorecard.metrics.find((m) => m.key === "rating");
  const roleMetrics = scorecard.metrics.filter(
    (m) => m.key !== "minutes" && m.key !== "apps" && m.key !== "rating"
  );
  const detailedMetrics = buildSoccerDetailedMetrics(scorecard.group, s, smallSample);

  return (
    <>
      {smallSample ? (
        <p className="rounded-lg border border-amber-600/25 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Small sample ({s.minutesPlayed}&apos;). Showing season totals until ≥ {SOCCER_RATE_MIN_MINUTES}
          &apos; — per-90 rates and rating stay provisional.
        </p>
      ) : null}

      <DataPanel
        title={scorecard.title}
        description={`${soccerPositionGroupLabel(scorecard.group)} pack for ${player.position} — role-aware metrics.`}
        density="dense"
        className="border"
        style={{ borderColor: `${ink}33` }}
      >
        {/* Asymmetric band: rating anchors the eye; role rates read after it. */}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,15rem)_1fr]">
          <div
            className="flex flex-col rounded-lg border bg-surface-muted/40 px-4 py-3"
            style={{ borderColor: `${ink}44` }}
          >
            <span className="text-2xs uppercase leading-snug tracking-wider text-muted-foreground">
              Season rating
            </span>
            <div className={`font-display text-4xl font-bold tabular-nums ${ratingColor(s.rating)}`}>
              {s.rating.toFixed(1)}
            </div>
            {ratingMetric?.hint ? (
              <p className="mt-0.5 text-2xs text-amber-800/90">{ratingMetric.hint}</p>
            ) : null}
            <dl
              className="mt-auto grid grid-cols-2 gap-2 border-t pt-3"
              style={{ borderColor: `${ink}22` }}
            >
              <div>
                <dt className="text-2xs uppercase tracking-wider text-muted-foreground">Minutes</dt>
                <dd className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {s.minutesPlayed > 0 ? s.minutesPlayed.toLocaleString("en-US") : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wider text-muted-foreground">Apps</dt>
                <dd className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {s.appearances}
                </dd>
              </div>
            </dl>
          </div>

          <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {roleMetrics.map((m) => (
              <div
                key={m.key}
                className="flex min-h-[4.5rem] flex-col rounded-lg border bg-surface-muted/40 px-3 py-2.5"
                style={{ borderColor: `${ink}33` }}
              >
                <span className="line-clamp-2 min-h-[1.75rem] text-2xs uppercase leading-snug tracking-wider text-muted-foreground">
                  {m.label}
                </span>
                <div className="mt-auto font-mono text-base font-semibold tabular-nums text-foreground">
                  {m.value}
                </div>
                {m.hint ? <p className="mt-0.5 text-2xs text-amber-800/90">{m.hint}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </DataPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataPanel
          title="Season Evolution"
          description="Rating, goals/90, and xG/90 aggregated by season."
          density="dense"
          className="border"
          style={{ borderColor: `${ink}33` }}
        >
          <LazyPlayerSeasonChart data={timeline} sport="SOCCER" />
        </DataPanel>

        <DataPanel
          title="Performance Profile"
          description={`Normalized per-90 dimensions — season ${player.selectedSeason}.`}
          density="dense"
          className="border"
          style={{ borderColor: `${ink}33` }}
        >
          <LazyStatRadarChart
            metrics={radarMetrics}
            series={[{ name: player.knownAs, color: ink, values: toRadarProfile(s) }]}
          />
        </DataPanel>
      </div>

      <DataPanel
        title="Detailed Metrics"
        description={`${soccerPositionGroupLabel(scorecard.group)}-first order for ${player.selectedSeason} — season totals and per-90 rates.`}
        density="dense"
        className="border"
        style={{ borderColor: `${ink}33` }}
      >
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {detailedMetrics.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border bg-surface-muted/40 px-3 py-2.5"
              style={{ borderColor: `${ink}33` }}
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

type SoccerDetailedMetric = {
  label: string;
  value: string;
  glossary?: string;
};

const DETAILED_PRIORITY: Record<SoccerPositionGroup, string[]> = {
  ATT: [
    "Appearances",
    "Goals",
    "Assists",
    "Shots",
    "Shots on Target",
    "Shots / 90",
    "xG total",
    "xA total",
    "Key Passes",
    "Key Passes / 90",
    "Dribbles Completed",
    "Dribbles / 90",
  ],
  MID: [
    "Appearances",
    "Assists",
    "Key Passes",
    "Key Passes / 90",
    "Pass Accuracy",
    "Passes",
    "Tackles Won",
    "Tackles Won / 90",
    "xA total",
    "Goals",
    "Dribbles Completed",
    "Dribbles / 90",
  ],
  DEF: [
    "Appearances",
    "Tackles Won",
    "Tackles Won / 90",
    "Interceptions",
    "Interceptions / 90",
    "Duels Won",
    "Pass Accuracy",
    "Passes",
    "Key Passes",
    "Key Passes / 90",
  ],
  GK: [
    "Appearances",
    "Pass Accuracy",
    "Passes",
    "Interceptions",
    "Interceptions / 90",
    "Duels Won",
    "Tackles Won",
    "Tackles Won / 90",
  ],
};

function buildSoccerDetailedMetrics(
  group: SoccerPositionGroup,
  s: Player["currentSeasonStats"],
  smallSample: boolean
): SoccerDetailedMetric[] {
  const items: SoccerDetailedMetric[] = [
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
  ];

  const priority = DETAILED_PRIORITY[group];
  const rank = new Map(priority.map((label, i) => [label, i]));
  return [...items].sort((a, b) => {
    const ra = rank.get(a.label) ?? priority.length + 1;
    const rb = rank.get(b.label) ?? priority.length + 1;
    if (ra !== rb) return ra - rb;
    return 0;
  });
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
  const ink = chartSafeTeamColor(theme);
  const smallSample =
    s.appearances > 0 &&
    (s.appearances < BB_RATE_MIN_GAMES || s.minutesPlayed < BB_RATE_MIN_MINUTES);
  const scorecard = buildBasketballPositionScorecard(player.position, s);
  const ratingMetric = scorecard.metrics.find((m) => m.key === "rating");
  const roleMetrics = scorecard.metrics.filter(
    (m) => m.key !== "games" && m.key !== "mpg" && m.key !== "rating"
  );

  return (
    <>
      {smallSample ? (
        <p className="rounded-lg border border-amber-600/25 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Small sample ({s.appearances} G / {s.minutesPlayed}&apos;). Rating stays provisional until ≥{" "}
          {BB_RATE_MIN_GAMES} games and ≥ {BB_RATE_MIN_MINUTES}&apos;.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Games"
          value={String(s.appearances)}
          icon={Activity}
          accent="info"
          borderColor={ink}
        />
        <MetricCard
          label="Points / Game"
          value={g.points.toFixed(1)}
          icon={Target}
          accent="primary"
          borderColor={ink}
        />
        <MetricCard
          label="Rebounds / Game"
          value={g.rebounds.toFixed(1)}
          icon={Shield}
          accent="warning"
          borderColor={ink}
        />
        <MetricCard
          label="Assists / Game"
          value={g.assists.toFixed(1)}
          icon={TrendingUp}
          accent="info"
          borderColor={ink}
        />
      </div>

      <DataPanel
        title={`${scorecard.title}`}
        description={`Role pack for ${player.position} — same rating rules as list / report.`}
        density="dense"
        className="border"
        style={{ borderColor: `${ink}33` }}
      >
        <div className="mb-3 flex flex-wrap items-baseline gap-3">
          <span className={`font-mono text-2xl font-semibold tabular-nums ${ratingColor(s.rating)}`}>
            {ratingMetric?.value ?? s.rating.toFixed(1)}
          </span>
          {ratingMetric?.hint ? (
            <span className="text-2xs text-amber-800/90">{ratingMetric.hint}</span>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {roleMetrics.map((item) => (
            <div
              key={item.key}
              className="rounded-lg border bg-surface-muted/40 px-3 py-2.5"
              style={{ borderColor: `${ink}33` }}
            >
              <span className="text-2xs uppercase tracking-wider text-muted-foreground">
                {item.label}
              </span>
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </DataPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataPanel
          title="Season Evolution"
          description="Rating and points per game by season."
          density="dense"
          className="border"
          style={{ borderColor: `${ink}33` }}
        >
          <LazyPlayerSeasonChart data={timeline} sport="BASKETBALL" />
        </DataPanel>

        <DataPanel
          title="Performance Profile"
          description={`Per-game profile — season ${player.selectedSeason}.`}
          density="dense"
          className="border"
          style={{ borderColor: `${ink}33` }}
        >
          <LazyStatRadarChart
            metrics={radarMetrics}
            series={[{ name: player.knownAs, color: ink, values: toRadarProfile(s) }]}
          />
        </DataPanel>
      </div>

      <DataPanel
        title="Detailed Metrics"
        description={`Season averages for ${player.selectedSeason}.`}
        density="dense"
        className="border"
        style={{ borderColor: `${ink}33` }}
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
              style={{ borderColor: `${ink}33` }}
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
  const ink = chartSafeTeamColor(theme);
  const totalYards = s.totalYards ?? s.points ?? 0;
  const touchdowns = s.touchdowns ?? s.goals ?? 0;
  const smallSample =
    s.appearances > 0 &&
    (s.appearances < AF_RATE_MIN_GAMES || s.minutesPlayed < AF_RATE_MIN_MINUTES);
  const scorecard = buildFootballPositionScorecard(player.position, s);

  return (
    <>
      {smallSample ? (
        <p className="rounded-lg border border-amber-600/25 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Small sample ({s.appearances} G). Rating stays provisional until ≥ {AF_RATE_MIN_GAMES}{" "}
          games and ≥ {AF_RATE_MIN_MINUTES}&apos; proxy minutes.
        </p>
      ) : null}

      <DataPanel
        title={scorecard.title}
        description="Role-aware production snapshot."
        density="dense"
        className="border"
        style={{ borderColor: `${ink}33` }}
      >
        <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-6">
          {scorecard.metrics.map((m) => (
            <div key={m.key} className="rounded-lg border border-border/60 bg-surface-muted/30 px-3 py-2">
              <p className="text-2xs uppercase tracking-wider text-muted-foreground">{m.label}</p>
              <p className="font-mono text-sm font-semibold tabular-nums">{m.value}</p>
            </div>
          ))}
        </div>
      </DataPanel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Games"
          value={String(s.appearances)}
          icon={Activity}
          accent="info"
          borderColor={ink}
        />
        <MetricCard
          label="Total Yards"
          value={totalYards.toLocaleString("en-US")}
          icon={Target}
          accent="primary"
          borderColor={ink}
        />
        <MetricCard
          label="Touchdowns"
          value={String(touchdowns)}
          icon={Crosshair}
          accent="warning"
          borderColor={ink}
        />
        <MetricCard
          label="Tackles"
          value={String(s.tacklesWon)}
          icon={Shield}
          accent="info"
          borderColor={ink}
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
          style={{ borderColor: `${ink}33` }}
        >
          <LazyPlayerSeasonChart data={timeline} sport="AMERICAN_FOOTBALL" />
        </DataPanel>

        <DataPanel
          title="Performance Profile"
          description={`Production profile — ${player.selectedSeason} season.`}
          density="dense"
          className="border"
          style={{ borderColor: `${ink}33` }}
        >
          <LazyStatRadarChart
            metrics={radarMetrics}
            series={[{ name: player.knownAs, color: ink, values: toRadarProfile(s) }]}
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
        style={{ borderColor: `${ink}33` }}
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
              style={{ borderColor: `${ink}33` }}
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
