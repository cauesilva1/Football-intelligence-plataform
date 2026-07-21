import Link from "next/link";
import { Sparkles, Calendar, Star, TrendingUp, Shield, ArrowRight } from "lucide-react";
import { queryDashboardOverview } from "@/features/analytics/queries/dashboard";
import { MetricCard } from "@/components/data/metric-card";
import { GlossaryTooltip } from "@/components/common/glossary-tooltip";
import { appConfig } from "@/lib/config";
import { getServerSport } from "@/lib/sport-server";
import { SCORE_DEFINITIONS } from "@/lib/score-definitions";

export async function DashboardStatsSection() {
  const [overview, sport] = await Promise.all([queryDashboardOverview(), getServerSport()]);
  const isBasketball = sport === "BASKETBALL";
  const isAmericanFootball = sport === "AMERICAN_FOOTBALL";

  return (
    <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {/* Anchor tile — the database itself, on the sport-themed surface */}
      <Link
        href="/players"
        className="sport-hero group flex min-h-[5.75rem] flex-col justify-between rounded-xl border border-primary/20 p-4 shadow-panel sm:col-span-2 xl:col-span-2"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-2xs font-medium uppercase leading-snug tracking-wider text-muted-foreground">
            Players monitored
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
        <div>
          <div className="font-display text-3xl font-bold tabular-nums text-foreground md:text-4xl">
            {overview.totalPlayers.toLocaleString("en-US")}
          </div>
          <p className="mt-1 text-2xs leading-snug text-muted-foreground">
            {isAmericanFootball
              ? "On-demand roster sync"
              : `${appConfig.season} database · ${overview.totalTeams} ${
                  isBasketball || isAmericanFootball ? "franchises" : "clubs"
                }`}
          </p>
        </div>
      </Link>
      <MetricCard
        label={
          <GlossaryTooltip label="Top Prospects" description={SCORE_DEFINITIONS.topProspects} />
        }
        value={String(overview.topProspectsCount)}
        icon={Sparkles}
        accent="primary"
        trend="U23 · rating ≥ 7.0 · ≥450'"
      />
      <MetricCard
        label="Average Age"
        value={overview.avgAge.toFixed(1)}
        icon={Calendar}
        accent="warning"
        trend="Database average"
      />
      <MetricCard
        label={
          <GlossaryTooltip
            label="Best Performers"
            description={SCORE_DEFINITIONS.bestPerformers}
          />
        }
        value={String(overview.bestPerformersCount)}
        icon={Star}
        accent="info"
        trend="Rating ≥ 7.5"
      />
      {isBasketball ? (
        <MetricCard
          label="Total Points (avg)"
          value={String(Math.round(overview.totalGoals))}
          icon={TrendingUp}
          accent="negative"
          trend="Sum of per-game averages"
        />
      ) : isAmericanFootball ? (
        <MetricCard
          label="Franchises / Programs"
          value={String(overview.totalTeams)}
          icon={Shield}
          accent="negative"
          trend={
            overview.totalPlayers === 0
              ? "Open a team to sync its roster"
              : "Cap Hit · bargains on scouting"
          }
        />
      ) : (
        <MetricCard
          label={
            <GlossaryTooltip
              label="Market Opportunities"
              description={SCORE_DEFINITIONS.marketOpportunities}
            />
          }
          value={String(overview.marketOpportunitiesCount)}
          icon={TrendingUp}
          accent="negative"
          trend="Rating ≥ 7.2 · ≤ €8M · ≥450'"
        />
      )}
    </div>
  );
}
