"use client";

import Link from "next/link";
import { Download, ExternalLink, FileText, ShieldCheck, Sparkles, Target, TrendingDown } from "lucide-react";
import { DataPanel } from "@/components/data/data-panel";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ratingColor } from "@/lib/utils";
import type { PlayerLite, ScoutingReport } from "@/types";

export function ReportView({
  report,
  player,
  onExport,
  onExportPdf,
}: {
  report: ScoutingReport;
  player: PlayerLite;
  onExport: () => void;
  onExportPdf?: () => void;
}) {
  const ctx = report.briefContext;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Scouting Report</p>
            <p className="font-display text-base font-bold text-foreground">{player.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {player.position} · {player.teamShortName ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Overall Rating</p>
            <div className="flex items-center justify-end gap-2">
              <p className={`font-display text-2xl font-bold ${ratingColor(report.overallRating)}`}>
                {report.overallRating.toFixed(1)}
              </p>
              {ctx?.smallSample ? (
                <Badge variant="amber" className="text-2xs">
                  Small sample
                </Badge>
              ) : null}
            </div>
            {ctx ? (
              <p className="text-2xs text-muted-foreground">
                {ctx.minutesPlayed.toLocaleString("en-US")}&apos; · {ctx.appearances} apps
              </p>
            ) : null}
          </div>
          <Link
            href={`/players/${player.id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ExternalLink className="h-3.5 w-3.5" /> Profile
          </Link>
          {onExportPdf ? (
            <Button variant="default" size="sm" onClick={onExportPdf}>
              <Download className="h-3.5 w-3.5" /> PDF brief
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-3.5 w-3.5" /> Export .txt
          </Button>
        </div>
      </div>

      {ctx?.sampleNote ? (
        <p
          className={
            ctx.smallSample
              ? "rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90"
              : "rounded-lg border border-border bg-surface-muted/30 px-3 py-2 text-xs text-muted-foreground"
          }
        >
          {ctx.sampleNote}
        </p>
      ) : null}

      {ctx && ctx.keyRates.length > 0 ? (
        <DataPanel
          title="Key rates"
          description="Role-aware metrics — same pack as the player profile scorecard."
          density="dense"
        >
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ctx.keyRates.map((line) => (
              <li
                key={line}
                className="rounded-lg border border-border bg-surface-muted/30 px-3 py-2 font-mono text-xs tabular-nums text-foreground"
              >
                {line}
              </li>
            ))}
          </ul>
        </DataPanel>
      ) : null}

      <DataPanel
        title="Player Summary"
        description="Quantitative synthesis for the current season."
        density="dense"
      >
        <p className="text-sm leading-relaxed text-foreground">{report.summary}</p>
      </DataPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataPanel
          title="Key Strengths"
          description="Highlighted attributes from the analysis."
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
          title="Areas to Watch"
          description="Observed risks or limitations."
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
          title="Playing Style"
          description="Tactical profile inferred from normalized metrics."
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
          title="Tactical Fit"
          description="Systems and roles where the profile fits best."
          density="dense"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suggested systems</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {report.tacticalFit.systems.map((system) => (
                <Badge key={system}>{system}</Badge>
              ))}
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Roles</p>
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
        title="Technical Recommendation"
        description="Scouting verdict for recruitment decisions."
        density="dense"
        className="border-primary/20 bg-primary/5"
      >
        <p className="text-sm text-foreground">{report.recommendation}</p>
        <p className="mt-3 text-right text-2xs text-muted-foreground">
          Generated by {report.generatedBy} on {new Date(report.createdAt).toLocaleString("en-US")}
        </p>
      </DataPanel>
    </div>
  );
}
