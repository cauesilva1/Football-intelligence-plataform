import { DashboardShell } from "@/components/layout/dashboard-shell";
import { renderCompetitionHub, renderTournamentsIndex } from "@/features/tournaments/sport-hub-dispatch";
import { getServerSport } from "@/lib/sport-server";
import { getSportConfig } from "@/lib/sport-registry";
import { competitionCatalog, tournamentsLanding } from "@/lib/tournaments/landing";
import { APP_NAME } from "@/lib/config";

export const metadata = { title: `Tournaments · ${APP_NAME}` };

export const revalidate = 300;

export default async function TournamentsPage() {
  const sport = await getServerSport();
  const { ui, hubKind } = getSportConfig(sport);
  const landing = tournamentsLanding(competitionCatalog(hubKind));

  if (landing.kind === "hub") {
    const hub = await renderCompetitionHub({ sport, slug: landing.slug });
    return <DashboardShell subtitle={hub.subtitle}>{hub.node}</DashboardShell>;
  }

  return (
    <DashboardShell subtitle={ui.tournamentsSubtitle}>
      {renderTournamentsIndex(sport)}
    </DashboardShell>
  );
}
