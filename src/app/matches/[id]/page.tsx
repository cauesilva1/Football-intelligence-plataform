import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  renderSportMatchDetail,
  resolveSportMatchTitle,
} from "@/features/matches/sport-match-dispatch";
import { resolveSportFromMatchId } from "@/features/matches/resolve-match-sport";
import { getServerSport } from "@/lib/sport-server";
import { APP_NAME } from "@/lib/config";

export const revalidate = 120;

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const sport = resolveSportFromMatchId(id) ?? (await getServerSport());
  const title = await resolveSportMatchTitle(sport, id);
  return {
    title: title ? `${title} · ${APP_NAME}` : `Match · ${APP_NAME}`,
  };
}

export default async function MatchPage({ params }: PageProps) {
  const { id } = await params;
  const sport = resolveSportFromMatchId(id) ?? (await getServerSport());
  const node = await renderSportMatchDetail(sport, id);

  return <DashboardShell subtitle="Match">{node}</DashboardShell>;
}
