import { DashboardShell } from "@/components/layout/dashboard-shell";
import { renderTournamentsIndex } from "@/features/tournaments/sport-hub-dispatch";
import { getServerSport } from "@/lib/sport-server";
import { getSportConfig } from "@/lib/sport-registry";
import { APP_NAME } from "@/lib/config";

export const metadata = { title: `Tournaments · ${APP_NAME}` };

export const revalidate = 300;

export default async function TournamentsPage() {
  const sport = await getServerSport();
  const { ui } = getSportConfig(sport);

  return (
    <DashboardShell subtitle={ui.tournamentsSubtitle}>
      {renderTournamentsIndex(sport)}
    </DashboardShell>
  );
}
