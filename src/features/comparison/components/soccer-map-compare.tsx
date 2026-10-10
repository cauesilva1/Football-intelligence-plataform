import Link from "next/link";
import { SoccerShotChart } from "@/features/scouting/components/profile/soccer-shot-chart";
import type { SoccerShotChartModel } from "@/features/scouting/queries/soccer-shot-chart";
import type { MapComparePlayer } from "@/features/scouting/queries/soccer-map-compare";
import { SOCCER_SHOT_ZONES } from "@/lib/soccer/shot-zones";
import { zoneOnTargetDelta } from "@/lib/soccer/map-compare";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function rateLabel(pct: number | null): string {
  return pct == null ? "—" : `${pct.toFixed(1)}%`;
}

function coverageLine(games: number): string {
  return `Map reflects ${games} tracked ${games === 1 ? "game" : "games"}.`;
}

export function SoccerMapCompare({
  players,
  season,
  seasons,
  charts,
}: {
  players: [MapComparePlayer, MapComparePlayer];
  season: string;
  seasons: Array<{ key: string; label: string }>;
  charts: [SoccerShotChartModel, SoccerShotChartModel] | null;
}) {
  const [a, b] = players;

  return (
    <div className="space-y-4">
      {seasons.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Season</span>
          {seasons.map((item) => (
            <Link
              key={item.key}
              href={`/compare/maps?playerA=${a.id}&playerB=${b.id}&season=${encodeURIComponent(item.key)}`}
              className={cn(
                buttonVariants({
                  variant: item.key === season ? "default" : "outline",
                  size: "sm",
                }),
                "h-7 px-3 text-xs"
              )}
              aria-current={item.key === season ? "true" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          These two players have no season in which both have tracked shots.
        </p>
      )}

      {charts ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {charts.map((model, index) => {
              const player = players[index];
              return (
                <div key={player.id} className="rounded-2xl border bg-[#10131a] px-4 py-3 text-[#f4f1ea]">
                  <p className="font-display text-lg font-semibold">{player.name}</p>
                  <p className="text-xs text-[#a39b8c]">{player.teamName ?? "No club"}</p>
                  <p className="mt-2 font-display text-3xl font-bold tabular-nums">{rateLabel(model.conversionPct)}</p>
                  <p className="text-sm text-[#c8c2b4]">
                    {model.converted}/{model.attempts} on target
                    {model.conversionPct == null && model.attempts > 0 ? " · percentage hidden under 5 attempts" : ""}
                  </p>
                  <p className="mt-1 text-xs text-[#a39b8c]">{coverageLine(model.trackedGames)}</p>
                </div>
              );
            })}
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            {charts.map((model, index) => (
              <div key={players[index].id} className="space-y-2">
                <SoccerShotChart model={model} coverage={coverageLine(model.trackedGames)} pitchOnly />
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border">
            <table className="w-full text-sm">
              <caption className="border-b px-4 py-3 text-left text-xs text-muted-foreground">
                On-target rate by zone. A zone stays blank when either player is under 5 attempts.
              </caption>
              <thead>
                <tr className="text-left text-2xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Zone</th>
                  <th className="px-4 py-2 font-medium">{a.name}</th>
                  <th className="px-4 py-2 font-medium">{b.name}</th>
                  <th className="px-4 py-2 font-medium">Edge</th>
                </tr>
              </thead>
              <tbody>
                {SOCCER_SHOT_ZONES.map((zone) => {
                  const left = charts[0].zones.find((row) => row.zone === zone);
                  const right = charts[1].zones.find((row) => row.zone === zone);
                  const delta = zoneOnTargetDelta(left?.conversionPct ?? null, right?.conversionPct ?? null);
                  const edge =
                    delta.winner === "hidden"
                      ? "—"
                      : delta.winner === "tie"
                        ? "Level"
                        : delta.winner === "a"
                          ? `${a.name} +${Math.abs(delta.delta ?? 0).toFixed(1)}`
                          : `${b.name} +${Math.abs(delta.delta ?? 0).toFixed(1)}`;
                  return (
                    <tr key={zone} className="border-t">
                      <td className="px-4 py-2.5">{left?.label ?? zone}</td>
                      <td className="px-4 py-2.5 tabular-nums">{rateLabel(left?.conversionPct ?? null)}</td>
                      <td className="px-4 py-2.5 tabular-nums">{rateLabel(right?.conversionPct ?? null)}</td>
                      <td className="px-4 py-2.5">{edge}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
