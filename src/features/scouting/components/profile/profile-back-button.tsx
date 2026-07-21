"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Returns to the previous list/ranking without forcing Overview → … navigation. */
export function ProfileBackButton({ fallbackHref = "/scouting" }: { fallbackHref?: string }) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to list
    </Button>
  );
}
