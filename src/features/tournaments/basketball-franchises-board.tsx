import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { BasketballHubFranchise } from "@/lib/tournaments/basketball-hub-data";

export function BasketballFranchisesBoard({
  franchises,
  emptyLabel = "No franchises found in the database.",
  directoryHref,
}: {
  franchises: BasketballHubFranchise[];
  emptyLabel?: string;
  directoryHref?: string;
}) {
  if (!franchises.length) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
        {directoryHref ? (
          <p className="text-center text-sm">
            <Link href={directoryHref} className="font-medium text-primary hover:underline">
              Open full directory
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {franchises.length} {franchises.length === 1 ? "team" : "teams"} in the database — tap for profile and roster.
        </p>
        {directoryHref ? (
          <Link
            href={directoryHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all in directory
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {franchises.map((team) => (
          <Link
            key={team.id}
            href={`/teams/${team.id}`}
            className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/80 px-4 py-3 transition-all hover:border-primary/40 hover:shadow-panel"
          >
            {team.crestUrl ? (
              <Image
                src={team.crestUrl}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
                unoptimized
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-xs font-bold">
                {team.shortName.slice(0, 3).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-foreground">
                {team.name}
              </p>
              <p className="text-[11px] text-muted-foreground">{team.shortName}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
