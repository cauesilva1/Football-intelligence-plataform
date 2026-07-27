"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isInShortlist,
  toggleShortlistId,
  SHORTLIST_CHANGED_EVENT,
} from "@/lib/client/browser-storage";
import { cn } from "@/lib/utils";

export function ShortlistButton({
  playerId,
  compact = false,
}: {
  playerId: string;
  /** Icon-only control for dense tables. */
  compact?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSaved(isInShortlist(playerId));
    const onChange = () => setSaved(isInShortlist(playerId));
    window.addEventListener(SHORTLIST_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(SHORTLIST_CHANGED_EVENT, onChange);
  }, [playerId]);

  const saveLabel = saved
    ? "Saved to workspace — click to remove"
    : "Save to My Players";

  return (
    <div className={cn("inline-flex items-center gap-1", !compact && "flex-col items-stretch sm:flex-row sm:items-center")}>
      <Button
        type="button"
        variant={saved ? "secondary" : compact ? "ghost" : "outline"}
        size={compact ? "icon" : "sm"}
        disabled={isPending}
        title={saveLabel}
        aria-label={saveLabel}
        className={cn(compact && "h-7 w-7")}
        onClick={() => {
          startTransition(() => {
            const next = toggleShortlistId(playerId);
            setSaved(next);
          });
        }}
      >
        {saved ? (
          <>
            <BookmarkCheck className="h-3.5 w-3.5" />
            {compact ? null : "Shortlisted"}
          </>
        ) : (
          <>
            <Bookmark className="h-3.5 w-3.5" />
            {compact ? null : "Save"}
          </>
        )}
      </Button>
      {saved && !compact ? (
        <Link
          href="/shortlist"
          className="text-2xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
        >
          My Players
        </Link>
      ) : null}
    </div>
  );
}
