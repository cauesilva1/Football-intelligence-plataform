"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { parseSport, SPORT_COOKIE, type Sport } from "@/lib/sport";
import {
  isEntitySportPath,
  sportFromLocation,
} from "@/lib/sport-from-route";
import {
  applyNeutralDocumentTheme,
  applySportToDocument,
  isInsightsPath,
  isMarketingPath,
} from "@/lib/sport-theme";
import { sportSwitchTarget } from "@/lib/sport-switch";

interface SportContextValue {
  currentSport: Sport;
  setSport: (sport: Sport) => void;
  /** Persist sport without routing (the user picked a sport). */
  adoptSport: (sport: Sport) => void;
  /** Paint chrome for this page without writing the sport cookie. */
  adoptRouteSport: (sport: Sport) => void;
  /** True after the route or cookie sport is applied on the client. */
  sportReady: boolean;
}

const SportContext = createContext<SportContextValue | null>(null);

function persistSportCookie(sport: Sport): void {
  document.cookie = `${SPORT_COOKIE}=${sport};path=/;max-age=31536000;SameSite=Lax`;
}

function readSportCookie(): Sport {
  if (typeof document === "undefined") return "SOCCER";
  const match = document.cookie.match(new RegExp(`(?:^|; )${SPORT_COOKIE}=([^;]*)`));
  return parseSport(match?.[1] ? decodeURIComponent(match[1]) : null);
}

function neutralPath(path: string | null): boolean {
  return isInsightsPath(path) || isMarketingPath(path);
}

/**
 * Chrome follows the URL (desk query, league slug, match id) or the record
 * on screen. The cookie only fills directories that do not name a sport.
 */
export function SportProvider({
  children,
  initialSport = "SOCCER",
}: {
  children: ReactNode;
  initialSport?: Sport;
}) {
  const [currentSport, setCurrentSportState] = useState<Sport>(initialSport);
  const [hydrated, setHydrated] = useState(false);

  const paint = useCallback((sport: Sport) => {
    applySportToDocument(sport);
    setCurrentSportState(sport);
  }, []);

  const adoptRouteSport = useCallback(
    (sport: Sport) => {
      paint(sport);
    },
    [paint]
  );

  const adoptSport = useCallback(
    (sport: Sport) => {
      persistSportCookie(sport);
      paint(sport);
    },
    [paint]
  );

  useLayoutEffect(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    if (neutralPath(path)) {
      applyNeutralDocumentTheme();
      setCurrentSportState("SOCCER");
    } else if (!isEntitySportPath(path)) {
      paint(sportFromLocation(path, search) ?? readSportCookie());
    }
    setHydrated(true);
  }, [paint]);

  const setSport = useCallback(
    (sport: Sport) => {
      if (sport === currentSport) return;
      persistSportCookie(sport);
      paint(sport);
      const path = typeof window !== "undefined" ? window.location.pathname : "/";
      const search = typeof window !== "undefined" ? window.location.search : "";
      window.location.assign(sportSwitchTarget(path, search, sport));
    },
    [currentSport, paint]
  );

  const value = useMemo(
    () => ({ currentSport, setSport, adoptSport, adoptRouteSport, sportReady: hydrated }),
    [currentSport, setSport, adoptSport, adoptRouteSport, hydrated]
  );

  return (
    <SportContext.Provider value={value}>
      <Suspense fallback={null}>
        <SportRouteSync />
      </Suspense>
      {children}
    </SportContext.Provider>
  );
}

function SportRouteSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { adoptRouteSport } = useSport();
  const search = searchParams.toString();

  useLayoutEffect(() => {
    const path = pathname ?? window.location.pathname;
    if (neutralPath(path)) {
      applyNeutralDocumentTheme();
      return;
    }
    if (isEntitySportPath(path)) return;
    adoptRouteSport(sportFromLocation(path, search) ?? readSportCookie());
  }, [pathname, search, adoptRouteSport]);

  useEffect(() => {
    const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : null);
    if (neutralPath(path)) applyNeutralDocumentTheme();
  }, [pathname]);

  return null;
}

export function useSport(): SportContextValue {
  const context = useContext(SportContext);
  if (!context) {
    throw new Error("useSport must be used within SportProvider");
  }
  return context;
}
