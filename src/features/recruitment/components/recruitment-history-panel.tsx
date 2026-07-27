import Link from "next/link";
import { fetchRecruitmentBriefHistory } from "@/lib/actions/workspace";

function formatBriefLabel(brief: {
  position: string;
  maxAge?: number;
  maxMarketValue?: number;
  league?: string;
}): string {
  const parts = [brief.position];
  if (brief.maxAge != null) parts.push(`≤${brief.maxAge}yo`);
  if (brief.maxMarketValue != null) {
    parts.push(`≤$${Math.round(brief.maxMarketValue / 1_000_000)}M`);
  }
  if (brief.league) parts.push(brief.league);
  return parts.join(" · ");
}

function buildBriefHref(brief: {
  position: string;
  maxAge?: number;
  maxMarketValue?: number;
  minRating?: number;
  league?: string;
  limit?: number;
}): string {
  const params = new URLSearchParams({ position: brief.position });
  if (brief.maxAge != null) params.set("maxAge", String(brief.maxAge));
  if (brief.maxMarketValue != null) params.set("maxValue", String(brief.maxMarketValue));
  if (brief.minRating != null) params.set("minRating", String(brief.minRating));
  if (brief.league) params.set("league", brief.league);
  if (brief.limit != null) params.set("limit", String(brief.limit));
  return `/recruitment?${params.toString()}`;
}

export async function RecruitmentHistoryPanel() {
  const runs = await fetchRecruitmentBriefHistory(6);
  if (runs.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface-muted/20 p-4">
      <h2 className="text-sm font-semibold text-foreground">Recent searches</h2>
      <p className="mt-1 text-2xs text-muted-foreground">
        Saved to your anonymous workspace — no account required in demo mode.
      </p>
      <ul className="mt-3 space-y-2">
        {runs.map((run) => (
          <li key={run.id}>
            <Link
              href={buildBriefHref(run.brief)}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs transition-colors hover:border-primary/30"
            >
              <span className="font-medium text-foreground">{formatBriefLabel(run.brief)}</span>
              <span className="text-2xs text-muted-foreground">
                {run.resultCount} hits · {new Date(run.createdAt).toLocaleDateString()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
