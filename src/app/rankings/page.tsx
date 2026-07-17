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
          title={
            isBasketball || isAmericanFootball ? "Rankings curados" : "Curated Rankings"
          }
          description={
            isAmericanFootball
              ? "Listas para gridiron: prospects, QBs, skill, defesa e Cap bargains. Preenchem conforme o elenco for sincronizado."
              : isBasketball
                ? "Listas prontas para scouting: pontuação, armadores, rebotes, prospects e bargains."
                : "Pre-configured lists for fast scouting by player profile."
          }
        />
        <RankingsHub sport={ui.rankingPresetSport} />
      </div>
    </DashboardShell>
  );
}
