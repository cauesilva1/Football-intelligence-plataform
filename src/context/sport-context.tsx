"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { SPORT_COOKIE, type Sport } from "@/lib/sport";
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

export function SportProvider({
  children,
  initialSport,
}: {
  children: ReactNode;
  initialSport: Sport;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentSport, setCurrentSportState] = useState<Sport>(initialSport);

  useEffect(() => {
    applySportToDocument(currentSport);
  }, [currentSport]);

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
