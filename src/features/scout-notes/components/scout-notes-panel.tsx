"use client";

import { useCallback, useEffect, useState } from "react";
import { StickyNote } from "lucide-react";
import { DataPanel } from "@/components/data/data-panel";
import { Button } from "@/components/ui/button";
import { getScoutNote, saveScoutNote } from "@/lib/client/browser-storage";

export function ScoutNotesPanel({ playerId }: { playerId: string }) {
  const [text, setText] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    const note = getScoutNote(playerId);
    if (note) {
      setText(note.text);
      setUpdatedAt(note.updatedAt);
    } else {
      setText("");
      setUpdatedAt(null);
    }
  }, [playerId]);

  const save = useCallback(() => {
    const note = saveScoutNote(playerId, text);
    setUpdatedAt(note.updatedAt);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }, [playerId, text]);

  return (
    <DataPanel
      title="Scout Notes"
      description="Personal notes stored locally in your browser."
      density="dense"
    >
      <div className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='e.g. "Good movement behind the defensive line"'
          rows={4}
          className="w-full resize-y rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-2xs text-muted-foreground">
            {updatedAt
              ? `Updated ${new Date(updatedAt).toLocaleString("en-US")}`
              : "No notes saved yet"}
          </p>
          <Button type="button" size="sm" onClick={save}>
            <StickyNote className="h-3.5 w-3.5" />
            {status === "saved" ? "Saved!" : "Save note"}
          </Button>
        </div>
      </div>
    </DataPanel>
  );
}
