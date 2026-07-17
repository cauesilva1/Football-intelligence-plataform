import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MatchScoreboardSurface } from "@/features/matches/components/match-scoreboard-surface";
import { MatchSportExit } from "@/features/matches/components/match-sport-exit";
import {
  footballBoxColumns,
  type FootballBoxCategory,
  type FootballBoxPlayer,
  type FootballMatchDetail,
  type FootballTeamStatLine,
} from "@/lib/api/espn-football-match-detail";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<FootballBoxCategory, string> = {
  passing: "Passing",
  rushing: "Rushing",
  receiving: "Receiving",
  defensive: "Defense",
  kicking: "Kicking",
};

const CATEGORY_ORDER: FootballBoxCategory[] = [
  "passing",
  "rushing",
  "receiving",
  "defensive",
  "kicking",
];

function StatusBadge({ status, label }: { status: string; label: string }) {
  if (status === "live") {
    return (
      <Badge className="animate-pulse border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
        {label}
      </Badge>
    );
  }
  if (status === "finished") {
    return <Badge variant="secondary">{label}</Badge>;
  }
  return (
    <Badge variant="outline" className="border-primary/30 text-primary">
      {label}
    </Badge>
  );
}

function TeamBlock({
  name,
  crestUrl,
  score,
  won,
  align,
}: {
  name: string;
  crestUrl?: string;
  score: number | null;
  won: boolean;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        align === "right" && "sm:flex-row-reverse sm:text-right"
      )}
    >
      {crestUrl ? (
        <Image
          src={crestUrl}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 object-contain"
          unoptimized
        />
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-xs font-bold">
          {name.slice(0, 3).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-display text-lg font-bold",
            won ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {name}
        </p>
        <p className="font-mono text-2xl font-bold tabular-nums text-primary">
          {score ?? "—"}
        </p>
      </div>
    </div>
  );
}

function TeamStatsCompare({
  homeName,
  awayName,
  homeStats,
  awayStats,
}: {
  homeName: string;
  awayName: string;
  homeStats: FootballTeamStatLine[];
  awayStats: FootballTeamStatLine[];
}) {
  if (!homeStats.length && !awayStats.length) return null;

  const labels = [
    ...new Set([...homeStats.map((s) => s.name), ...awayStats.map((s) => s.name)]),
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70">
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead className="bg-secondary/50 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">{awayName}</th>
            <th className="px-3 py-2 text-center font-medium">Stat</th>
            <th className="px-3 py-2 text-right font-medium">{homeName}</th>
          </tr>
        </thead>
        <tbody>
          {labels.map((label) => {
            const away = awayStats.find((s) => s.name === label)?.displayValue ?? "—";
            const home = homeStats.find((s) => s.name === label)?.displayValue ?? "—";
            return (
              <tr key={label} className="border-t border-border/50">
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{away}</td>
                <td className="px-3 py-2 text-center text-xs font-medium text-foreground">
                  {label}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {home}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BoxCategoryTable({
  category,
  players,
}: {
  category: FootballBoxCategory;
  players: FootballBoxPlayer[];
}) {
  if (!players.length) return null;
  const columns = footballBoxColumns(category);

  const byTeam = new Map<string, FootballBoxPlayer[]>();
  for (const player of players) {
    const list = byTeam.get(player.teamName) ?? [];
    list.push(player);
    byTeam.set(player.teamName, list);
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-semibold text-foreground">
        {CATEGORY_LABELS[category]}
      </h3>
      {[...byTeam.entries()].map(([teamName, rows]) => (
        <div key={`${category}-${teamName}`} className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {teamName}
          </p>
          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[22rem] text-left text-sm">
              <thead className="bg-secondary/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Player</th>
                  {columns.map((col) => (
                    <th key={col} className="px-2 py-2 text-right font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.espnAthleteId}-${row.fullName}-${category}`}
                    className="border-t border-border/50"
                  >
                    <td className="px-3 py-2 font-medium text-foreground">{row.fullName}</td>
                    {row.cells.map((cell, i) => (
                      <td
                        key={`${row.fullName}-${columns[i]}`}
                        className="px-2 py-2 text-right tabular-nums text-muted-foreground"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FootballMatchDetailView({ data }: { data: FootballMatchDetail }) {
  const hasScore = data.homeScore != null && data.awayScore != null;
  const homeWon = hasScore && (data.homeScore ?? 0) > (data.awayScore ?? 0);
  const awayWon = hasScore && (data.awayScore ?? 0) > (data.homeScore ?? 0);
  const hasBox = data.players.length > 0;

  return (
    <div className="space-y-6">
      <MatchSportExit sport="AMERICAN_FOOTBALL" />
      <MatchScoreboardSurface sport="AMERICAN_FOOTBALL">
        <Link
          href={`/tournaments/${data.competition === "nfl" ? "nfl" : "college-football"}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to hub
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{data.competitionName}</Badge>
          <StatusBadge status={data.status} label={data.statusLabel} />
          <span className="text-xs text-muted-foreground">{data.sourceLabel}</span>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <TeamBlock
            name={data.awayTeam}
            crestUrl={data.awayCrestUrl}
            score={data.awayScore}
            won={awayWon}
            align="right"
          />
          <p className="rounded-xl border border-primary/20 bg-background/70 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
            @
          </p>
          <TeamBlock
            name={data.homeTeam}
            crestUrl={data.homeCrestUrl}
            score={data.homeScore}
            won={homeWon}
            align="left"
          />
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {data.stadium} · {data.date}
        </p>
      </MatchScoreboardSurface>

      {(data.homeTeamStats.length > 0 || data.awayTeamStats.length > 0) && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-foreground">Team stats</h2>
          <TeamStatsCompare
            homeName={data.homeTeam}
            awayName={data.awayTeam}
            homeStats={data.homeTeamStats}
            awayStats={data.awayTeamStats}
          />
        </section>
      )}

      {hasBox ? (
        <section className="space-y-6">
          <h2 className="font-display text-lg font-bold text-foreground">Box score</h2>
          {CATEGORY_ORDER.map((category) => (
            <BoxCategoryTable
              key={category}
              category={category}
              players={data.players.filter((p) => p.category === category)}
            />
          ))}
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Box score is not available for this game yet (pre-game or ESPN has no statistics).
        </p>
      )}
    </div>
  );
}
