import { Activity, Target, Crosshair, TrendingUp } from "lucide-react";
import { GlossaryTooltip, METRIC_GLOSSARY } from "@/components/common/glossary-tooltip";
import { MetricCard } from "@/components/data/metric-card";
import { DataPanel } from "@/components/data/data-panel";
import { PlayerSeasonChart } from "@/components/charts/player-season-chart";
import { StatRadarChart } from "@/components/charts/stat-radar-chart";
import { aggregateSeasonTimeline } from "@/features/scouting/lib/season-history";
import { toRadarProfile } from "@/lib/normalize";
import { getTeamTheme } from "@/lib/team-theme";
import type { Player } from "@/types";

const RADAR_METRICS = ["Finalização", "Criação", "Passe", "Drible", "Defesa", "Físico"] as const;

export function PlayerPerformanceSection({ player }: { player: Player }) {
  const s = player.currentSeasonStats;
  const timeline = aggregateSeasonTimeline(player.history);
  const theme = getTeamTheme(player.competitionName, player.teamName);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Minutos"
          value={s.minutesPlayed.toLocaleString("pt-BR")}
          icon={Activity}
          accent="info"
          borderColor={theme.primaryColor}
        />
        <MetricCard
          label="Gols / 90"
          value={s.per90.goals.toFixed(2)}
          icon={Target}
          accent="primary"
          borderColor={theme.primaryColor}
        />
        <MetricCard
          label={<GlossaryTooltip label="xG / 90" description={METRIC_GLOSSARY.xG} />}
          value={(s.minutesPlayed > 0 ? (s.xG / s.minutesPlayed) * 90 : 0).toFixed(2)}
          icon={Crosshair}
          accent="warning"
          borderColor={theme.primaryColor}
        />
        <MetricCard
          label={<GlossaryTooltip label="Assist. / 90" description={METRIC_GLOSSARY.xA} />}
          value={s.per90.assists.toFixed(2)}
          icon={TrendingUp}
          accent="info"
          borderColor={theme.primaryColor}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataPanel
          title="Evolução por temporada"
          description="Rating, gols/90 e xG/90 agregados por season."
          density="dense"
          className="border"
          style={{ borderColor: `${theme.primaryColor}33` }}
        >
          <PlayerSeasonChart data={timeline} />
        </DataPanel>

        <DataPanel
          title="Perfil de desempenho"
          description="Dimensões normalizadas per 90 — temporada atual."
          density="dense"
          className="border"
          style={{ borderColor: `${theme.primaryColor}33` }}
        >
          <StatRadarChart
            metrics={[...RADAR_METRICS]}
            series={[{ name: player.knownAs, color: theme.primaryColor, values: toRadarProfile(s) }]}
          />
        </DataPanel>
      </div>

      <DataPanel
        title="Métricas detalhadas"
        description="Totais e rates per 90 da temporada atual."
        density="dense"
        className="border"
        style={{ borderColor: `${theme.primaryColor}33` }}
      >
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Jogos", value: String(s.appearances) },
            { label: "Gols", value: String(s.goals) },
            { label: "Assistências", value: String(s.assists) },
            { label: "Finalizações / 90", value: s.per90.shots.toFixed(2) },
            { label: "Passes chave / 90", value: s.per90.keyPasses.toFixed(2) },
            { label: "xG total", value: s.xG.toFixed(2), glossary: METRIC_GLOSSARY.xG },
            { label: "xA total", value: s.xA.toFixed(2), glossary: METRIC_GLOSSARY.xA },
            { label: "Precisão passe", value: `${s.passAccuracy.toFixed(0)}%` },
            { label: "Duelos ganhos", value: `${s.duelsWonPct.toFixed(0)}%` },
            { label: "Desarmes / 90", value: s.per90.tackles.toFixed(2) },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border bg-surface-muted/40 px-3 py-2.5"
              style={{ borderColor: `${theme.primaryColor}33` }}
            >
              {"glossary" in item && item.glossary ? (
                <GlossaryTooltip
                  label={
                    <span className="text-2xs uppercase tracking-wider text-muted-foreground">{item.label}</span>
                  }
                  description={item.glossary}
                />
              ) : (
                <span className="text-2xs uppercase tracking-wider text-muted-foreground">{item.label}</span>
              )}
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">{item.value}</div>
            </div>
          ))}
        </div>
      </DataPanel>
    </div>
  );
}
