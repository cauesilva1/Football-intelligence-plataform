"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { StickyNote } from "lucide-react";
import { DataPanel } from "@/components/data/data-panel";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  getScoutNote,
  getShortlistEntry,
  isInShortlist,
  saveScoutNote,
  setShortlistTag,
  toggleShortlistId,
  SHORTLIST_CHANGED_EVENT,
  type ShortlistTag,
} from "@/lib/client/browser-storage";
import { cn } from "@/lib/utils";

const TAG_OPTIONS: {
  value: ShortlistTag;
  label: string;
  variant: "default" | "azure" | "amber" | "neutral";
}[] = [
  { value: "priority", label: "Priority", variant: "default" },
  { value: "watch", label: "Watch", variant: "azure" },
  { value: "reject", label: "Reject", variant: "neutral" },
];

export function ScoutNotesPanel({ playerId }: { playerId: string }) {
  const [text, setText] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [onShortlist, setOnShortlist] = useState(false);
  const [tag, setTag] = useState<ShortlistTag>("watch");

  const refresh = useCallback(() => {
    const saved = isInShortlist(playerId);
    setOnShortlist(saved);
    const entry = getShortlistEntry(playerId);
    if (entry) {
      setText(entry.note);
      setUpdatedAt(entry.updatedAt);
      setTag(entry.tag);
      return;
    }
    const note = getScoutNote(playerId);
    if (note) {
      setText(note.text);
      setUpdatedAt(note.updatedAt);
    } else {
      setText("");
      setUpdatedAt(null);
    }
    setTag("watch");
  }, [playerId]);

  useEffect(() => {
    refresh();
    window.addEventListener(SHORTLIST_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SHORTLIST_CHANGED_EVENT, refresh);
  }, [refresh]);

  const save = useCallback(() => {
    if (!isInShortlist(playerId)) {
      toggleShortlistId(playerId);
    }
    const note = saveScoutNote(playerId, text);
    setUpdatedAt(note.updatedAt);
    setOnShortlist(true);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }, [playerId, text]);

  const onTag = useCallback(
    (next: ShortlistTag) => {
      if (!isInShortlist(playerId)) {
        toggleShortlistId(playerId);
      }
      setShortlistTag(playerId, next);
      setTag(next);
      setOnShortlist(true);
    },
    [playerId]
  );

  return (
    <DataPanel
      title="Scout Notes"
      description={
        onShortlist
          ? "Tied to this player on My Players — saved on this device only."
          : "Save to My Players to keep this note with the shortlist entry (this device only)."
      }
      density="dense"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {TAG_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onTag(option.value)}
              className={cn(
                "rounded-md transition-opacity",
                onShortlist && tag === option.value ? "opacity-100" : "opacity-60 hover:opacity-100"
              )}
              title={`Tag as ${option.label}`}
            >
              <Badge variant={option.variant}>{option.label}</Badge>
            </button>
          ))}
          {onShortlist ? (
            <Link
              href="/shortlist"
              className={cn(buttonVariants({ variant: "ghost", size: "xs" }), "ml-auto")}
            >
              Open My Players
            </Link>
          ) : null}
        </div>
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
              : onShortlist
                ? "No notes yet — add one for this shortlist entry"
                : "Not on My Players yet — Save note will add them"}
          </p>
          <Button type="button" size="sm" onClick={save}>
            <StickyNote className="h-3.5 w-3.5" />
            {status === "saved" ? "Saved!" : onShortlist ? "Save note" : "Save to My Players"}
          </Button>
        </div>
      </div>
    </DataPanel>
  );
}
