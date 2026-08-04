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
  tone = "default",
}: {
  playerId: string;
  /** Icon-only control for dense tables. */
  compact?: boolean;
  /** Use on dark club banners so outline/secondary stay readable. */
  tone?: "default" | "onDark";
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

  const onDark = tone === "onDark";

  return (
    <div className={cn("inline-flex items-center gap-1", !compact && "flex-col items-stretch sm:flex-row sm:items-center")}>
      <Button
        type="button"
        variant={saved ? "secondary" : compact ? "ghost" : "outline"}
        size={compact ? "icon" : "sm"}
        disabled={isPending}
        title={saveLabel}
        aria-label={saveLabel}
        className={cn(
          compact && "h-7 w-7",
          onDark &&
            !saved &&
            "border-white/45 bg-white/10 text-white hover:bg-white/20 hover:text-white",
          onDark &&
            saved &&
            "border-transparent bg-white text-zinc-900 hover:bg-white/90"
        )}
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
          className={cn(
            "text-2xs underline-offset-2 hover:underline",
            onDark
              ? "text-white/70 hover:text-white"
              : "text-muted-foreground hover:text-primary"
          )}
        >
          My Players
        </Link>
      ) : null}
    </div>
  );
}
