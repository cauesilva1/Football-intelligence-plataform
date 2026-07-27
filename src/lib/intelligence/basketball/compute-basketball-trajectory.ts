import { aggregateSeasonTimeline } from "@/features/scouting/lib/season-history";
import { seasonProductivityFloor } from "@/lib/intelligence/data-depth";
import type { IntelligenceEvidence, IntelligenceTrajectory } from "@/lib/intelligence/types";
import type { Player } from "@/types";

/** Trend from multi-season history — rating and PPG slope over the last two seasons. */
export function computeBasketballTrajectory(player: Player): IntelligenceTrajectory {
  const floor = seasonProductivityFloor("BASKETBALL");
  const history = player.history ?? [];
  const timeline = aggregateSeasonTimeline(history, "BASKETBALL").filter(
    (point) =>
      point.appearances >= floor.minAppearances && point.minutes >= floor.minMinutes
  );

  if (timeline.length < 2) {
    return {
      direction: "insufficient_data",
      evidence: [
        {
          label: "History",
          value: `Need ≥2 seasons with ≥${floor.minAppearances}G and ≥${floor.minMinutes}′`,
        },
      ],
    };
  }

  const previous = timeline[timeline.length - 2];
  const latest = timeline[timeline.length - 1];
  const ratingDelta = latest.rating - previous.rating;
  const pointsDelta = latest.goalsPer90 - previous.goalsPer90; // PPG stored in goalsPer90 for BB

  const evidence: IntelligenceEvidence[] = [
    {
      label: "Rating delta",
      value: `${previous.rating.toFixed(2)} → ${latest.rating.toFixed(2)}`,
    },
    {
      label: "PPG delta",
      value: `${previous.goalsPer90.toFixed(1)} → ${latest.goalsPer90.toFixed(1)}`,
    },
  ];

  if (ratingDelta >= 0.25 && pointsDelta >= 1.0) {
    return { direction: "improving", evidence };
  }
  if (ratingDelta <= -0.25 && pointsDelta <= -1.0) {
    return { direction: "declining", evidence };
  }
  if (Math.abs(ratingDelta) < 0.15 && Math.abs(pointsDelta) < 0.8) {
    return { direction: "stable", evidence };
  }
  if (ratingDelta > 0 || pointsDelta > 0) return { direction: "improving", evidence };
  if (ratingDelta < 0 || pointsDelta < 0) return { direction: "declining", evidence };
  return { direction: "stable", evidence };
}
