import Link from "next/link";
import { formatInsightDate, type InsightEdition } from "@/lib/insights/catalog";

export function EditionCard({ edition }: { edition: InsightEdition }) {
  return (
    <Link
      href={`/insights/${edition.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-sm border border-border bg-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="aspect-[16/9] bg-[#121212]">
        {edition.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={edition.cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-end p-4">
            <span className="font-display text-2xl font-semibold text-[#fafafa]">{edition.title}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {formatInsightDate(edition.date)}
        </p>
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground group-hover:text-primary">
          {edition.title}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{edition.excerpt}</p>
      </div>
    </Link>
  );
}
