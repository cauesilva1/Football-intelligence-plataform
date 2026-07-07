import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RankingView } from "@/features/rankings/components/ranking-view";
import { getRankingPreset, type RankingSlug } from "@/features/rankings/lib/presets";
import { ScoutingTableSkeleton } from "@/features/scouting/components/scouting-table-skeleton";
import { notFound } from "next/navigation";

const SLUGS: RankingSlug[] = ["u23", "finishers", "creators", "hidden-gems"];

export async function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const preset = getRankingPreset(slug);
  return { title: preset ? `${preset.title} · Rankings` : "Rankings" };
}

export default async function RankingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const preset = getRankingPreset(slug);
  if (!preset) notFound();

  const pageRaw = query.page;
  const page = Number(Array.isArray(pageRaw) ? pageRaw[0] : pageRaw) || 1;
  const filters = { ...preset.filters, page };
  const suspenseKey = JSON.stringify(filters);

  return (
    <DashboardShell subtitle={preset.title}>
      <Suspense key={suspenseKey} fallback={<ScoutingTableSkeleton rows={20} />}>
        <RankingView preset={preset} filters={filters} />
      </Suspense>
    </DashboardShell>
  );
}
