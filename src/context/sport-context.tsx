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
import { usePathname, useRouter } from "next/navigation";
import { parseSport, SPORT_COOKIE, type Sport } from "@/lib/sport";
import { applySportToDocument } from "@/lib/sport-theme";
import { isBasketballCompetitionSlug } from "@/lib/tournaments/basketball-competitions";
import { isAmericanFootballCompetitionSlug } from "@/lib/tournaments/american-football-competitions";
import { isSoccerCompetitionSlug } from "@/lib/tournaments/soccer-competitions";
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

function competitionSlugBelongsToSport(slug: string, sport: Sport): boolean {
  if (sport === "BASKETBALL") return isBasketballCompetitionSlug(slug);
  if (sport === "AMERICAN_FOOTBALL") return isAmericanFootballCompetitionSlug(slug);
  return isSoccerCompetitionSlug(slug);
}

function matchSportFromPath(path: string | null): Sport | null {
  if (!path?.startsWith("/matches/")) return null;
  const raw = path.slice("/matches/".length).split("/")[0] ?? "";
  if (!raw) return null;
  return resolveSportFromMatchId(raw);
}

/**
 * Sport-specific deep links must not stay open after a sport switch
 * (match pages keyed to espn:nba / espn:nfl would otherwise 404 or show wrong chrome).
 */
function resolveSportSwitchHref(pathname: string | null, nextSport: Sport): string | null {
  if (!pathname) return null;

  // Any match deep link is sport-keyed; leave unless the target sport owns this match.
  if (pathname.startsWith("/matches/")) {
    const matchSport = matchSportFromPath(pathname);
    if (matchSport && nextSport === matchSport) return null;
    return "/tournaments";
  }

  const match = /^\/tournaments\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  const slug = decodeURIComponent(match[1]);
  if (competitionSlugBelongsToSport(slug, nextSport)) return null;
  return "/tournaments";
}

/**
 * Sport for shell/nav is client-driven (cookie). Server pages that need sport-scoped
 * data still call getServerSport() — keeping cookies() out of the root layout.
 */
export function SportProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentSport, setCurrentSportState] = useState<Sport>("SOCCER");
  const [hydrated, setHydrated] = useState(false);

  // Cookie hydrate — deps must stay a stable empty array (HMR-safe).
  useLayoutEffect(() => {
    const fromCookie = readSportCookie();
    const matchSport = matchSportFromPath(window.location.pathname);
    const initial = matchSport ?? fromCookie;
    setCurrentSportState(initial);
    applySportToDocument(initial);
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
    applySportToDocument(currentSport);
  }, [currentSport, hydrated]);

  const adoptSport = useCallback((sport: Sport) => {
    persistSportCookie(sport);
    applySportToDocument(sport);
    setCurrentSportState(sport);
  }, []);

  const setSport = useCallback(
    (sport: Sport) => {
      if (sport === currentSport) return;

      const path =
        typeof window !== "undefined" ? window.location.pathname : pathname;
      const redirectHref = resolveSportSwitchHref(path, sport);

      // Leaving a match page: persist + hard navigate so soft routing cannot stall.
      if (redirectHref && path.startsWith("/matches/")) {
        persistSportCookie(sport);
        applySportToDocument(sport);
        setCurrentSportState(sport);
        window.location.assign(redirectHref);
        return;
      }

      persistSportCookie(sport);
      applySportToDocument(sport);
      setCurrentSportState(sport);

      if (redirectHref) {
        router.replace(redirectHref);
        return;
      }
      router.refresh();
    },
    [currentSport, pathname, router]
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
