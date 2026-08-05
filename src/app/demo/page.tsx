import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataPanel } from "@/components/data/data-panel";
import { PrototypeBanner } from "@/components/common/prototype-banner";
import { APP_NAME } from "@/lib/config";
import { CURRENT_SEASON, NEXT_EUROPEAN_SEASON, BRAZIL_SEASON_LABEL } from "@/lib/seasons";

export const metadata = { title: `Demo path · ${APP_NAME}` };

const STEPS: { href: string; title: string; why: string }[] = [
  {
    href: "/dashboard",
    title: "1 · Overview",
    why: "Soccer-first lists with sample floors — confirm the desk is populated.",
  },
  {
    href: "/rankings/defenders",
    title: "2 · Defensive Actions",
    why: "Centre-backs / full-backs ranked by Def/90 (≥450′). Names + rates should be non-zero.",
  },
  {
    href: "/rankings/u23",
    title: "3 · U23 prospects",
    why: "Young productive sample — rating rules match methodology.",
  },
  {
    href: "/scouting",
    title: "4 · Scouting filters",
    why: "Role + league filters; open any Big5 profile from the table.",
  },
  {
    href: "/teams?league=bra",
    title: "5 · Clubs · Brasileirão",
    why: `Season ${BRAZIL_SEASON_LABEL} W/D/L from ESPN/DB — not StatsBomb archives.`,
  },
  {
    href: "/shortlist",
    title: "6 · My Players",
    why: "Tag 2–3 players on this device, then Compare.",
  },
  {
    href: "/compare",
    title: "7 · Compare → Report",
    why: "Head-to-head + optional brief — same rating rules as the profile.",
  },
];

export default function DemoPathPage() {
  return (
    <DashboardShell subtitle="Demo">
      <div className="mx-auto max-w-3xl space-y-6">
        <PrototypeBanner />
        <PageHeader
          title="Public demo path"
          description={`Soccer reference workflow · showcase season ${CURRENT_SEASON} · ${NEXT_EUROPEAN_SEASON} rolling in · Brasileirão ${BRAZIL_SEASON_LABEL} live.`}
        />

        <DataPanel title="Seven clicks" density="dense">
          <ul className="space-y-4">
            {STEPS.map((step) => (
              <li key={step.href} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <Link
                  href={step.href}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {step.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{step.why}</p>
              </li>
            ))}
          </ul>
        </DataPanel>

        <DataPanel title="What not to lead with" density="dense">
          <p className="text-sm text-muted-foreground">
            Basketball and American football are secondary desks — thinner coverage on purpose.
            Switch sport only after the soccer path looks solid. Do not open empty NCAA/CFB
            corners as the first impression.
          </p>
        </DataPanel>
      </div>
    </DashboardShell>
  );
}
