"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleShortlistAction } from "@/lib/actions/shortlist";

export function ShortlistButton({
  playerId,
  initialSaved,
}: {
  playerId: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={saved ? "secondary" : "outline"}
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await toggleShortlistAction(playerId, saved);
          if (result.ok) setSaved(result.saved);
        });
      }}
    >
      {saved ? (
        <>
          <BookmarkCheck className="h-3.5 w-3.5" /> Na shortlist
        </>
      ) : (
        <>
          <Bookmark className="h-3.5 w-3.5" /> Salvar
        </>
      )}
    </Button>
  );
}
