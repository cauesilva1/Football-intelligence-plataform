"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SPORT_COOKIE, type Sport } from "@/lib/sport";

interface SportContextValue {
  currentSport: Sport;
  setSport: (sport: Sport) => void;
}

const SportContext = createContext<SportContextValue | null>(null);

function persistSportCookie(sport: Sport): void {
  document.cookie = `${SPORT_COOKIE}=${sport};path=/;max-age=31536000;SameSite=Lax`;
}

export function SportProvider({
  children,
  initialSport,
}: {
  children: ReactNode;
  initialSport: Sport;
}) {
  const router = useRouter();
  const [currentSport, setCurrentSportState] = useState<Sport>(initialSport);

  const setSport = useCallback(
    (sport: Sport) => {
      if (sport === currentSport) return;
      persistSportCookie(sport);
      setCurrentSportState(sport);
      router.refresh();
    },
    [currentSport, router]
  );

  const value = useMemo(
    () => ({ currentSport, setSport }),
    [currentSport, setSport]
  );

  return <SportContext.Provider value={value}>{children}</SportContext.Provider>;
}

export function useSport(): SportContextValue {
  const context = useContext(SportContext);
  if (!context) {
    throw new Error("useSport must be used within SportProvider");
  }
  return context;
}
