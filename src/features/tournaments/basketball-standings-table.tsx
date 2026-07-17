"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { NbaStandingGroup, NbaStandingRow } from "@/lib/api/espn-nba-standings";
import { cn } from "@/lib/utils";

function TeamCell({ row }: { row: NbaStandingRow }) {
  const content = (
    <div className="flex min-w-0 items-center gap-2">
      {row.crestUrl ? (
        <Image
          src={row.crestUrl}
          alt=""
          width={24}
          height={24}
          className="h-6 w-6 object-contain"
          unoptimized
        />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded bg-secondary text-[9px] font-bold">
          {(row.abbreviation ?? row.teamName.slice(0, 3)).toUpperCase()}
        </span>
      )}
      <span className="truncate font-medium text-foreground">{row.teamName}</span>
    </div>
  );

  if (!row.teamId) return content;

  return (
    <Link
      href={`/teams/${row.teamId}`}
      className="block rounded-md transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {content}
    </Link>
  );
}

function StandingRows({ rows }: { rows: NbaStandingRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70">
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead className="bg-secondary/50 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-2 py-2 text-center font-medium">V</th>
            <th className="px-2 py-2 text-center font-medium">D</th>
            <th className="px-2 py-2 text-center font-medium">PCT</th>
            <th className="px-2 py-2 text-center font-medium">GB</th>
            <th className="px-3 py-2 text-right font-medium">Seq.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.teamName}
              className={
                row.teamId
                  ? "border-t border-border/50 transition-colors hover:bg-secondary/40"
                  : "border-t border-border/50"
              }
            >
              <td className="px-3 py-2 tabular-nums text-muted-foreground">{index + 1}</td>
              <td className="px-3 py-2">
                <TeamCell row={row} />
              </td>
              <td className="px-2 py-2 text-center tabular-nums">{row.wins}</td>
              <td className="px-2 py-2 text-center tabular-nums">{row.losses}</td>
              <td className="px-2 py-2 text-center tabular-nums">
                {row.winPercent > 0 ? row.winPercent.toFixed(3).replace(/^0/, "") : "—"}
              </td>
              <td className="px-2 py-2 text-center tabular-nums text-muted-foreground">
                {row.gamesBehind <= 0 ? "—" : row.gamesBehind.toFixed(1)}
              </td>
              <td className="px-3 py-2 text-right font-medium tabular-nums text-primary">
                {row.streak ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BasketballStandingsTable({
  groups,
  enableConferenceFilter = false,
}: {
  groups: NbaStandingGroup[];
  /** When many conferences (NCAA), show a filter instead of dumping all tables. */
  enableConferenceFilter?: boolean;
}) {
  const useFilter = enableConferenceFilter && groups.length > 3;
  const [selected, setSelected] = useState(() => groups[0]?.label ?? "");

  const activeLabel =
    groups.some((g) => g.label === selected) ? selected : (groups[0]?.label ?? "");

  const activeGroups = useMemo(() => {
    if (!useFilter) return groups;
    const hit = groups.find((g) => g.label === activeLabel);
    return hit ? [hit] : groups.slice(0, 1);
  }, [groups, activeLabel, useFilter]);

  if (!groups.length) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Standings are not available for this league yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {useFilter ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {groups.length} conferences · linked teams open their directory profile
          </p>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Conference
            <select
              value={activeLabel}
              onChange={(event) => setSelected(event.target.value)}
              className={cn(
                "h-9 max-w-[min(100%,18rem)] rounded-lg border border-border bg-card px-3 text-sm text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              )}
            >
              {groups.map((group) => (
                <option key={group.label} value={group.label}>
                  {group.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {activeGroups.map((group) => (
        <section key={group.label} className="space-y-3">
          <h3 className="font-display text-base font-semibold text-foreground">{group.label}</h3>
          <StandingRows rows={group.rows} />
        </section>
      ))}
    </div>
  );
}
