import { cookies, headers } from "next/headers";
import { parseSport, SPORT_COOKIE, type Sport } from "@/lib/sport";
import { SPORT_HEADER } from "@/lib/sport-from-route";

export async function getServerSport(): Promise<Sport> {
  const headerStore = await headers();
  const fromRoute = headerStore.get(SPORT_HEADER);
  if (fromRoute === "SOCCER" || fromRoute === "BASKETBALL" || fromRoute === "AMERICAN_FOOTBALL") {
    return fromRoute;
  }
  const cookieStore = await cookies();
  return parseSport(cookieStore.get(SPORT_COOKIE)?.value);
}
