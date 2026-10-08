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
import { usePathname } from "next/navigation";
import { parseSport, SPORT_COOKIE, type Sport } from "@/lib/sport";
import { applyNeutralDocumentTheme, applySportToDocument, isInsightsPath } from "@/lib/sport-theme";
import { sportSwitchTarget } from "@/lib/sport-switch";
import { resolveSportFromMatchId } from "@/features/matches/resolve-match-sport";

interface SportContextValue {
  currentSport: Sport;
  setSport: (sport: Sport) => void;
  /** Persist sport without routing (e.g. before a Link leaves a match page). */
  adoptSport: (sport: Sport) => void;
  /** True after cookie sport is applied on the client. */
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

function matchSportFromPath(path: string | null): Sport | null {
  if (!path?.startsWith("/matches/")) return null;
  const raw = path.slice("/matches/".length).split("/")[0] ?? "";
  if (!raw) return null;
  return resolveSportFromMatchId(raw);
}

/**
 * Sport for shell/nav is client-driven (cookie). Server pages that need sport-scoped
 * data still call getServerSport() — keeping cookies() out of the root layout.
 */
export function SportProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [currentSport, setCurrentSportState] = useState<Sport>("SOCCER");
  const [hydrated, setHydrated] = useState(false);

  // Cookie hydrate — deps must stay a stable empty array (HMR-safe).
  useLayoutEffect(() => {
    const fromCookie = readSportCookie();
    const matchSport = matchSportFromPath(window.location.pathname);
    const initial = matchSport ?? fromCookie;
    setCurrentSportState(initial);
    if (isInsightsPath(window.location.pathname)) applyNeutralDocumentTheme();
    else applySportToDocument(initial);
    if (matchSport && matchSport !== fromCookie) {
      persistSportCookie(matchSport);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only hydrate
  }, []);

  // Align shell sport as soon as we enter a match deep link (layout = before paint).
  useLayoutEffect(() => {
    if (!hydrated) return;
    const matchSport =
      matchSportFromPath(pathname) ??
      matchSportFromPath(typeof window !== "undefined" ? window.location.pathname : null);
    if (!matchSport) return;
    setCurrentSportState((prev) => {
      if (prev === matchSport) return prev;
      persistSportCookie(matchSport);
      applySportToDocument(matchSport);
      return matchSport;
    });
  }, [hydrated, pathname]);

  useEffect(() => {
    if (!hydrated) return;
    if (isInsightsPath(pathname)) {
      applyNeutralDocumentTheme();
      return;
    }
    applySportToDocument(currentSport);
  }, [currentSport, hydrated, pathname]);

  const adoptSport = useCallback((sport: Sport) => {
    persistSportCookie(sport);
    applySportToDocument(sport);
    setCurrentSportState(sport);
  }, []);

  const setSport = useCallback(
    (sport: Sport) => {
      if (sport === currentSport) return;

      const path = typeof window !== "undefined" ? window.location.pathname : pathname;
      const search = typeof window !== "undefined" ? window.location.search : "";
      persistSportCookie(sport);
      applySportToDocument(sport);
      setCurrentSportState(sport);
      // router.refresh() keeps the previous RSC payload, so the overview stays on the old sport.
      window.location.assign(sportSwitchTarget(path ?? "/", search, sport));
    },
    [currentSport, pathname]
  );

  const value = useMemo(
    () => ({ currentSport, setSport, adoptSport, sportReady: hydrated }),
    [currentSport, setSport, adoptSport, hydrated]
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
