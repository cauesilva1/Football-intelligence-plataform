import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { RankingsHub } from "@/features/rankings/components/rankings-hub";
import { getServerSport } from "@/lib/sport-server";
import { getSportConfig } from "@/lib/sport-registry";
import { APP_NAME } from "@/lib/config";

export const metadata = { title: `Rankings · ${APP_NAME}` };

export default async function RankingsPage() {
  const sport = await getServerSport();
  const { ui } = getSportConfig(sport);
  const isBasketball = sport === "BASKETBALL";
  const isAmericanFootball = sport === "AMERICAN_FOOTBALL";

  return (
    <DashboardShell subtitle="Rankings">
      <div className="space-y-6">
        <PageHeader
          title="Curated Rankings"
          description={
            isAmericanFootball
              ? "Gridiron lists: prospects, QBs, skill, defense, and cap bargains. They populate as rosters sync."
              : isBasketball
                ? "Ready-made scouting lists: scoring, guards, rebounds, prospects, and bargains."
                : "Soccer reference lists — U23, finishers, creators, hidden gems. Other sports follow the same playbook."
          }
        />
        <RankingsHub sport={ui.rankingPresetSport} />
      </div>
    </DashboardShell>
  );
}
