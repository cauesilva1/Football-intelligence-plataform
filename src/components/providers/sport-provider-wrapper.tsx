"use client";

import { SportProvider } from "@/context/sport-context";
import type { Sport } from "@/lib/sport";

export function SportProviderWrapper({
  children,
  initialSport,
}: {
  children: React.ReactNode;
  initialSport: Sport;
}) {
  return <SportProvider initialSport={initialSport}>{children}</SportProvider>;
}
