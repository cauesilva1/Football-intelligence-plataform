"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { DataPanel } from "@/components/data/data-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlayerSearchCombobox } from "@/features/comparison/components/player-search-combobox";
import { ReportView } from "@/features/ai-report/components/report-view";
import { ScoutWorkflowNav } from "@/features/scouting/components/scout-workflow-nav";
import { ShortlistButton } from "@/features/shortlist/components/shortlist-button";
import { createScoutingReport } from "@/lib/actions/reports";
import { buildScoutBriefPdf, downloadBlob } from "@/lib/export/scout-brief-pdf";
import {
  getShortlistEntry,
  isInShortlist,
  SHORTLIST_CHANGED_EVENT,
  type ShortlistEntry,
} from "@/lib/client/browser-storage";
import type { PlayerLite, ScoutingReport } from "@/types";

export function ReportGenerator({
  players,
  initialPlayerId,
}: {
  players: PlayerLite[];
  initialPlayerId?: string;
}) {
  const [playerId, setPlayerId] = useState(initialPlayerId ?? "");
  const [knownPlayers, setKnownPlayers] = useState<PlayerLite[]>(players);
  const [report, setReport] = useState<ScoutingReport | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [onShortlist, setOnShortlist] = useState(false);
  const [shortlistEntry, setShortlistEntry] = useState<ShortlistEntry | null>(null);
  const autoStarted = useRef(false);

  const refreshShortlistContext = useCallback((id: string) => {
    if (!id) {
      setOnShortlist(false);
      setShortlistEntry(null);
      return;
    }
    setOnShortlist(isInShortlist(id));
    setShortlistEntry(getShortlistEntry(id));
  }, []);

  useEffect(() => {
    refreshShortlistContext(playerId);
    const onChange = () => refreshShortlistContext(playerId);
    window.addEventListener(SHORTLIST_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(SHORTLIST_CHANGED_EVENT, onChange);
  }, [playerId, report, refreshShortlistContext]);

  const generate = useCallback(async () => {
    if (!playerId) return;
    setStatus("generating");
    setReport(null);
    setErrorHint(null);
    try {
      const r = await createScoutingReport(playerId);
      setReport(r);
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
  }, [playerId]);

  // From My Players / profile deep link: start the brief once.
  useEffect(() => {
    if (!initialPlayerId || autoStarted.current) return;
    if (playerId !== initialPlayerId) return;
    autoStarted.current = true;
    void generate();
  }, [initialPlayerId, playerId, generate]);

  const selectedPlayer = knownPlayers.find((p) => p.id === playerId);

  const exportTxt = useCallback(() => {
    if (!report || !selectedPlayer) return;
    const noteBlock =
      shortlistEntry?.note?.trim()
        ? ["", "SCOUT NOTE (DEVICE)", shortlistEntry.note.trim(), ""]
        : [];
    const text = [
      `SCOUT REPORT — ${selectedPlayer.fullName}`,
      `Rating: ${report.overallRating.toFixed(1)}`,
      shortlistEntry?.tag ? `Shortlist tag: ${shortlistEntry.tag}` : null,
      "",
      "PLAYER SUMMARY",
      report.summary,
      ...noteBlock,
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
    ]
      .filter((line): line is string => line != null)
      .join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    downloadBlob(blob, `scout-report-${selectedPlayer.knownAs.toLowerCase()}.txt`);
  }, [report, selectedPlayer, shortlistEntry]);

  const exportPdf = useCallback(() => {
    if (!report || !selectedPlayer) return;
    const note = shortlistEntry?.note?.trim();
    const blob = buildScoutBriefPdf({
      playerName: selectedPlayer.fullName,
      position: selectedPlayer.position,
      club: selectedPlayer.teamShortName ?? selectedPlayer.teamName ?? "—",
      rating: report.overallRating,
      minutes: 0,
      summary: report.summary,
      strengths: report.strengths,
      risks: report.weaknesses,
      recommendation: report.recommendation,
      keyRates: [
        `Overall rating: ${report.overallRating.toFixed(1)} (same rules as profile)`,
        shortlistEntry?.tag ? `Shortlist: ${shortlistEntry.tag}` : null,
        note ? `Scout note: ${note.slice(0, 160)}${note.length > 160 ? "…" : ""}` : null,
        `Style: ${report.playingStyle.label}`,
        `Systems: ${report.tacticalFit.systems.join(", ") || "—"}`,
        `Roles: ${report.tacticalFit.roles.join(", ") || "—"}`,
      ].filter((line): line is string => line != null),
    });
    downloadBlob(blob, `scout-brief-${selectedPlayer.knownAs.toLowerCase()}.pdf`);
  }, [report, selectedPlayer, shortlistEntry]);

  return (
    <div className="space-y-6">
      <ScoutWorkflowNav current="report" />
      <PageHeader
        title="Scout brief"
        description="Staff one-pager: strengths, risks, recommendation — rating matches the profile. Open from My Players to carry your tag and note."
        badge={
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-muted/40 px-2 py-0.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3 text-accent-warning" /> AI-generated
          </span>
        }
      />

      <DataPanel
        title="Generate brief"
        description="Pick a player — or arrive from My Players with one already selected."
        density="dense"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <PlayerSearchCombobox
              label="Player"
              initialPlayers={knownPlayers}
              value={playerId}
              onChange={(id, player) => {
                setPlayerId(id);
                setReport(null);
                setStatus("idle");
                autoStarted.current = true; // don't auto-fire after manual change
                if (player) {
                  setKnownPlayers((prev) => {
                    if (prev.some((p) => p.id === player.id)) return prev;
                    return [...prev, player];
                  });
                }
              }}
              disabled={status === "generating"}
            />
          </div>
          <Button onClick={generate} disabled={!playerId || status === "generating"}>
            {status === "generating" ? "Generating brief..." : "Generate brief"}
          </Button>
          {playerId ? <ShortlistButton playerId={playerId} /> : null}
          {onShortlist ? (
            <Link
              href="/shortlist"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Back to My Players
            </Link>
          ) : null}
        </div>

        {shortlistEntry ? (
          <div className="mt-4 rounded-lg border border-border bg-surface-muted/30 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                From your shortlist
              </p>
              <Badge
                variant={
                  shortlistEntry.tag === "priority"
                    ? "default"
                    : shortlistEntry.tag === "reject"
                      ? "neutral"
                      : "azure"
                }
              >
                {shortlistEntry.tag}
              </Badge>
            </div>
            {shortlistEntry.note.trim() ? (
              <p className="mt-1.5 text-xs leading-relaxed text-foreground">
                {shortlistEntry.note}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">
                No note yet — add one on{" "}
                <Link href="/shortlist" className="text-primary hover:underline">
                  My Players
                </Link>
                .
              </p>
            )}
          </div>
        ) : null}
      </DataPanel>

      {status === "error" && (
        <ErrorState onRetry={generate} description={errorHint ?? undefined} />
      )}

      {status === "idle" && !report && (
        <EmptyState
          icon="file"
          title="No brief yet"
          description="Select a player and generate a staff brief, or open Generate brief from a shortlisted player."
          action={{ label: "My Players", href: "/shortlist" }}
        />
      )}

      {status === "generating" && (
        <DataPanel title="Analyzing data" density="dense">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
            Building brief for {selectedPlayer?.knownAs}...
          </div>
        </DataPanel>
      )}

      {report && status === "idle" && selectedPlayer && (
        <ReportView
          report={report}
          player={selectedPlayer}
          onExport={exportTxt}
          onExportPdf={exportPdf}
        />
      )}
    </div>
  );
}
