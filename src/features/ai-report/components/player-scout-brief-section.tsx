"use client";

import { useCallback, useState } from "react";
import { FileText } from "lucide-react";
import { ErrorState } from "@/components/common/error-state";
import { DataPanel } from "@/components/data/data-panel";
import { Button } from "@/components/ui/button";
import { ReportView } from "@/features/ai-report/components/report-view";
import { createScoutingReport } from "@/lib/actions/reports";
import { markShortlistBriefGenerated } from "@/lib/client/browser-storage";
import type { PlayerLite, ScoutingReport } from "@/types";

export function PlayerScoutBriefSection({ player }: { player: PlayerLite }) {
  const [report, setReport] = useState<ScoutingReport | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");
  const [errorHint, setErrorHint] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setStatus("generating");
    setErrorHint(null);
    try {
      const next = await createScoutingReport(player.id);
      setReport(next);
      markShortlistBriefGenerated(player.id);
      setStatus("idle");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.startsWith("RATE_LIMITED:")) {
        const sec = message.split(":")[1] ?? "60";
        setErrorHint(`Rate limit reached. Try again in ~${sec}s.`);
      } else if (message === "REPORTS_DISABLED") {
        setErrorHint("Report generation is temporarily disabled.");
      } else {
        setErrorHint(null);
      }
      setStatus("error");
    }
  }, [player.id]);

  const exportTxt = useCallback(() => {
    if (!report) return;
    const text = [
      `SCOUT BRIEF — ${player.fullName}`,
      `Overall rating: ${report.overallRating.toFixed(1)}`,
      "",
      report.summary,
      "",
      report.recommendation,
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${player.knownAs}-scout-brief.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [player.fullName, player.knownAs, report]);

  return (
    <DataPanel
      title="Generate scout brief"
      description="Same scout action as the reports desk. The overall rating is computed on the server."
      action={
        <Button size="sm" onClick={() => void generate()} disabled={status === "generating"}>
          <FileText className="h-3.5 w-3.5" />
          {status === "generating" ? "Generating…" : "Generate scout brief"}
        </Button>
      }
    >
      {status === "error" ? (
        <ErrorState
          title="Could not generate the brief"
          description={errorHint ?? "Try again in a moment."}
          onRetry={() => void generate()}
        />
      ) : report ? (
        <ReportView report={report} player={player} onExport={exportTxt} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Generate the brief from this profile. The reports page stays available for the same player.
        </p>
      )}
    </DataPanel>
  );
}
