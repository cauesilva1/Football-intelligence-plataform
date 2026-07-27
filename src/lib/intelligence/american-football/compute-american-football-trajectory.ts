import { aggregateSeasonTimeline } from "@/features/scouting/lib/season-history";
import { seasonProductivityFloor } from "@/lib/intelligence/data-depth";
import type { IntelligenceEvidence, IntelligenceTrajectory } from "@/lib/intelligence/types";
import type { Player } from "@/types";

/** Trend from multi-season history — rating and production proxy (yards) slope. */
export function computeAmericanFootballTrajectory(player: Player): IntelligenceTrajectory {
  const floor = seasonProductivityFloor("AMERICAN_FOOTBALL");
  const history = player.history ?? [];
  const timeline = aggregateSeasonTimeline(history, "AMERICAN_FOOTBALL").filter(
    (point) =>
      point.appearances >= floor.minAppearances && point.minutes >= floor.minMinutes
  );

  if (timeline.length < 2) {
    return {
      direction: "insufficient_data",
      evidence: [
        {
          label: "History",
          value: `Need ≥2 seasons with ≥${floor.minAppearances}G and ≥${floor.minMinutes}′ proxy`,
        },
      ],
    };
  }

  const previous = timeline[timeline.length - 2];
  const latest = timeline[timeline.length - 1];
  const ratingDelta = latest.rating - previous.rating;
  const yardsDelta = latest.goalsPer90 - previous.goalsPer90; // total yards stored in goalsPer90 for AF

  const evidence: IntelligenceEvidence[] = [
    {
      label: "Rating delta",
      value: `${previous.rating.toFixed(2)} → ${latest.rating.toFixed(2)}`,
    },
    {
      label: "Yards delta",
      value: `${previous.goalsPer90.toFixed(0)} → ${latest.goalsPer90.toFixed(0)}`,
    },
  ];

  if (ratingDelta >= 0.25 && yardsDelta >= 100) {
    return { direction: "improving", evidence };
  }
  if (ratingDelta <= -0.25 && yardsDelta <= -100) {
    return { direction: "declining", evidence };
  }
  if (Math.abs(ratingDelta) < 0.15 && Math.abs(yardsDelta) < 80) {
    return { direction: "stable", evidence };
  }
  if (ratingDelta > 0 || yardsDelta > 0) return { direction: "improving", evidence };
  if (ratingDelta < 0 || yardsDelta < 0) return { direction: "declining", evidence };
  return { direction: "stable", evidence };
}
