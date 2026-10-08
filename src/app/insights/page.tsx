import type { Metadata } from "next";
import { InsightsShell } from "@/features/insights/components/insights-shell";
import { EmptyState } from "@/components/common/empty-state";
import { EditionCard } from "@/features/insights/components/edition-card";
import { NewsletterSignup } from "@/features/insights/components/newsletter-signup";
import { APP_NAME } from "@/lib/config";
import { loadInsights } from "@/lib/insights/catalog";

export const metadata: Metadata = {
  title: `Insights · ${APP_NAME}`,
  description:
    "OmniScout Insights is a biweekly sports-analytics newsletter. Each edition answers one question with data and one chart.",
};

export default function InsightsPage() {
  const editions = loadInsights();

  return (
    <InsightsShell>
      <header className="editorial-pagehead">
        <div>
          <p className="desk-kicker">Newsletter</p>
          <h1 className="editorial-pagehead-title">Insights</h1>
          <p className="editorial-pagehead-lede">
            A biweekly sports-analytics letter. One question per edition, answered with the data and one chart.
            The archive lives here; email delivery stays on Substack.
          </p>
        </div>
      </header>

      {editions.length === 0 ? (
        <EmptyState
          icon="file"
          title="No editions yet"
          description="The first letter is still being written. It will show up here when it is ready."
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {editions.map((edition) => (
            <li key={edition.slug}>
              <EditionCard edition={edition} />
            </li>
          ))}
        </ul>
      )}

      <NewsletterSignup />
    </InsightsShell>
  );
}
