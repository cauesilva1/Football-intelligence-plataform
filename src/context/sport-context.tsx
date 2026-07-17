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

interface SportContextValue {
  currentSport: Sport;
  setSport: (sport: Sport) => void;
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

/** When switching sport on a competition page, land on the sport's tournament index. */
function resolveSportSwitchHref(pathname: string | null, nextSport: Sport): string | null {
  if (!pathname) return null;
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

  useLayoutEffect(() => {
    const fromCookie = readSportCookie();
    setCurrentSportState(fromCookie);
    applySportToDocument(fromCookie);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applySportToDocument(currentSport);
  }, [currentSport, hydrated]);

  const setSport = useCallback(
    (sport: Sport) => {
      if (sport === currentSport) return;
      persistSportCookie(sport);
      applySportToDocument(sport);
      setCurrentSportState(sport);

      const redirectHref = resolveSportSwitchHref(pathname, sport);
      if (redirectHref) {
        router.push(redirectHref);
        return;
      }
      router.refresh();
    },
    [currentSport, pathname, router]
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
