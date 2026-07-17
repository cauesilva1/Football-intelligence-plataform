"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSport } from "@/context/sport-context";
import type { Sport } from "@/lib/sport";

/**
 * Align shell sport with the match being viewed, and leave if the user switches away.
 */
export function MatchSportExit({ sport }: { sport: Sport }) {
  const { currentSport, adoptSport, sportReady } = useSport();
  const pathname = usePathname();
  const router = useRouter();
  const previousSport = useRef<string | null>(null);

  // Force chrome to the match sport before paint (cookie alone can lag / mismatch).
  useLayoutEffect(() => {
    adoptSport(sport);
    previousSport.current = sport;
  }, [sport, adoptSport]);

  useEffect(() => {
    if (!sportReady) return;

    if (previousSport.current == null) {
      previousSport.current = currentSport;
      return;
    }

    if (previousSport.current === currentSport) return;
    previousSport.current = currentSport;

    if (currentSport === sport) return;
    if (!pathname?.startsWith("/matches/")) return;

    router.replace("/tournaments");
  }, [sportReady, currentSport, sport, pathname, router]);

  return null;
}
