import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RankingView } from "@/features/rankings/components/ranking-view";
import { allRankingSlugs, getRankingPreset } from "@/features/rankings/lib/presets";
import { ScoutingTableSkeleton } from "@/features/scouting/components/scouting-table-skeleton";
import { getServerSport } from "@/lib/sport-server";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return allRankingSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sport = await getServerSport();
  const preset = getRankingPreset(slug, sport);
  return { title: preset ? `${preset.title} · Rankings` : "Rankings" };
}

export default async function RankingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query, sport] = await Promise.all([params, searchParams, getServerSport()]);
  const preset = getRankingPreset(slug, sport);
  if (!preset) notFound();

  const pageRaw = query.page;
  const page = Number(Array.isArray(pageRaw) ? pageRaw[0] : pageRaw) || 1;
  const filters = { ...preset.filters, sport, page };
  const suspenseKey = JSON.stringify(filters);

  return (
    <DashboardShell subtitle={preset.title}>
      <Suspense key={suspenseKey} fallback={<ScoutingTableSkeleton rows={20} />}>
        <RankingView preset={preset} filters={filters} sport={sport} />
      </Suspense>
    </DashboardShell>
  );
}
