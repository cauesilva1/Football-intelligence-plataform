"use client";

import { Download, FileText, ShieldCheck, Sparkles, Target, TrendingDown } from "lucide-react";
import { DataPanel } from "@/components/data/data-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ratingColor } from "@/lib/utils";
import type { PlayerLite, ScoutingReport } from "@/types";

export function ReportView({
  report,
  player,
  onExport,
}: {
  report: ScoutingReport;
  player: PlayerLite;
  onExport: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Relatório de scouting</p>
            <p className="font-display text-base font-bold text-foreground">{player.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {player.position} · {player.teamShortName ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Nota geral (AI)</p>
            <p className={`font-display text-2xl font-bold ${ratingColor(report.overallRating)}`}>
              {report.overallRating.toFixed(1)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
        </div>
      </div>

      <DataPanel
        title="Resumo do jogador"
        description="Síntese quantitativa da temporada atual."
        density="dense"
      >
        <p className="text-sm leading-relaxed text-foreground">{report.summary}</p>
      </DataPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataPanel
          title="Pontos fortes"
          description="Atributos destacados na análise."
          density="dense"
        >
          <ul className="space-y-2">
            {report.strengths.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted/30 px-3 py-2 text-xs text-foreground"
              >
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </DataPanel>

        <DataPanel
          title="Pontos de atenção"
          description="Riscos ou limitações observadas."
          density="dense"
        >
          <ul className="space-y-2">
            {report.weaknesses.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted/30 px-3 py-2 text-xs text-foreground"
              >
                <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-negative" />
                {item}
              </li>
            ))}
          </ul>
        </DataPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataPanel
          title="Estilo de jogo"
          description="Perfil tático inferido das métricas normalizadas."
          density="dense"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-warning" />
              <p className="font-display text-sm font-semibold text-foreground">{report.playingStyle.label}</p>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{report.playingStyle.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {report.playingStyle.traits.map((trait) => (
                <Badge key={trait} variant="secondary">
                  {trait}
                </Badge>
              ))}
            </div>
          </div>
        </DataPanel>

        <DataPanel
          title="Encaixe tático"
          description="Sistemas e funções onde o perfil se adapta melhor."
          density="dense"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sistemas sugeridos</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {report.tacticalFit.systems.map((system) => (
                <Badge key={system}>{system}</Badge>
              ))}
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Funções</p>
              <div className="flex flex-wrap gap-1.5">
                {report.tacticalFit.roles.map((role) => (
                  <Badge key={role} variant="outline">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{report.tacticalFit.narrative}</p>
          </div>
        </DataPanel>
      </div>

      <DataPanel
        title="Recomendação"
        description="Veredito de scouting para decisão de contratação."
        density="dense"
        className="border-primary/20 bg-primary/5"
      >
        <p className="text-sm text-foreground">{report.recommendation}</p>
        <p className="mt-3 text-right text-[10px] text-muted-foreground">
          Gerado por {report.generatedBy} em {new Date(report.createdAt).toLocaleString("pt-BR")}
        </p>
      </DataPanel>
    </div>
  );
}
