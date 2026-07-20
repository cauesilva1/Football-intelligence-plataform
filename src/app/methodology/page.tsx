import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataPanel } from "@/components/data/data-panel";
import { APP_NAME } from "@/lib/config";
import {
  OPPORTUNITY_MAX_AGE,
  OPPORTUNITY_MAX_VALUE,
  OPPORTUNITY_MIN_RATING,
  PROSPECT_MIN_RATING,
  SOCCER_RATE_MIN_MINUTES,
  SOCCER_RATE_SOFT_CAP,
  U23_MAX_AGE,
} from "@/lib/scoring";
import { SCORE_DEFINITIONS } from "@/lib/score-definitions";

export const metadata = { title: `Methodology · ${APP_NAME}` };

export default function MethodologyPage() {
  return (
    <DashboardShell subtitle="Methodology">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Scoring & data notes"
          description="Transparent prototype methodology — how ratings and opportunity flags are defined today."
        />

        <DataPanel title="Prototype disclaimer" density="dense">
          <p className="text-sm leading-relaxed text-muted-foreground">
            The current version uses a prototype dataset and scoring models that are still being
            refined. This is a portfolio demo, not a live deployment used by professional clubs.
          </p>
        </DataPanel>

        <DataPanel title="Player Rating (soccer)" density="dense">
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              With ≥ {SOCCER_RATE_MIN_MINUTES}&apos;:{" "}
              <code className="text-foreground">6 + goals/90 × 0.35 + assists/90 × 0.25</code>, clamped
              to 5–10. Rates soft-capped at {SOCCER_RATE_SOFT_CAP}.
            </li>
            <li>
              With &lt; {SOCCER_RATE_MIN_MINUTES}&apos;: conservative baseline from raw goals/assists
              (max 7.0) so cameos cannot inflate ratings.
            </li>
            <li>Not Opta / Sofascore — a transparent productivity proxy.</li>
          </ul>
        </DataPanel>

        <DataPanel title="Top Prospect" density="dense">
          <p className="text-sm text-muted-foreground">{SCORE_DEFINITIONS.topProspects}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Thresholds: age ≤ {U23_MAX_AGE}, rating ≥ {PROSPECT_MIN_RATING}, soccer minutes ≥{" "}
            {SOCCER_RATE_MIN_MINUTES}.
          </p>
        </DataPanel>

        <DataPanel title="Best Performers" density="dense">
          <p className="text-sm text-muted-foreground">{SCORE_DEFINITIONS.bestPerformers}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Dashboard list uses rating ≥ 7.5 (and soccer minutes ≥ {SOCCER_RATE_MIN_MINUTES}).
          </p>
        </DataPanel>

        <DataPanel title="Market Opportunity" density="dense">
          <p className="text-sm text-muted-foreground">{SCORE_DEFINITIONS.marketOpportunities}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Thresholds: age ≤ {OPPORTUNITY_MAX_AGE}, rating ≥ {OPPORTUNITY_MIN_RATING}, value ≤ €
            {(OPPORTUNITY_MAX_VALUE / 1_000_000).toFixed(0)}M, soccer minutes ≥{" "}
            {SOCCER_RATE_MIN_MINUTES}.
          </p>
        </DataPanel>

        <DataPanel title="Real vs prototype data" density="dense">
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              <span className="text-foreground">Live / synced:</span> ESPN hubs and match feeds when
              configured; DB season rows when <code>DATA_SOURCE=db</code>.
            </li>
            <li>
              <span className="text-foreground">Derived:</span> Goals/90, Assists/90, proxy ratings,
              prospect / opportunity labels.
            </li>
            <li>
              <span className="text-foreground">Mock:</span> local seed generators when not on DB;
              market values are estimates.
            </li>
          </ul>
        </DataPanel>

        <p className="text-xs text-muted-foreground">
          Full write-up: <code>docs/SCORING.md</code> in the repository.
        </p>
      </div>
    </DashboardShell>
  );
}
