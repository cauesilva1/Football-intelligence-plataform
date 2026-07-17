import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  renderCompetitionHub,
  resolveCompetitionTitleFromSlug,
  resolveSportFromCompetitionSlug,
} from "@/features/tournaments/sport-hub-dispatch";
import { APP_NAME } from "@/lib/config";
import { redirect } from "next/navigation";

// Must be a numeric literal — Next cannot statically analyze imported revalidate values.
export const revalidate = 180;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const title = await resolveCompetitionTitleFromSlug(slug);
  return { title: title ? `${title} · ${APP_NAME}` : `Tournament · ${APP_NAME}` };
}

export default async function CompetitionPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sport = resolveSportFromCompetitionSlug(slug);
  if (!sport) redirect("/tournaments");

  const query = await searchParams;
  const seasonRaw = typeof query.season === "string" ? Number(query.season) : undefined;
  const seasonYear = seasonRaw && Number.isFinite(seasonRaw) ? seasonRaw : undefined;

  const { subtitle, node } = await renderCompetitionHub({ sport, slug, seasonYear });

  return <DashboardShell subtitle={subtitle}>{node}</DashboardShell>;
}
