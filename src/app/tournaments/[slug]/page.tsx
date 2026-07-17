import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  renderCompetitionHub,
  resolveCompetitionTitle,
} from "@/features/tournaments/sport-hub-dispatch";
import { getServerSport } from "@/lib/sport-server";
import { APP_NAME } from "@/lib/config";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const sport = await getServerSport();
  const title = await resolveCompetitionTitle(sport, slug);
  return { title: title ? `${title} · ${APP_NAME}` : `Torneio · ${APP_NAME}` };
}

export default async function CompetitionPage({ params, searchParams }: PageProps) {
  const sport = await getServerSport();
  const { slug } = await params;
  const query = await searchParams;
  const seasonRaw = typeof query.season === "string" ? Number(query.season) : undefined;
  const seasonYear = seasonRaw && Number.isFinite(seasonRaw) ? seasonRaw : undefined;

  const { subtitle, node } = await renderCompetitionHub({ sport, slug, seasonYear });

  return <DashboardShell subtitle={subtitle}>{node}</DashboardShell>;
}
