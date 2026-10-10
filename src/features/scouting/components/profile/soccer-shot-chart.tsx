"use client";

import { useState } from "react";
import { pitchMarker, pitchMarkerVisible, PITCH_HEIGHT, PITCH_WIDTH } from "@/lib/soccer/pitch-geometry";
import type { SoccerShotChartModel, SoccerShotZoneLine } from "@/features/scouting/queries/soccer-shot-chart";
import type { SoccerShotZone } from "@/lib/soccer/shot-zones";

const DRAW_ORDER: SoccerShotZone[] = [
  "outside_box",
  "left_side",
  "right_side",
  "arch",
  "penalty_area",
  "six_yard",
];

const LINE = "rgba(244, 241, 234, 0.82)";

function zoneSummary(zone: SoccerShotZoneLine): string {
  if (zone.conversionPct == null) {
    return `${zone.label}: ${zone.attempts} shots. Percentage hidden (under 5 attempts).`;
  }
  return `${zone.label}: ${zone.attempts} shots, ${zone.conversionPct.toFixed(1)}% on target.`;
}

export function SoccerShotChart({
  model,
  coverage,
}: {
  model: SoccerShotChartModel;
  /** Sentence under the total. The player map names the full-season profile. */
  coverage: string;
}) {
  const [active, setActive] = useState<SoccerShotZone | null>(null);
  const activeZone = model.zones.find((zone) => zone.zone === active) ?? null;
  const byZone = new Map(model.zones.map((zone) => [zone.zone, zone]));

  return (
    <div className="grid min-w-0 items-start gap-4 overflow-x-hidden lg:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)] lg:gap-5">
      <div className="flex min-w-0 justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#10131a] p-3 shadow-panel sm:p-4">
        <svg
          data-testid="soccer-shot-chart"
          viewBox={`0 0 ${PITCH_WIDTH} ${PITCH_HEIGHT}`}
          role="group"
          aria-label="Attacking half. Goal at the top."
          className="h-auto max-w-full"
          style={{
            aspectRatio: `${PITCH_WIDTH} / ${PITCH_HEIGHT}`,
            width: `min(100%, calc(70vh * ${PITCH_WIDTH} / ${PITCH_HEIGHT}))`,
          }}
        >
          <rect width={PITCH_WIDTH} height={PITCH_HEIGHT} fill="#0c0e12" />
          {DRAW_ORDER.map((zone) => {
            const line = byZone.get(zone);
            if (!line) return null;
            return (
              <path
                key={zone}
                d={zonePath(zone)}
                fill={line.fill}
                stroke="transparent"
                opacity={0.92}
                role="button"
                tabIndex={0}
                aria-label={zoneSummary(line)}
                onMouseEnter={() => setActive(zone)}
                onFocus={() => setActive(zone)}
                onClick={() => setActive(zone)}
              />
            );
          })}
          <g fill="none" stroke={LINE} strokeWidth={2} pointerEvents="none">
            <rect x={0} y={0} width={PITCH_WIDTH} height={PITCH_HEIGHT} />
            <rect x={138.4} y={0} width={403.2} height={165} />
            <rect x={248.4} y={0} width={183.2} height={55} />
            <path d="M 266.8 165 A 91.5 91.5 0 0 1 413.2 165" />
            <line x1={0} y1={PITCH_HEIGHT} x2={PITCH_WIDTH} y2={PITCH_HEIGHT} />
          </g>
          <g pointerEvents="none">
            {model.shots.map((shot, index) => {
              if (!pitchMarkerVisible(shot.x)) return null;
              const point = pitchMarker(shot.x, shot.y);
              if (shot.converted) {
                return (
                  <circle
                    key={`${shot.x}-${shot.y}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={5}
                    fill="#34d399"
                    stroke="#052e16"
                    strokeWidth={1}
                  />
                );
              }
              return (
                <path
                  key={`${shot.x}-${shot.y}-${index}`}
                  d={`M ${point.x - 4} ${point.y - 4} L ${point.x + 4} ${point.y + 4} M ${point.x + 4} ${point.y - 4} L ${point.x - 4} ${point.y + 4}`}
                  stroke="#fb7185"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        </svg>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border bg-[#10131a] px-4 py-3 text-2xs uppercase tracking-wider text-[#c8c2b4]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#34d399]" />
            On target
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-[11px] leading-none text-[#fb7185]">✕</span>
            Off target
          </span>
          <span className="text-[#8b8678]">Zone color follows on-target rate. Under 5 attempts stay grey.</span>
        </div>
        <div className="rounded-2xl border bg-[#10131a] px-4 py-3 text-[#f4f1ea]">
          <p className="text-2xs font-medium uppercase tracking-wider text-[#a39b8c]">On target</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">
            {model.conversionPct == null ? "—" : `${model.conversionPct.toFixed(1)}%`}
          </p>
          <p className="text-sm text-[#c8c2b4]">
            {model.converted}/{model.attempts} shots
            {model.conversionPct == null && model.attempts > 0 ? " · percentage hidden under 5 attempts" : ""}
          </p>
          <p className="mt-2 text-xs normal-case tracking-normal text-[#a39b8c]">{coverage}</p>
        </div>
        <div aria-live="polite" className="rounded-2xl border bg-surface-elevated px-4 py-3">
          {activeZone ? (
            <>
              <p className="text-sm font-semibold text-foreground">{activeZone.label}</p>
              <p className="mt-1 text-sm tabular-nums text-foreground">
                {activeZone.attempts} shots
                {activeZone.conversionPct == null ? "" : ` · ${activeZone.conversionPct.toFixed(1)}% on target`}
              </p>
              {activeZone.conversionPct == null ? (
                <p className="mt-1 text-xs text-muted-foreground">Under 5 attempts — no percentage shown.</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">{activeZone.converted} on target.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Hover or tap a zone for shots and the on-target rate.</p>
          )}
        </div>
        <ul className="divide-y rounded-2xl border bg-surface-elevated">
          {model.zones.map((zone) => (
            <li key={zone.zone}>
              <button
                type="button"
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm ${active === zone.zone ? "bg-accent" : "hover:bg-accent"}`}
                onMouseEnter={() => setActive(zone.zone)}
                onFocus={() => setActive(zone.zone)}
                onClick={() => setActive(zone.zone)}
              >
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm border border-white/30" style={{ background: zone.fill }} />
                  {zone.label}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {zone.attempts} att
                  {zone.conversionPct == null ? "" : ` · ${zone.conversionPct.toFixed(1)}%`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function zonePath(zone: SoccerShotZone): string {
  switch (zone) {
    case "six_yard":
      return "M 248.4 0 H 431.6 V 55 H 248.4 Z";
    case "penalty_area":
      return "M 138.4 0 H 541.6 V 165 H 138.4 Z M 248.4 0 H 431.6 V 55 H 248.4 Z";
    case "arch":
      return "M 266.8 165 A 91.5 91.5 0 0 1 413.2 165 Z";
    case "left_side":
      return `M 0 0 H 138.4 V ${PITCH_HEIGHT} H 0 Z`;
    case "right_side":
      return `M 541.6 0 H ${PITCH_WIDTH} V ${PITCH_HEIGHT} H 541.6 Z`;
    case "outside_box":
      return `M 138.4 165 H 541.6 V ${PITCH_HEIGHT} H 138.4 Z`;
    default:
      return "";
  }
}
