import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataPanel } from "@/components/data/data-panel";
import { APP_NAME } from "@/lib/config";

export const metadata = {
  title: `Product overview · ${APP_NAME}`,
  robots: { index: false, follow: false },
};

const FEATURES: { href: string; title: string; body: string }[] = [
  {
    href: "/dashboard",
    title: "Overview dashboard",
    body: "Top prospects, best performers, and market opportunities, each built from a minimum sample so a handful of games cannot top a list.",
  },
  {
    href: "/scouting",
    title: "Scouting search",
    body: "Filter players by role, league, age, rating, and minutes, then open a full profile with per-90 stats, season history, and league percentiles.",
  },
  {
    href: "/rankings",
    title: "Rankings",
    body: "Ready-made lists such as U23 prospects and defensive actions per 90, with the sample rules shown next to every list.",
  },
  {
    href: "/recruitment",
    title: "Recruitment search",
    body: "Describe the profile you need and get ranked candidates scored for fit against that brief.",
  },
  {
    href: "/compare",
    title: "Player comparison",
    body: "Put two players side by side using the same rating rules as their profiles.",
  },
  {
    href: "/shortlist",
    title: "My Players",
    body: "Tag players as priority, watch, or reject and keep notes. The list is saved in your browser, so no account is needed.",
  },
  {
    href: "/reports",
    title: "Scout briefs",
    body: "Generate a written scouting brief for a player. The overall rating always comes from the platform's rating rules, and missing data is stated instead of filled in.",
  },
  {
    href: "/teams",
    title: "Clubs, franchises, and tournaments",
    body: "Browse squads, standings, and recent results alongside the player data.",
  },
];

export default function ProductOverviewPage() {
  return (
    <DashboardShell subtitle="Overview">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title={`What ${APP_NAME} does`}
          description="A scouting workspace that turns match statistics into shortlists, comparisons, and written briefs, with the sample rules visible."
        />

        <DataPanel title="Who it is for" density="dense">
          <p className="text-sm text-muted-foreground">
            Scouts, analysts, and recruitment staff who need to find players, check them against peers,
            and explain a recommendation. Soccer is the primary desk; basketball and American football
            run on the same workflow with smaller samples and partial coverage.
          </p>
        </DataPanel>

        <DataPanel title="Key features" density="dense">
          <ul className="space-y-4">
            {FEATURES.map((feature) => (
              <li
                key={feature.href}
                className="border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <Link
                  href={feature.href}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {feature.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{feature.body}</p>
              </li>
            ))}
          </ul>
        </DataPanel>

        <DataPanel title="How the numbers are built" density="dense">
          <p className="text-sm text-muted-foreground">
            Ratings use fixed formulas with a minimum number of games or minutes, and players below that
            sample are marked provisional. Read the full rules on the{" "}
            <Link href="/methodology" className="text-primary hover:underline">
              methodology page
            </Link>
            .
          </p>
        </DataPanel>
      </div>
    </DashboardShell>
  );
}
