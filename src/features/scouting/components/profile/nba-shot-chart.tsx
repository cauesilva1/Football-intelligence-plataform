"use client";

import { useState } from "react";
import {
  CORNER_LABEL_POINTS,
  COURT_VIEW,
  RIM,
  courtLinesPath,
  courtZonePath,
  zoneLabelPoint,
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

function zoneSummary(zone: NbaShotZoneLine): string {
  if (zone.fgPct == null) {
    return `${zone.label}: ${zone.attempts} attempts. Percentage hidden (under 5 attempts).`;
  }
  return `${zone.label}: ${zone.attempts} attempts, ${zone.fgPct.toFixed(1)}% FG.`;
}

function ZoneCopy({
  zone,
  compact = false,
}: {
  zone: { x: number; y: number; line: NbaShotZoneLine; size?: number };
  compact?: boolean;
}) {
  const size = zone.size ?? (compact ? 10 : 13);
  return (
    <text
      x={zone.x}
      y={zone.y}
      textAnchor="middle"
      fill={zone.line.ink}
      fontSize={size}
      fontWeight={700}
      stroke="#ffffff"
      strokeWidth={compact ? 2 : 3}
      paintOrder="stroke"
      style={{ pointerEvents: "none" }}
    >
      <tspan x={zone.x} dy={compact ? 0 : -2}>
        {zone.line.attempts}
      </tspan>
      {zone.line.fgPct != null && !compact ? (
        <tspan x={zone.x} dy={15}>
          {zone.line.fgPct.toFixed(1)}%
        </tspan>
      ) : null}
    </text>
  );
}

export function NbaShotChart({ model }: { model: NbaShotChartModel }) {
  const [active, setActive] = useState<BasketballShotZone | null>(null);
  const activeZone = model.zones.find((zone) => zone.zone === active) ?? null;
  const byZone = new Map(model.zones.map((zone) => [zone.zone, zone]));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
      <svg
        data-testid="nba-shot-chart"
        viewBox={COURT_VIEW.viewBox}
        role="group"
        aria-label="NBA shot chart by court zone"
        className="w-full rounded-xl bg-[#f4f1ea]"
      >
        {DRAW_ORDER.map((zoneId) => byZone.get(zoneId))
          .filter((zone): zone is NbaShotZoneLine => zone != null)
          .map((zone) => (
          <path
            key={zone.zone}
            data-zone={zone.zone}
            d={courtZonePath(zone.zone)}
            fill={zone.fill}
            stroke="#ffffff"
            strokeWidth={active === zone.zone ? 3 : 1.25}
            tabIndex={0}
            role="button"
            aria-label={zoneSummary(zone)}
            aria-pressed={active === zone.zone}
            className="cursor-pointer outline-none focus-visible:stroke-foreground"
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
        ))}
        <path d={courtLinesPath()} fill="none" stroke="#0f172a" strokeWidth={1.6} style={{ pointerEvents: "none" }} />
        <circle cx={RIM.cx} cy={RIM.cy} r={RIM.r} fill="none" stroke="#c2410c" strokeWidth={2} style={{ pointerEvents: "none" }} />
        {model.zones.map((zone) => {
          const point = zoneLabelPoint(zone.zone);
          if (!point || zone.attempts === 0) return null;
          return <ZoneCopy key={zone.zone} zone={{ ...point, line: zone }} />;
        })}
        {CORNER_LABEL_POINTS.map((point, index) => {
          const line = byZone.get("corner_3");
          if (!line || line.attempts === 0) return null;
          return <ZoneCopy key={index} compact zone={{ ...point, line, size: 10 }} />;
        })}
      </svg>

      <div className="space-y-4">
        <div className="rounded-xl border bg-surface-muted/50 px-4 py-3">
          <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Overall FG%</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-foreground">
            {model.fgPct == null ? "—" : `${model.fgPct.toFixed(1)}%`}
          </p>
          <p className="text-sm text-muted-foreground">
            {model.made}/{model.attempts} field goals
            {model.fgPct == null && model.attempts > 0 ? " · percentage hidden under 5 attempts" : ""}
          </p>
        </div>

        <div aria-live="polite" className="rounded-xl border px-4 py-3">
          {activeZone ? (
            <>
              <p className="text-sm font-semibold text-foreground">{activeZone.label}</p>
              <p className="mt-1 text-sm tabular-nums text-foreground">
                {activeZone.attempts} attempts
                {activeZone.fgPct == null ? "" : ` · ${activeZone.fgPct.toFixed(1)}% FG`}
              </p>
              {activeZone.fgPct == null ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Under 5 attempts — no percentage shown.
                </p>
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

        <ul className="divide-y rounded-xl border">
          {model.zones.map((zone) => (
            <li key={zone.zone}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent"
                onMouseEnter={() => setActive(zone.zone)}
                onFocus={() => setActive(zone.zone)}
                onClick={() => setActive(zone.zone)}
              >
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm border" style={{ background: zone.fill }} />
                  {zone.label}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {zone.attempts} att
                  {zone.fgPct == null ? "" : ` · ${zone.fgPct.toFixed(1)}%`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
