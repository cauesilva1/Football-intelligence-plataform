"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { getHubSeasonPref, saveHubSeasonPref } from "@/lib/client/browser-storage";
import { cn } from "@/lib/utils";

export interface HubSeasonSlice {
  seasonYear: number;
  seasonLabel: string;
  kind: "current" | "past";
  hasStandings: boolean;
  hasLeaders: boolean;
}

/** Restore last hub season from localStorage when URL has no ?season=. */
export function HubSeasonRestore({ slug }: { slug: string }) {
  const router = useRouter();
  const didRestore = useRef(false);

  useEffect(() => {
    if (didRestore.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("season")) return;
    const saved = getHubSeasonPref(slug);
    if (saved == null) return;
    didRestore.current = true;
    router.replace(`/tournaments/${slug}?season=${saved}`, { scroll: false });
  }, [slug, router]);

  return null;
}

export function HubSeasonToggle({
  slug,
  slices,
  selectedSeasonYear,
}: {
  slug: string;
  slices: HubSeasonSlice[];
  selectedSeasonYear: number;
}) {
  if (slices.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        Season
      </span>
      {slices.map((slice) => {
        const active = slice.seasonYear === selectedSeasonYear;
        const suffix =
          slice.kind === "current"
            ? slice.hasStandings || slice.hasLeaders
              ? "current"
              : "current · no data"
            : "past";
        return (
          <Link
            key={slice.seasonYear}
            href={`/tournaments/${slug}?season=${slice.seasonYear}`}
            onClick={() => saveHubSeasonPref(slug, slice.seasonYear)}
            className={cn(
              buttonVariants({
                variant: active ? "default" : "outline",
                size: "sm",
              }),
              "h-8 px-3 text-xs"
            )}
            scroll={false}
          >
            {slice.seasonLabel}
            <span
              className={cn(
                "ml-1.5 font-normal",
                active ? "opacity-80" : "text-muted-foreground"
              )}
            >
              · {suffix}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
