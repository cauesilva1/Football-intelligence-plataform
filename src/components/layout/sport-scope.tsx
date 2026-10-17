"use client";

import { useLayoutEffect } from "react";
import { useSport } from "@/context/sport-context";
import type { Sport } from "@/lib/sport";

/** Paint chrome from the record on screen. Does not write the sport cookie. */
export function SportScope({ sport }: { sport: Sport }) {
  const { adoptRouteSport } = useSport();

  useLayoutEffect(() => {
    adoptRouteSport(sport);
  }, [sport, adoptRouteSport]);

  return null;
}
