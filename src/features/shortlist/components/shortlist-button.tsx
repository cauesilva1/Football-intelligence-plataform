"use client";

import { useEffect, useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isInShortlist, toggleShortlistId } from "@/lib/client/browser-storage";

export function ShortlistButton({ playerId }: { playerId: string }) {
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSaved(isInShortlist(playerId));
  }, [playerId]);

  return (
    <Button
      type="button"
      variant={saved ? "secondary" : "outline"}
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          const next = toggleShortlistId(playerId);
          setSaved(next);
        });
      }}
    >
      {saved ? (
        <>
          <BookmarkCheck className="h-3.5 w-3.5" /> Shortlisted
        </>
      ) : (
        <>
          <Bookmark className="h-3.5 w-3.5" /> Save
        </>
      )}
    </Button>
  );
}
