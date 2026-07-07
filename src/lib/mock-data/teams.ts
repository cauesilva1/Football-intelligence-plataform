import { generateTeams } from "@/lib/data/generators";
import { competitions } from "./competitions";

export const teams = generateTeams(competitions);
