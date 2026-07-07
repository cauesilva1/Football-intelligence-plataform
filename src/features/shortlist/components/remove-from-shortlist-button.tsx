"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeFromShortlist } from "@/lib/client/browser-storage";

export function RemoveFromShortlistButton({
  playerId,
  onRemoved,
}: {
  playerId: string;
  onRemoved?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      disabled={isPending}
      onClick={() =>
        startTransition(() => {
          removeFromShortlist(playerId);
          onRemoved?.();
        })
      }
    >
      <Trash2 className="h-3.5 w-3.5" /> Remove
    </Button>
  );
}
