"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { StickyNote } from "lucide-react";
import { DataPanel } from "@/components/data/data-panel";
import { Button } from "@/components/ui/button";
import { getScoutNoteAction, saveScoutNoteAction } from "@/lib/actions/scout-notes";

export function ScoutNotesPanel({ playerId }: { playerId: string }) {
  const [text, setText] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getScoutNoteAction(playerId).then((note) => {
      if (note) {
        setText(note.text);
        setUpdatedAt(note.updatedAt);
      }
    });
  }, [playerId]);

  const save = useCallback(() => {
    startTransition(async () => {
      const result = await saveScoutNoteAction(playerId, text);
      if (result.ok) {
        setStatus("saved");
        setUpdatedAt(result.note?.updatedAt ?? null);
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("error");
      }
    });
  }, [playerId, text]);

  return (
    <DataPanel
      title="Scout notes"
      description="Notas privadas visíveis apenas para sua conta."
      density="dense"
    >
      <div className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Ex: "Good movement behind defensive line"'
          rows={4}
          className="w-full resize-y rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-2xs text-muted-foreground">
            {updatedAt
              ? `Atualizado em ${new Date(updatedAt).toLocaleString("pt-BR")}`
              : "Nenhuma nota salva ainda"}
          </p>
          <Button type="button" size="sm" onClick={save} disabled={isPending}>
            <StickyNote className="h-3.5 w-3.5" />
            {isPending ? "Salvando..." : status === "saved" ? "Salvo!" : "Salvar nota"}
          </Button>
        </div>
        {status === "error" && (
          <p className="text-2xs text-accent-negative">Faça login para salvar notas privadas.</p>
        )}
      </div>
    </DataPanel>
  );
}
