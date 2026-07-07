import { generatePlayers } from "@/lib/data/generators";
import { teams } from "./teams";

export const players = generatePlayers(teams);

export function getPlayerById(id: string) {
  return players.find((p) => p.id === id);
}
