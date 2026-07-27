import { aggregateSeasonTimeline } from "@/features/scouting/lib/season-history";
import { seasonProductivityFloor } from "@/lib/intelligence/data-depth";
import type { SoccerTrajectory } from "@/lib/intelligence/soccer/types";
import type { Player } from "@/types";

/** Trend from multi-season history — rating and goals/90 slope over the last two seasons. */
export function computeSoccerTrajectory(player: Player): SoccerTrajectory {
  const floor = seasonProductivityFloor("SOCCER");
  const history = player.history ?? [];
  const timeline = aggregateSeasonTimeline(history, "SOCCER").filter(
    (point) =>
      point.appearances >= floor.minAppearances && point.minutes >= floor.minMinutes
  );

  if (timeline.length < 2) return "insufficient_data";

  const previous = timeline[timeline.length - 2];
  const latest = timeline[timeline.length - 1];
  const ratingDelta = latest.rating - previous.rating;
  const goalsDelta = latest.goalsPer90 - previous.goalsPer90;

  if (ratingDelta >= 0.25 && goalsDelta >= 0.05) return "improving";
  if (ratingDelta <= -0.25 && goalsDelta <= -0.05) return "declining";
  if (Math.abs(ratingDelta) < 0.15 && Math.abs(goalsDelta) < 0.03) return "stable";

  if (ratingDelta > 0 || goalsDelta > 0) return "improving";
  if (ratingDelta < 0 || goalsDelta < 0) return "declining";
  return "stable";
}
