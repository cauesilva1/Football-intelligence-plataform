"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { enrichAmericanFootballPlayerSeasonsAction } from "@/features/scouting/actions/enrich-af-player-seasons";
import {
  hasAfSeasonEnrichInSession,
  markAfSeasonEnrichInSession,
} from "@/lib/client/browser-storage";

/**
 * One ESPN past-season enrich per browser session — keeps profile TTFB instant.
 */
export function AfProfileSeasonEnricher({
  playerId,
  enabled,
}: {
  playerId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || !playerId || started.current) return;
    if (hasAfSeasonEnrichInSession(playerId)) return;
    started.current = true;

    void (async () => {
      try {
        const result = await enrichAmericanFootballPlayerSeasonsAction(playerId);
        markAfSeasonEnrichInSession(playerId);
        if (result.refreshed) {
          router.refresh();
        }
      } catch (error) {
        console.warn("[af-enrich] client trigger failed:", playerId, error);
        // Still mark to avoid hammering ESPN on every navigation this session.
        markAfSeasonEnrichInSession(playerId);
      }
    })();
  }, [enabled, playerId, router]);

  return null;
}
