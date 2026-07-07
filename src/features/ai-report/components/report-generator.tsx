"use client";

import { useCallback, useState } from "react";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { DataPanel } from "@/components/data/data-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ReportView } from "@/features/ai-report/components/report-view";
import { createScoutingReport } from "@/lib/actions/reports";
import type { PlayerLite, ScoutingReport } from "@/types";

export function ReportGenerator({
  players,
  initialPlayerId,
}: {
  players: PlayerLite[];
  initialPlayerId?: string;
}) {
  const [playerId, setPlayerId] = useState(initialPlayerId ?? "");
  const [report, setReport] = useState<ScoutingReport | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");

  const generate = useCallback(async () => {
    if (!playerId) return;
    setStatus("generating");
    setReport(null);
    try {
      const r = await createScoutingReport(playerId);
      setReport(r);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [playerId]);

  const selectedPlayer = players.find((p) => p.id === playerId);

  const exportReport = useCallback(() => {
    if (!report || !selectedPlayer) return;
    const text = [
      `SCOUT REPORT — ${selectedPlayer.fullName}`,
      `Rating: ${report.overallRating.toFixed(1)}`,
      "",
      "PLAYER SUMMARY",
      report.summary,
      "",
      "STRENGTHS",
      ...report.strengths.map((s) => `- ${s}`),
      "",
      "WEAKNESSES",
      ...report.weaknesses.map((w) => `- ${w}`),
      "",
      "PLAYING STYLE",
      `${report.playingStyle.label}: ${report.playingStyle.description}`,
      ...report.playingStyle.traits.map((t) => `- ${t}`),
      "",
      "TACTICAL FIT",
      `Systems: ${report.tacticalFit.systems.join(", ")}`,
      `Roles: ${report.tacticalFit.roles.join(", ")}`,
      report.tacticalFit.narrative,
      "",
      "RECOMMENDATION",
      report.recommendation,
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scout-report-${selectedPlayer.knownAs.toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report, selectedPlayer]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Scout Reports"
        description="Generate structured scouting analysis from player data — summary, style, tactical fit, and recommendation."
        badge={
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3 text-accent-warning" /> OpenRouter · Llama 3.3
          </span>
        }
      />

      <DataPanel
        title="Generate report"
        description="Select a player and start the analysis."
        density="dense"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Player</label>
            <Select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
              <option value="">Select a player</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} · {p.position}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={generate} disabled={!playerId || status === "generating"}>
            {status === "generating" ? "Generating report..." : "Generate report"}
          </Button>
        </div>
      </DataPanel>

      {status === "error" && <ErrorState onRetry={generate} />}

      {status === "idle" && !report && (
        <EmptyState
          title="No report generated yet"
          description="Select a player and click Generate report to create a structured scouting analysis."
        />
      )}

      {status === "generating" && (
        <DataPanel title="Analyzing data" density="dense">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
            Interpreting performance for {selectedPlayer?.knownAs}...
          </div>
        </DataPanel>
      )}

      {report && status === "idle" && selectedPlayer && (
        <ReportView report={report} player={selectedPlayer} onExport={exportReport} />
      )}
    </div>
  );
}
