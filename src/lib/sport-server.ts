import { cookies } from "next/headers";
import { parseSport, SPORT_COOKIE, type Sport } from "@/lib/sport";

export async function getServerSport(): Promise<Sport> {
  const cookieStore = await cookies();
  return parseSport(cookieStore.get(SPORT_COOKIE)?.value);
}
