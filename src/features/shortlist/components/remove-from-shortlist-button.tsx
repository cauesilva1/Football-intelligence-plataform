"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeFromShortlistAction } from "@/lib/actions/shortlist";

export function RemoveFromShortlistButton({ playerId }: { playerId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      disabled={isPending}
      onClick={() => startTransition(() => void removeFromShortlistAction(playerId))}
    >
      <Trash2 className="h-3.5 w-3.5" /> Remover
    </Button>
  );
}
