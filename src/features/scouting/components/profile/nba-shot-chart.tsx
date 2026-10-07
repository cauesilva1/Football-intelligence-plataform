"use client";

import { useState } from "react";
import {
  COURT_LINES,
  COURT_VIEW,
  RIM,
  courtZonePath,
  shotMarkerPoint,
} from "@/lib/basketball/court-geometry";
import type { NbaShotChartModel, NbaShotZoneLine } from "@/features/scouting/queries/nba-shot-chart";
import type { BasketballShotZone } from "@/lib/basketball/shot-zones";

const DRAW_ORDER: BasketballShotZone[] = [
  "above_the_break_3",
  "corner_3",
  "mid_range",
  "paint",
  "restricted_area",
];

const LINE = "rgba(244, 241, 234, 0.82)";
const LINE_SOFT = "rgba(244, 241, 234, 0.45)";

function zoneSummary(zone: NbaShotZoneLine): string {
  if (zone.fgPct == null) {
    return `${zone.label}: ${zone.attempts} attempts. Percentage hidden (under 5 attempts).`;
  }
  return `${zone.label}: ${zone.attempts} attempts, ${zone.fgPct.toFixed(1)}% FG.`;
}

export function NbaShotChart({ model }: { model: NbaShotChartModel }) {
  const [active, setActive] = useState<BasketballShotZone | null>(null);
  const activeZone = model.zones.find((zone) => zone.zone === active) ?? null;
  const byZone = new Map(model.zones.map((zone) => [zone.zone, zone]));

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#10131a] p-3 shadow-panel sm:p-4">
        <svg
          data-testid="nba-shot-chart"
          viewBox={COURT_VIEW.viewBox}
          role="group"
          aria-label="NBA half court, basket at the bottom"
          className="h-auto w-full"
        >
          <rect
            x={COURT_VIEW.viewBox.split(" ")[0]}
            y={COURT_VIEW.viewBox.split(" ")[1]}
            width={COURT_VIEW.viewBox.split(" ")[2]}
            height={COURT_VIEW.viewBox.split(" ")[3]}
            fill="#10131a"
          />
          {DRAW_ORDER.map((zoneId) => byZone.get(zoneId))
            .filter((zone): zone is NbaShotZoneLine => zone != null)
            .map((zone) => {
              const selected = active === zone.zone;
              const quiet = zone.fgPct == null;
              return (
                <path
                  key={zone.zone}
                  data-zone={zone.zone}
                  d={courtZonePath(zone.zone)}
                  fill={zone.fill}
                  fillRule="evenodd"
                  fillOpacity={selected ? 0.62 : quiet ? 0.2 : 0.38}
                  stroke={selected ? "#f8fafc" : "transparent"}
                  strokeWidth={selected ? 2.25 : 0}
                  tabIndex={0}
                  role="button"
                  aria-label={zoneSummary(zone)}
                  aria-pressed={selected}
                  className="cursor-pointer outline-none"
                  onMouseEnter={() => setActive(zone.zone)}
                  onMouseLeave={() => setActive((current) => (current === zone.zone ? null : current))}
                  onFocus={() => setActive(zone.zone)}
                  onBlur={() => setActive((current) => (current === zone.zone ? null : current))}
                  onClick={() => setActive(zone.zone)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActive(zone.zone);
                    }
                  }}
                />
              );
            })}
          <g fill="none" stroke={LINE} strokeWidth={1.6} strokeLinejoin="round" style={{ pointerEvents: "none" }}>
            <path d={COURT_LINES.boundary} />
            <path d={COURT_LINES.paint} />
            <path d={COURT_LINES.freeThrowTop} />
            <path d={COURT_LINES.restricted} />
            <path d={COURT_LINES.three} />
            <path d={COURT_LINES.centerCircle} />
            <path d={COURT_LINES.backboard} strokeWidth={2.4} />
            <path d={COURT_LINES.connector} strokeWidth={1.4} />
          </g>
          <path
            d={COURT_LINES.freeThrowBottom}
            fill="none"
            stroke={LINE_SOFT}
            strokeWidth={1.4}
            strokeDasharray="4 3.5"
            style={{ pointerEvents: "none" }}
          />
          <circle
            cx={RIM.cx}
            cy={RIM.cy}
            r={RIM.r}
            fill="none"
            stroke="#fb923c"
            strokeWidth={2}
            style={{ pointerEvents: "none" }}
          />
          <g style={{ pointerEvents: "none" }}>
            {model.shots.map((shot, index) => {
              const point = shotMarkerPoint(shot.x, shot.y);
              const dim = active != null && shot.zone !== active;
              return (
                <g key={`${shot.x}-${shot.y}-${index}`} opacity={dim ? 0.28 : 1} transform={`translate(${point.x} ${point.y})`}>
                  {shot.made ? (
                    <circle r={3.5} fill="#34d399" stroke="#042f24" strokeWidth={0.8} />
                  ) : (
                    <path
                      d="M -3.1 -3.1 L 3.1 3.1 M -3.1 3.1 L 3.1 -3.1"
                      fill="none"
                      stroke="#fb7185"
                      strokeWidth={1.7}
                      strokeLinecap="round"
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        <div className="mt-3 flex flex-wrap items-center gap-4 px-1 text-2xs uppercase tracking-wider text-[#c8c2b4]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#34d399]" />
            Make
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-[11px] leading-none text-[#fb7185]">✕</span>
            Miss
          </span>
          <span className="text-[#8b8678]">Zone color follows FG%. Under 5 attempts stay grey.</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border bg-[#10131a] px-4 py-3 text-[#f4f1ea]">
          <p className="text-2xs font-medium uppercase tracking-wider text-[#a39b8c]">Overall FG%</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">
            {model.fgPct == null ? "—" : `${model.fgPct.toFixed(1)}%`}
          </p>
          <p className="text-sm text-[#c8c2b4]">
            {model.made}/{model.attempts} field goals
            {model.fgPct == null && model.attempts > 0 ? " · percentage hidden under 5 attempts" : ""}
          </p>
        </div>

        <div aria-live="polite" className="rounded-2xl border bg-surface-elevated px-4 py-3">
          {activeZone ? (
            <>
              <p className="text-sm font-semibold text-foreground">{activeZone.label}</p>
              <p className="mt-1 text-sm tabular-nums text-foreground">
                {activeZone.attempts} attempts
                {activeZone.fgPct == null ? "" : ` · ${activeZone.fgPct.toFixed(1)}% FG`}
              </p>
              {activeZone.fgPct == null ? (
                <p className="mt-1 text-xs text-muted-foreground">Under 5 attempts — no percentage shown.</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeZone.made} made. Overall FG% {model.fgPct == null ? "—" : `${model.fgPct.toFixed(1)}%`}.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Hover or tap a zone for attempts and FG%.</p>
          )}
        </div>

        <ul className="divide-y rounded-2xl border bg-surface-elevated">
          {model.zones.map((zone) => {
            const selected = active === zone.zone;
            return (
              <li key={zone.zone}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm ${selected ? "bg-accent" : "hover:bg-accent"}`}
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
                    {zone.fgPct == null ? "" : ` · ${zone.fgPct.toFixed(1)}%`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
