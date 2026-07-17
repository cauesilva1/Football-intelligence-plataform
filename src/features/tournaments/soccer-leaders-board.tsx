import type { CompetitionLeaderRow, CompetitionLeaders } from "@/lib/api/espn-leaders";

function LeaderTable({
  title,
  unit,
  rows,
}: {
  title: string;
  unit: string;
  rows: CompetitionLeaderRow[];
}) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {title}: sem dados ainda.
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
              <th className="px-3 py-2 font-medium">Jogador</th>
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 text-right font-medium">{unit}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${title}-${row.rank}-${row.playerName}`} className="border-t border-border/50">
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.rank}</td>
                <td className="px-3 py-2 font-medium text-foreground">{row.playerName}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.teamName}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-primary">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SoccerLeadersBoard({ leaders }: { leaders: CompetitionLeaders }) {
  const hasAny =
    leaders.goals.length +
      leaders.assists.length +
      leaders.passes.length +
      leaders.yellowCards.length +
      leaders.redCards.length >
    0;

  if (!hasAny) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Estatísticas individuais ainda não disponíveis para esta competição.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {leaders.seasonYear ? (
        <p className="text-xs text-muted-foreground">
          Líderes ESPN · temporada {leaders.seasonYear}
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <LeaderTable title="Artilharia" unit="Gols" rows={leaders.goals} />
        <LeaderTable title="Assistências" unit="A" rows={leaders.assists} />
        <LeaderTable title="Passes certos" unit="Passes" rows={leaders.passes} />
        <LeaderTable title="Cartões amarelos" unit="CA" rows={leaders.yellowCards} />
        <LeaderTable title="Cartões vermelhos" unit="CV" rows={leaders.redCards} />
      </div>
    </div>
  );
}
