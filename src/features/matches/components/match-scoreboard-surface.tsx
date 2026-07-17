import type { ReactNode } from "react";
import type { Sport } from "@/lib/sport";
import { cn } from "@/lib/utils";

function BasketballCourtArt() {
  return (
    <svg
      viewBox="0 0 800 420"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <rect x="36" y="36" width="728" height="348" rx="10" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle cx="400" cy="210" r="52" fill="none" stroke="currentColor" strokeWidth="3" />
      <line x1="400" y1="36" x2="400" y2="384" stroke="currentColor" strokeWidth="3" />
      <rect x="36" y="115" width="128" height="190" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="164" cy="210" r="52" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M164 115 A95 95 0 0 1 164 305" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <rect x="636" y="115" width="128" height="190" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="636" cy="210" r="52" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M636 115 A95 95 0 0 0 636 305" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="210" r="12" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="750" cy="210" r="12" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

function SoccerPitchArt() {
  return (
    <svg
      viewBox="0 0 800 420"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <rect x="36" y="36" width="728" height="348" rx="6" fill="none" stroke="currentColor" strokeWidth="4" />
      <line x1="400" y1="36" x2="400" y2="384" stroke="currentColor" strokeWidth="3" />
      <circle cx="400" cy="210" r="60" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="400" cy="210" r="4" fill="currentColor" />
      <rect x="36" y="105" width="118" height="210" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="36" y="145" width="52" height="130" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <rect x="646" y="105" width="118" height="210" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="712" y="145" width="52" height="130" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="120" cy="210" r="3" fill="currentColor" />
      <circle cx="680" cy="210" r="3" fill="currentColor" />
      <path d="M154 155 A55 55 0 0 1 154 265" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M646 155 A55 55 0 0 0 646 265" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

function AmericanFootballFieldArt() {
  return (
    <svg
      viewBox="0 0 800 420"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <rect x="36" y="55" width="728" height="310" rx="8" fill="none" stroke="currentColor" strokeWidth="4" />
      {Array.from({ length: 11 }, (_, i) => {
        const x = 36 + i * 72.8;
        return (
          <g key={i}>
            <line
              x1={x}
              y1="55"
              x2={x}
              y2="365"
              stroke="currentColor"
              strokeWidth={i === 5 ? 3 : 1.8}
            />
            {i > 0 && i < 10 ? (
              <>
                <line x1={x - 10} y1="115" x2={x + 10} y2="115" stroke="currentColor" strokeWidth="1.8" />
                <line x1={x - 10} y1="305" x2={x + 10} y2="305" stroke="currentColor" strokeWidth="1.8" />
              </>
            ) : null}
          </g>
        );
      })}
      {Array.from({ length: 21 }, (_, i) => {
        const x = 36 + i * 36.4;
        return (
          <g key={`h-${i}`}>
            <line x1={x} y1="190" x2={x} y2="210" stroke="currentColor" strokeWidth="1.4" />
            <line x1={x} y1="210" x2={x} y2="230" stroke="currentColor" strokeWidth="1.4" />
          </g>
        );
      })}
    </svg>
  );
}

function SurfaceArt({ sport }: { sport: Sport }) {
  if (sport === "BASKETBALL") return <BasketballCourtArt />;
  if (sport === "AMERICAN_FOOTBALL") return <AmericanFootballFieldArt />;
  return <SoccerPitchArt />;
}

/** Scoreboard hero with a court/pitch/field diagram behind the score. */
export function MatchScoreboardSurface({
  sport,
  children,
  className,
}: {
  sport: Sport;
  children: ReactNode;
  className?: string;
}) {
  const artTone =
    sport === "BASKETBALL"
      ? "text-[hsl(24_95%_58%)]"
      : sport === "AMERICAN_FOOTBALL"
        ? "text-[hsl(214_88%_62%)]"
        : "text-[hsl(142_71%_52%)]";

  return (
    <div
      className={cn(
        "sport-hero match-scoreboard relative overflow-hidden rounded-2xl border border-primary/25 p-5 shadow-panel md:p-8",
        className
      )}
    >
      <div className={cn("match-scoreboard-art pointer-events-none", artTone)} aria-hidden>
        <div className="absolute inset-4 opacity-[0.34] md:inset-6 md:opacity-[0.38]">
          <SurfaceArt sport={sport} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/35 via-transparent to-background/55" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
