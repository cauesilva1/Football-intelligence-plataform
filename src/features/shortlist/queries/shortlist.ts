import { cache } from "react";
import { getShortlistIds } from "@/lib/storage/shortlist";
import { getPlayerRepository } from "@/features/scouting/repository";
import { getSession } from "@/lib/auth/session";

export const queryShortlistPlayers = cache(async () => {
  const session = await getSession();
  if (!session) return [];

  const ids = await getShortlistIds(session.id);
  if (ids.length === 0) return [];

  const all = await getPlayerRepository().getAll();
  const byId = new Map(all.map((p) => [p.id, p]));

  return ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
});
