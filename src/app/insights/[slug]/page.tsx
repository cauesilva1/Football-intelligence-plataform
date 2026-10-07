import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { InsightBody } from "@/features/insights/components/insight-body";
import { NewsletterSignup } from "@/features/insights/components/newsletter-signup";
import { APP_NAME } from "@/lib/config";
import { formatInsightDate, getInsight, loadInsights } from "@/lib/insights/catalog";

export function generateStaticParams() {
  return loadInsights().map((edition) => ({ slug: edition.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const edition = getInsight(slug);
  if (!edition) return { title: `Insights · ${APP_NAME}` };
  return {
    title: `${edition.title} · Insights · ${APP_NAME}`,
    description: edition.excerpt,
  };
}

export default async function InsightArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const edition = getInsight(slug);
  if (!edition) notFound();

  return (
    <DashboardShell subtitle="Insights">
      <article className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="editorial-pagehead">
          <div>
            <p className="desk-kicker">
              <Link href="/insights" className="hover:underline">
                Insights
              </Link>
              <span className="text-muted-foreground"> · {formatInsightDate(edition.date)}</span>
            </p>
            <h1 className="editorial-pagehead-title">{edition.title}</h1>
            <p className="editorial-pagehead-lede">{edition.excerpt}</p>
          </div>
        </header>

        <InsightBody blocks={edition.blocks} />
        <NewsletterSignup />
      </article>
    </DashboardShell>
  );
}
