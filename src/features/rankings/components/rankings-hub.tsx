import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";

export function RankingsHub() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        { href: "/rankings/u23", title: "Best U23 Players", desc: "Jovens com maior rating na base." },
        { href: "/rankings/finishers", title: "Best Finishers", desc: "Maior produção de gols per 90." },
        { href: "/rankings/creators", title: "Best Creators", desc: "Líderes em assistências per 90." },
        { href: "/rankings/hidden-gems", title: "Hidden Gems", desc: "Alto rating com valor acessível." },
      ].map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-xl border border-border bg-card p-4 shadow-panel transition-colors hover:border-primary/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-sm font-semibold text-foreground">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
              <p className="mt-2 flex items-center gap-1 text-2xs text-muted-foreground">
                <Sparkles className="h-3 w-3" /> Top 20
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        </Link>
      ))}
    </div>
  );
}
