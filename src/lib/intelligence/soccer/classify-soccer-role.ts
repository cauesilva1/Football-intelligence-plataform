import { toRadarProfile } from "@/lib/normalize";
import { soccerPositionGroup } from "@/features/scouting/lib/position-scorecard";
import type { Player } from "@/types";

function topDimensions(profile: Record<string, number>, count = 2): string[] {
  return Object.entries(profile)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([key]) => key);
}

/** Role label from position group + dominant radar dimensions (rule-based, no ML). */
export function classifySoccerRole(player: Player): string {
  const group = soccerPositionGroup(player.position);
  const profile = toRadarProfile(player.currentSeasonStats);
  const [top, second] = topDimensions(profile);

  if (group === "GK") {
    return profile.Passing >= 65 ? "Sweeper Keeper" : "Shot Stopper";
  }

  if (group === "ATT") {
    if (top === "Physical") return "Target Forward";
    if (top === "Creation" || second === "Creation") return "Link-up Forward";
    if (top === "Finishing" || top === "Dribbling") return "Clinical Finisher";
    return "Hybrid Forward";
  }

  if (group === "MID") {
    if (top === "Defense" || (top === "Physical" && profile.Defense >= 60)) {
      return "Ball-winning Midfielder";
    }
    if (top === "Creation" && profile.Passing >= 55) return "Progressive Playmaker";
    if (top === "Passing") return "Deep-lying Playmaker";
    return "Box-to-box Midfielder";
  }

  if (top === "Passing" && profile.Passing >= profile.Defense) return "Ball-playing Defender";
  if (top === "Physical") return "Aerial Centre-back";
  if (top === "Defense") return "Ball-winning Centre-back";
  if (player.position === "LB" || player.position === "RB" || player.position === "LWB" || player.position === "RWB") {
    return profile.Creation >= 55 ? "Attacking Full-back" : "Defensive Full-back";
  }
  return "Centre-back";
}
