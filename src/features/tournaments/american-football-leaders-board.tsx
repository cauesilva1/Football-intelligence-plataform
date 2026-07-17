import type { FootballCompetitionLeaders, FootballLeaderRow } from "@/lib/api/espn-football-leaders";

function LeaderTable({
  title,
  unit,
  rows,
}: {
  title: string;
  unit: string;
  rows: FootballLeaderRow[];
}) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {title}: no data yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[18rem] text-left text-sm">
          <thead className="bg-secondary/50 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Player</th>
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 text-right font-medium">{unit}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${title}-${row.rank}-${row.playerName}`}
                className="border-t border-border/50"
              >
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.rank}</td>
                <td className="px-3 py-2 font-medium text-foreground">{row.playerName}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.teamName}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-primary">
                  {row.displayValue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AmericanFootballLeadersBoard({
  leaders,
}: {
  leaders: FootballCompetitionLeaders;
}) {
  const hasAny =
    leaders.passingYards.length +
      leaders.rushingYards.length +
      leaders.receivingYards.length +
      leaders.sacks.length +
      leaders.tackles.length >
    0;

  if (!hasAny) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Individual statistics are not available for this season yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        ESPN leaders · {leaders.seasonLabel} season
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <LeaderTable title="Passe (jardas)" unit="YDS" rows={leaders.passingYards} />
        <LeaderTable title="Corrida (jardas)" unit="YDS" rows={leaders.rushingYards} />
        <LeaderTable title="Receiving (yards)" unit="YDS" rows={leaders.receivingYards} />
        <LeaderTable title="Sacks" unit="SCK" rows={leaders.sacks} />
        <LeaderTable title="Tackles" unit="TKL" rows={leaders.tackles} />
      </div>
    </div>
  );
}
