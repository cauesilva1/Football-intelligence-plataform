import type { AggregatedTeamStats } from "@/lib/statsbomb/aggregate-team-stats";
import type { StandingGroup } from "@/lib/tournaments/competition-hub-data";
import { NationalTeamCrest } from "@/features/tournaments/components/national-team-crest";
import Link from "next/link";

function TeamCell({ row }: { row: AggregatedTeamStats }) {
  const content = (
    <div className="flex min-w-0 items-center gap-2">
      <NationalTeamCrest name={row.teamName} crestUrl={row.crestUrl} size="sm" />
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

function StandingRows({ rows }: { rows: AggregatedTeamStats[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead className="bg-secondary/50 text-2xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Team</th>
            <th className="px-2 py-2 text-center font-medium">P</th>
            <th className="px-2 py-2 text-center font-medium">W</th>
            <th className="px-2 py-2 text-center font-medium">D</th>
            <th className="px-2 py-2 text-center font-medium">L</th>
            <th className="px-2 py-2 text-center font-medium">GF</th>
            <th className="px-2 py-2 text-center font-medium">GA</th>
            <th className="px-2 py-2 text-center font-medium">GD</th>
            <th className="px-3 py-2 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const points = row.points ?? row.wins * 3 + row.draws;
            return (
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
                <td className="px-2 py-2 text-center tabular-nums">{row.matchesPlayed}</td>
                <td className="px-2 py-2 text-center tabular-nums">{row.wins}</td>
                <td className="px-2 py-2 text-center tabular-nums">{row.draws}</td>
                <td className="px-2 py-2 text-center tabular-nums">{row.losses}</td>
                <td className="px-2 py-2 text-center tabular-nums">{row.goalsFor}</td>
                <td className="px-2 py-2 text-center tabular-nums">{row.goalsAgainst}</td>
                <td className="px-2 py-2 text-center tabular-nums">{row.goalBalance}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-primary">
                  {points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SoccerStandingsTable({ groups }: { groups: StandingGroup[] }) {
  if (!groups.length) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Standings are not available for this competition yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.label} className="space-y-3">
          {groups.length > 1 || group.label !== "Standings" ? (
            <h3 className="font-display text-base font-semibold text-foreground">{group.label}</h3>
          ) : null}
          <StandingRows rows={group.rows} />
        </section>
      ))}
    </div>
  );
}
