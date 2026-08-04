import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
  title?: string;
};

/** Classic soccer ball — readable at 16px (not a crest/badge). */
export function SoccerBallIcon({ className, title = "Soccer" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
      {/* Center pentagon */}
      <path
        d="M12 9.15 13.85 10.5l-.7 2.2h-2.3l-.7-2.2L12 9.15Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Panel seams from pentagon to rim */}
      <path
        d="M12 9.15V5.4M13.85 10.5l3.35-1.85M13.15 12.7l2.95 2.55M10.85 12.7 7.9 15.25M10.15 10.5 6.8 8.65"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Outer panel hints */}
      <path
        d="M8.35 6.9c1.1-.55 2.35-.9 3.65-.9s2.55.35 3.65.9M6.55 13.35c-.35 1.15-.35 2.4 0 3.55M17.45 13.35c.35 1.15.35 2.4 0 3.55"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Lightweight basketball mark — pure SVG, no assets. */
export function BasketballIcon({ className, title = "Basketball" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 2.75v18.5M2.75 12h18.5M5.2 5.2c2.9 2.55 4.55 5.9 4.55 6.8 0 .9-1.65 4.25-4.55 6.8M18.8 5.2c-2.9 2.55-4.55 5.9-4.55 6.8 0 .9 1.65 4.25 4.55 6.8"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Lightweight American football (gridiron) mark — oval with lace stitches. */
export function AmericanFootballIcon({
  className,
  title = "American Football",
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <ellipse
        cx="12"
        cy="12"
        rx="9.2"
        ry="5.85"
        transform="rotate(-28 12 12)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M9.2 11.1h5.6M10.1 9.55v3.1M12 9.35v3.5M13.9 9.55v3.1"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M5.4 9.2c1.1-.55 2.35-.9 3.7-1.05M18.6 14.8c-1.1.55-2.35.9-3.7 1.05"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** OmniScout wordmark icon — sport-aware ball inside a scout monogram. */
export function OmniScoutMark({
  sport,
  className,
}: {
  sport: "SOCCER" | "BASKETBALL" | "AMERICAN_FOOTBALL";
  className?: string;
}) {
  const Ball =
    sport === "BASKETBALL"
      ? BasketballIcon
      : sport === "AMERICAN_FOOTBALL"
        ? AmericanFootballIcon
        : SoccerBallIcon;

  return (
    <span
      className={cn(
        "relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30 transition-colors",
        className
      )}
      aria-hidden
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.28),transparent_55%)]" />
      <Ball className="relative h-4 w-4" />
    </span>
  );
}
