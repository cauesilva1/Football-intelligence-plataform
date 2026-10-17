"use client";

import { useState } from "react";
import {
  BLUE_LINE_X,
  FACEOFF_RADIUS,
  FACEOFF_X,
  FACEOFF_Y,
  GOAL_LINE_X,
  RINK_HALF_LENGTH,
  RINK_HALF_WIDTH,
  type HockeyRinkView,
  type HockeyShotChartModel,
  type HockeyShotZone,
} from "@/lib/hockey/rink-geometry";

const LINE = "rgba(244, 241, 234, 0.82)";
const LINE_SOFT = "rgba(244, 241, 234, 0.45)";
const BLUE = "rgba(125, 211, 252, 0.9)";
const RED = "rgba(251, 113, 133, 0.9)";

function rinkY(y: number): number {
  return -y;
}

function zoneSummary(zone: HockeyShotChartModel["zones"][number]): string {
  if (zone.shootingPct == null) {
    return `${zone.label}: ${zone.attempts} shots. Percentage hidden (under 5 shots).`;
  }
  return `${zone.label}: ${zone.attempts} shots, ${zone.shootingPct.toFixed(1)}% shooting.`;
}

export function HockeyShotChart({
  model,
  view = "offense",
}: {
  model: HockeyShotChartModel;
  view?: HockeyRinkView;
}) {
  const [active, setActive] = useState<HockeyShotZone | null>(null);
  if (model.attempts === 0) {
    return <p className="text-sm text-muted-foreground">No shot data yet</p>;
  }

  const activeZone = model.zones.find((zone) => zone.zone === active) ?? null;
  const byZone = new Map(model.zones.map((zone) => [zone.zone, zone]));
  const full = view === "full";
  const viewBox = full ? "-104 -48 208 96" : "-2 -48 104 96";
  const [, , viewW, viewH] = viewBox.split(" ").map(Number);

  return (
    <div className="grid min-w-0 items-start gap-4 overflow-x-hidden lg:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)] lg:gap-5">
      <div className="min-w-0 rounded-2xl border border-white/10 bg-[#10131a] p-3 shadow-panel sm:p-4">
        <svg
          data-testid="hockey-shot-chart"
          data-rink-view={view}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label={full ? "Full hockey rink, shots folded to the attacking net" : "Attacking half rink"}
          className="mx-auto block h-auto w-full"
          style={{ aspectRatio: `${viewW} / ${viewH}`, maxHeight: full ? "70vh" : undefined }}
        >
          <rect x={full ? -104 : -2} y={-48} width={full ? 208 : 104} height={96} fill="#0c0e12" />
          <RinkBoards full={full} />
          {(["perimeter", "point", "circles", "slot"] as const).map((zoneId) => byZone.get(zoneId))
            .filter((zone): zone is HockeyShotChartModel["zones"][number] => zone != null)
            .map((zone) => {
              const selected = active === zone.zone;
              const quiet = zone.shootingPct == null;
              return (
                <path
                  key={zone.zone}
                  data-zone={zone.zone}
                  d={zonePath(zone.zone)}
                  fill={zone.fill}
                  fillOpacity={selected ? 0.62 : quiet ? 0.2 : 0.38}
                  stroke={selected ? "#f8fafc" : "transparent"}
                  strokeWidth={selected ? 1.4 : 0}
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
          <RinkLines full={full} />
          <g style={{ pointerEvents: "none" }}>
            {model.shots.map((shot, index) => (
              <g
                key={`${shot.x}-${shot.y}-${index}`}
                data-outcome={shot.made ? "goal" : "no-goal"}
                data-x={shot.x}
                data-y={shot.y}
                opacity={active != null && shot.zone !== active ? 0.28 : 1}
                transform={`translate(${shot.x} ${rinkY(shot.y)})`}
              >
                {shot.made ? (
                  <circle r={1.7} fill="#34d399" stroke="#042f24" strokeWidth={0.4} />
                ) : (
                  <path
                    d="M -1.5 -1.5 L 1.5 1.5 M -1.5 1.5 L 1.5 -1.5"
                    fill="none"
                    stroke="#fb7185"
                    strokeWidth={0.7}
                    strokeLinecap="round"
                  />
                )}
              </g>
            ))}
          </g>
        </svg>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border bg-[#10131a] px-4 py-3 text-2xs uppercase tracking-wider text-[#c8c2b4]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#34d399]" />
            Goals {model.goals}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-[11px] leading-none text-[#fb7185]">✕</span>
            No goal {model.attempts - model.goals}
          </span>
          <span className="text-[#8b8678]">
            {model.attempts} shots. Zone color follows shooting %. Under 5 shots stay grey.
          </span>
        </div>
        <div className="rounded-2xl border bg-[#10131a] px-4 py-3 text-[#f4f1ea]">
          <p className="text-2xs font-medium uppercase tracking-wider text-[#a39b8c]">Shooting %</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">
            {model.shootingPct == null ? "—" : `${model.shootingPct.toFixed(1)}%`}
          </p>
          <p className="text-sm text-[#c8c2b4]">
            {model.goals}/{model.attempts} goals
            {model.shootingPct == null ? " · percentage hidden under 5 shots" : ""}
          </p>
          <p className="mt-2 text-xs normal-case tracking-normal text-[#a39b8c]">
            Map reflects {model.trackedGames} tracked {model.trackedGames === 1 ? "game" : "games"} with coordinates.
            Saves, misses, and blocks are not separated in the stored feed.
          </p>
        </div>
        <div aria-live="polite" className="rounded-2xl border bg-surface-elevated px-4 py-3">
          {activeZone ? (
            <>
              <p className="text-sm font-semibold text-foreground">{activeZone.label}</p>
              <p className="mt-1 text-sm tabular-nums text-foreground">
                {activeZone.attempts} shots
                {activeZone.shootingPct == null ? "" : ` · ${activeZone.shootingPct.toFixed(1)}%`}
              </p>
              {activeZone.shootingPct == null ? (
                <p className="mt-1 text-xs text-muted-foreground">Under 5 shots — no percentage shown.</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">{activeZone.made} goals.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Hover or tap a zone for shots and shooting %.</p>
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
                  {zone.attempts} shots
                  {zone.shootingPct == null ? "" : ` · ${zone.shootingPct.toFixed(1)}%`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function zonePath(zone: HockeyShotZone): string {
  if (zone === "slot") return `M ${FACEOFF_X} ${rinkY(FACEOFF_Y)} H ${RINK_HALF_LENGTH} V ${rinkY(-FACEOFF_Y)} H ${FACEOFF_X} Z`;
  if (zone === "point") {
    const edge = FACEOFF_X - FACEOFF_RADIUS;
    return `M 0 ${rinkY(RINK_HALF_WIDTH)} H ${edge} V ${rinkY(-RINK_HALF_WIDTH)} H 0 Z`;
  }
  if (zone === "circles") {
    return [
      circlePath(FACEOFF_X, rinkY(FACEOFF_Y), FACEOFF_RADIUS),
      circlePath(FACEOFF_X, rinkY(-FACEOFF_Y), FACEOFF_RADIUS),
    ].join(" ");
  }
  const edge = FACEOFF_X - FACEOFF_RADIUS;
  return `M ${edge} ${rinkY(RINK_HALF_WIDTH)} H ${RINK_HALF_LENGTH} V ${rinkY(-RINK_HALF_WIDTH)} H ${edge} Z`;
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
}

function RinkBoards({ full }: { full: boolean }) {
  const radius = 28;
  const straight = RINK_HALF_LENGTH - radius;
  const endY = RINK_HALF_WIDTH - radius;
  const right = [
    `M 0 ${rinkY(RINK_HALF_WIDTH)}`,
    `H ${straight}`,
    `A ${radius} ${radius} 0 0 1 ${RINK_HALF_LENGTH} ${rinkY(endY)}`,
    `V ${rinkY(-endY)}`,
    `A ${radius} ${radius} 0 0 1 ${straight} ${rinkY(-RINK_HALF_WIDTH)}`,
    `H 0`,
    "Z",
  ].join(" ");
  const d = full
    ? [
        `M ${-straight} ${rinkY(RINK_HALF_WIDTH)}`,
        `H ${straight}`,
        `A ${radius} ${radius} 0 0 1 ${RINK_HALF_LENGTH} ${rinkY(endY)}`,
        `V ${rinkY(-endY)}`,
        `A ${radius} ${radius} 0 0 1 ${straight} ${rinkY(-RINK_HALF_WIDTH)}`,
        `H ${-straight}`,
        `A ${radius} ${radius} 0 0 1 ${-RINK_HALF_LENGTH} ${rinkY(-endY)}`,
        `V ${rinkY(endY)}`,
        `A ${radius} ${radius} 0 0 1 ${-straight} ${rinkY(RINK_HALF_WIDTH)}`,
        "Z",
      ].join(" ")
    : right;
  return <path d={d} fill="#141820" />;
}

function RinkLines({ full }: { full: boolean }) {
  const width = RINK_HALF_WIDTH;
  return (
    <g fill="none" stroke={LINE} strokeWidth={0.7} style={{ pointerEvents: "none" }}>
      <line x1={0} y1={rinkY(width)} x2={0} y2={rinkY(-width)} stroke={RED} strokeWidth={0.9} />
      <line x1={BLUE_LINE_X} y1={rinkY(width)} x2={BLUE_LINE_X} y2={rinkY(-width)} stroke={BLUE} strokeWidth={1.1} />
      {full ? (
        <line x1={-BLUE_LINE_X} y1={rinkY(width)} x2={-BLUE_LINE_X} y2={rinkY(-width)} stroke={BLUE} strokeWidth={1.1} />
      ) : null}
      <circle cx={0} cy={0} r={15} />
      <circle cx={FACEOFF_X} cy={rinkY(FACEOFF_Y)} r={FACEOFF_RADIUS} />
      <circle cx={FACEOFF_X} cy={rinkY(-FACEOFF_Y)} r={FACEOFF_RADIUS} />
      {full ? (
        <>
          <circle cx={-FACEOFF_X} cy={rinkY(FACEOFF_Y)} r={FACEOFF_RADIUS} />
          <circle cx={-FACEOFF_X} cy={rinkY(-FACEOFF_Y)} r={FACEOFF_RADIUS} />
        </>
      ) : null}
      <line x1={GOAL_LINE_X} y1={rinkY(width)} x2={GOAL_LINE_X} y2={rinkY(-width)} stroke={RED} strokeWidth={0.5} />
      <path d={creasePath(GOAL_LINE_X)} stroke={LINE_SOFT} />
      <path d={`M ${GOAL_LINE_X} ${rinkY(3)} H ${GOAL_LINE_X + 2.2} V ${rinkY(-3)} H ${GOAL_LINE_X}`} stroke={LINE} strokeWidth={0.8} />
      {full ? (
        <>
          <line x1={-GOAL_LINE_X} y1={rinkY(width)} x2={-GOAL_LINE_X} y2={rinkY(-width)} stroke={RED} strokeWidth={0.5} />
          <path d={creasePath(-GOAL_LINE_X)} stroke={LINE_SOFT} />
          <path d={`M ${-GOAL_LINE_X} ${rinkY(3)} H ${-GOAL_LINE_X - 2.2} V ${rinkY(-3)} H ${-GOAL_LINE_X}`} stroke={LINE} strokeWidth={0.8} />
        </>
      ) : null}
    </g>
  );
}

function creasePath(goalX: number): string {
  const towardCenter = goalX > 0 ? -1 : 1;
  const radius = 6;
  const y = 4;
  return `M ${goalX} ${rinkY(y)} A ${radius} ${radius} 0 0 ${goalX > 0 ? 1 : 0} ${goalX + towardCenter * radius} ${rinkY(0)} A ${radius} ${radius} 0 0 ${goalX > 0 ? 1 : 0} ${goalX} ${rinkY(-y)}`;
}
