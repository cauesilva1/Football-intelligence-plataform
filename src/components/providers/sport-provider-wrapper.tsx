"use client";

import { SportProvider } from "@/context/sport-context";

export function SportProviderWrapper({ children }: { children: React.ReactNode }) {
  return <SportProvider>{children}</SportProvider>;
}
