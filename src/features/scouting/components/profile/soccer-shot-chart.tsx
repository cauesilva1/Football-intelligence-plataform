"use client";

import { useId, useState } from "react";
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
const LINE_SOFT = "rgba(244, 241, 234, 0.45)";
const PAD_X = 16;
const PAD_TOP = 28;
const PAD_BOTTOM = 16;

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
  const stripeId = useId().replace(/:/g, "");
  const [active, setActive] = useState<SoccerShotZone | null>(null);
  const activeZone = model.zones.find((zone) => zone.zone === active) ?? null;
  const byZone = new Map(model.zones.map((zone) => [zone.zone, zone]));

  return (
    <div className="grid min-w-0 items-start gap-4 overflow-x-hidden lg:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)] lg:gap-5">
      <div className="flex min-w-0 justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#10131a] p-3 shadow-panel sm:p-4">
        <svg
          data-testid="soccer-shot-chart"
          viewBox={`${-PAD_X} ${-PAD_TOP} ${PITCH_WIDTH + PAD_X * 2} ${PITCH_HEIGHT + PAD_TOP + PAD_BOTTOM}`}
          role="group"
          aria-label="Attacking half. Goal at the top."
          className="h-auto max-w-full"
          style={{
            aspectRatio: `${PITCH_WIDTH + PAD_X * 2} / ${PITCH_HEIGHT + PAD_TOP + PAD_BOTTOM}`,
            width: `min(100%, calc(70vh * ${PITCH_WIDTH + PAD_X * 2} / ${PITCH_HEIGHT + PAD_TOP + PAD_BOTTOM}))`,
          }}
        >
          <defs>
            <pattern id={stripeId} width={PITCH_WIDTH} height="36" patternUnits="userSpaceOnUse">
              <rect width={PITCH_WIDTH} height="18" fill="#141820" />
              <rect y="18" width={PITCH_WIDTH} height="18" fill="#171c26" />
            </pattern>
          </defs>
          <rect x={-PAD_X} y={-PAD_TOP} width={PITCH_WIDTH + PAD_X * 2} height={PITCH_HEIGHT + PAD_TOP + PAD_BOTTOM} fill="#0c0e12" />
          <rect width={PITCH_WIDTH} height={PITCH_HEIGHT} fill={`url(#${stripeId})`} />
          {DRAW_ORDER.map((zone) => {
            const line = byZone.get(zone);
            if (!line) return null;
            const selected = active === zone;
            const quiet = line.conversionPct == null;
            return (
              <path
                key={zone}
                d={zonePath(zone)}
                fill={line.fill}
                fillRule="evenodd"
                fillOpacity={selected ? 0.62 : quiet ? 0.22 : 0.4}
                stroke={selected ? "#f8fafc" : "transparent"}
                strokeWidth={selected ? 2.25 : 0}
                className="cursor-pointer outline-none"
                role="button"
                tabIndex={0}
                aria-label={zoneSummary(line)}
                aria-pressed={selected}
                onMouseEnter={() => setActive(zone)}
                onMouseLeave={() => setActive((current) => (current === zone ? null : current))}
                onFocus={() => setActive(zone)}
                onBlur={() => setActive((current) => (current === zone ? null : current))}
                onClick={() => setActive(zone)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActive(zone);
                  }
                }}
              />
            );
          })}
          <g fill="none" stroke={LINE} strokeWidth={1.5} strokeLinejoin="round" pointerEvents="none">
            <rect x={0} y={0} width={PITCH_WIDTH} height={PITCH_HEIGHT} />
            <rect x={138.4} y={0} width={403.2} height={165} rx={2} />
            <rect x={248.4} y={0} width={183.2} height={55} rx={1.5} />
            <path d="M 266.8 165 A 91.5 91.5 0 0 1 413.2 165" />
            <line x1={0} y1={PITCH_HEIGHT} x2={PITCH_WIDTH} y2={PITCH_HEIGHT} />
          </g>
          <g fill="none" stroke={LINE_SOFT} strokeWidth={1.3} pointerEvents="none">
            <circle cx={340} cy={110} r={2.4} fill={LINE_SOFT} />
          </g>
          <g fill="none" stroke="#fb923c" strokeWidth={1.8} strokeLinejoin="round" pointerEvents="none">
            <path d="M 303.4 -2 V -16 H 376.6 V -2" />
          </g>
          <text
            x={PITCH_WIDTH / 2}
            y={-20}
            textAnchor="middle"
            fill="#a39b8c"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontSize="11"
            fontWeight="600"
            letterSpacing="1.6"
            pointerEvents="none"
          >
            GOAL
          </text>
          <g pointerEvents="none">
            {model.shots.map((shot, index) => {
              if (!pitchMarkerVisible(shot.x)) return null;
              const point = pitchMarker(shot.x, shot.y);
              const dim = active != null && shot.zone !== active;
              return (
                <g key={`${shot.x}-${shot.y}-${index}`} opacity={dim ? 0.28 : 1} transform={`translate(${point.x} ${point.y})`}>
                  {shot.converted ? (
                    <circle r={4} fill="#34d399" stroke="#042f24" strokeWidth={0.8} />
                  ) : (
                    <path
                      d="M -3.4 -3.4 L 3.4 3.4 M -3.4 3.4 L 3.4 -3.4"
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
  const h = PITCH_HEIGHT;
  const w = PITCH_WIDTH;
  const corner = 18;
  switch (zone) {
    case "six_yard":
      return "M 248.4 0 H 431.6 V 55 H 248.4 Z";
    case "penalty_area":
      return "M 138.4 0 H 541.6 V 165 H 138.4 Z M 248.4 0 H 431.6 V 55 H 248.4 Z";
    case "arch":
      return "M 266.8 165 A 91.5 91.5 0 0 1 413.2 165 Z";
    case "left_side":
      return `M ${corner} 0 H 138.4 V ${h} H ${corner} Q 0 ${h} 0 ${h - corner} V ${corner} Q 0 0 ${corner} 0 Z`;
    case "right_side":
      return `M ${w - corner} 0 H 541.6 V ${h} H ${w - corner} Q ${w} ${h} ${w} ${h - corner} V ${corner} Q ${w} 0 ${w - corner} 0 Z`;
    case "outside_box":
      return `M 138.4 165 H 266.8 A 91.5 91.5 0 0 1 413.2 165 H 541.6 V ${h - corner} Q 541.6 ${h} ${541.6 - corner} ${h} H ${138.4 + corner} Q 138.4 ${h} 138.4 ${h - corner} Z`;
    default:
      return "";
  }
}
