"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useSport } from "@/context/sport-context";
import { AMERICAN_FOOTBALL_POSITIONS, BASKETBALL_POSITIONS } from "@/lib/positions";
import type { Sport } from "@/lib/sport";

const SOCCER_POSITIONS = ["ST", "LW", "RW", "CF", "CAM", "CM", "CDM", "CB", "LB", "RB"];
const BB_POSITIONS = [...BASKETBALL_POSITIONS, "GUARD", "WING", "BIG"] as const;
const AF_POSITIONS = [
  ...AMERICAN_FOOTBALL_POSITIONS,
  "SKILL",
  "DEFENSE",
  "SPECIALIST",
] as const;

function resolveSport(currentSport: Sport, forced?: Sport): Sport {
  if (forced) return forced;
  if (currentSport === "BASKETBALL") return "BASKETBALL";
  if (currentSport === "AMERICAN_FOOTBALL") return "AMERICAN_FOOTBALL";
  return "SOCCER";
}

function positionsForSport(sport: Sport): string[] {
  if (sport === "BASKETBALL") return [...BB_POSITIONS];
  if (sport === "AMERICAN_FOOTBALL") return [...AF_POSITIONS];
  return SOCCER_POSITIONS;
}

function defaultPositionForSport(sport: Sport): string {
  if (sport === "BASKETBALL") return "PG";
  if (sport === "AMERICAN_FOOTBALL") return "WR";
  return "ST";
}

export interface RecruitmentFormSeedDefaults {
  position: string;
  maxAge?: string;
  maxValue?: string;
  maxCapHit?: string;
  minRating?: string;
  league?: string;
  limit: string;
  replacePlayerId: string;
  sport?: Sport;
  targetName?: string;
}

export function RecruitmentSearchForm({
  seedDefaults,
}: {
  seedDefaults?: RecruitmentFormSeedDefaults | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { currentSport } = useSport();
  const sport = resolveSport(
    currentSport,
    seedDefaults?.sport ??
      (params.get("sport") === "BASKETBALL"
        ? "BASKETBALL"
        : params.get("sport") === "AMERICAN_FOOTBALL"
          ? "AMERICAN_FOOTBALL"
          : undefined)
  );
  const positions = useMemo(() => positionsForSport(sport), [sport]);
  const defaultPosition = defaultPositionForSport(sport);
  const allKnown = useMemo(
    () => [...SOCCER_POSITIONS, ...BB_POSITIONS, ...AF_POSITIONS],
    []
  );
  const replacePlayerId =
    seedDefaults?.replacePlayerId ?? params.get("replacePlayerId") ?? undefined;

  const [position, setPosition] = useState(() => {
    const fromSeed = seedDefaults?.position;
    if (fromSeed && allKnown.includes(fromSeed)) return fromSeed;
    const fromUrl = params.get("position");
    if (fromUrl && allKnown.includes(fromUrl)) return fromUrl;
    return defaultPosition;
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    query.set("sport", sport);
    for (const [key, value] of form.entries()) {
      const text = String(value).trim();
      if (text) query.set(key, text);
    }
    router.push(`/recruitment?${query.toString()}`);
  }

  const sportLabel =
    sport === "BASKETBALL"
      ? "basketball"
      : sport === "AMERICAN_FOOTBALL"
        ? "American football"
        : "soccer";

  const usesCap = sport === "BASKETBALL" || sport === "AMERICAN_FOOTBALL";

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-xl border border-border bg-surface-muted/20 p-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {replacePlayerId ? (
        <div className="md:col-span-2 lg:col-span-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground/90">
          Replacement mode
          {seedDefaults?.targetName ? (
            <>
              {" "}
              for <span className="font-semibold">{seedDefaults.targetName}</span>
            </>
          ) : null}
          . Adjust filters and re-run — the target stays excluded.
          <input type="hidden" name="replacePlayerId" value={replacePlayerId} />
        </div>
      ) : null}
      <input type="hidden" name="sport" value={sport} />
      <label className="space-y-1 text-xs">
        <span className="font-medium text-muted-foreground">Position ({sportLabel})</span>
        <select
          name="position"
          value={positions.includes(position) ? position : defaultPosition}
          onChange={(event) => setPosition(event.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {positions.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-xs">
        <span className="font-medium text-muted-foreground">Max age</span>
        <input
          name="maxAge"
          type="number"
          min={16}
          max={40}
          defaultValue={
            seedDefaults?.maxAge ??
            params.get("maxAge") ??
            (sport === "BASKETBALL" ? "26" : sport === "AMERICAN_FOOTBALL" ? "28" : "23")
          }
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="space-y-1 text-xs">
        <span className="font-medium text-muted-foreground">Max value (USD)</span>
        <input
          name="maxValue"
          type="number"
          min={0}
          step={100000}
          defaultValue={
            seedDefaults?.maxValue ??
            params.get("maxValue") ??
            (sport === "SOCCER" ? "5000000" : "")
          }
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      {usesCap ? (
        <label className="space-y-1 text-xs">
          <span className="font-medium text-muted-foreground">Max cap hit (USD, optional)</span>
          <input
            name="maxCapHit"
            type="number"
            min={0}
            step={100000}
            defaultValue={seedDefaults?.maxCapHit ?? params.get("maxCapHit") ?? ""}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      ) : null}
      <label className="space-y-1 text-xs">
        <span className="font-medium text-muted-foreground">Min rating</span>
        <input
          name="minRating"
          type="number"
          min={0}
          max={10}
          step={0.1}
          defaultValue={seedDefaults?.minRating ?? params.get("minRating") ?? "6.8"}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="space-y-1 text-xs">
        <span className="font-medium text-muted-foreground">
          League{" "}
          {sport === "BASKETBALL"
            ? "(NBA / NCAA / EuroLeague)"
            : sport === "AMERICAN_FOOTBALL"
              ? "(NFL / College Football)"
              : "(optional)"}
        </span>
        <input
          name="league"
          type="text"
          defaultValue={seedDefaults?.league ?? params.get("league") ?? ""}
          placeholder={
            sport === "BASKETBALL"
              ? "NBA"
              : sport === "AMERICAN_FOOTBALL"
                ? "NFL"
                : "competitionId"
          }
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="space-y-1 text-xs">
        <span className="font-medium text-muted-foreground">Limit</span>
        <input
          name="limit"
          type="number"
          min={5}
          max={50}
          defaultValue={seedDefaults?.limit ?? params.get("limit") ?? "15"}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <div className="md:col-span-2 lg:col-span-3">
        <button
          type="submit"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {replacePlayerId
            ? `Find ${sportLabel} replacements`
            : `Run ${sportLabel} recruitment search`}
        </button>
      </div>
    </form>
  );
}
