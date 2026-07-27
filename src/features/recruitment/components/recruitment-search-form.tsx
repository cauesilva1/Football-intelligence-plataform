"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useSport } from "@/context/sport-context";
import { BASKETBALL_POSITIONS } from "@/lib/positions";

const SOCCER_POSITIONS = ["ST", "LW", "RW", "CF", "CAM", "CM", "CDM", "CB", "LB", "RB"];
const BB_POSITIONS = [...BASKETBALL_POSITIONS, "GUARD", "WING", "BIG"] as const;

export function RecruitmentSearchForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { currentSport } = useSport();
  const sportSupported = currentSport === "BASKETBALL" || currentSport === "SOCCER";
  const sport = currentSport === "BASKETBALL" ? "BASKETBALL" : "SOCCER";
  const positions = useMemo(
    () => (sport === "BASKETBALL" ? [...BB_POSITIONS] : SOCCER_POSITIONS),
    [sport]
  );
  const defaultPosition = sport === "BASKETBALL" ? "PG" : "ST";
  const [position, setPosition] = useState(() => {
    const fromUrl = params.get("position");
    if (fromUrl && (SOCCER_POSITIONS.includes(fromUrl) || (BB_POSITIONS as readonly string[]).includes(fromUrl))) {
      return fromUrl;
    }
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

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-xl border border-border bg-surface-muted/20 p-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {!sportSupported ? (
        <p className="md:col-span-2 lg:col-span-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/90">
          American Football recruitment fit is not live yet — this form runs soccer briefs until the
          AF engine ships.
        </p>
      ) : null}
      <input type="hidden" name="sport" value={sport} />
      <label className="space-y-1 text-xs">
        <span className="font-medium text-muted-foreground">
          Position {sport === "BASKETBALL" ? "(basketball)" : "(soccer)"}
        </span>
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
          defaultValue={params.get("maxAge") ?? (sport === "BASKETBALL" ? "26" : "23")}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="space-y-1 text-xs">
        <span className="font-medium text-muted-foreground">
          {sport === "BASKETBALL" ? "Max market / listed value (USD)" : "Max value (USD)"}
        </span>
        <input
          name="maxValue"
          type="number"
          min={0}
          step={100000}
          defaultValue={params.get("maxValue") ?? (sport === "BASKETBALL" ? "" : "5000000")}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      {sport === "BASKETBALL" ? (
        <label className="space-y-1 text-xs">
          <span className="font-medium text-muted-foreground">Max cap hit (USD, optional)</span>
          <input
            name="maxCapHit"
            type="number"
            min={0}
            step={100000}
            defaultValue={params.get("maxCapHit") ?? ""}
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
          defaultValue={params.get("minRating") ?? "6.8"}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="space-y-1 text-xs">
        <span className="font-medium text-muted-foreground">
          League {sport === "BASKETBALL" ? "(NBA / NCAA / EuroLeague)" : "(optional)"}
        </span>
        <input
          name="league"
          type="text"
          defaultValue={params.get("league") ?? ""}
          placeholder={sport === "BASKETBALL" ? "NBA" : "competitionId"}
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
          defaultValue={params.get("limit") ?? "15"}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <div className="md:col-span-2 lg:col-span-3">
        <button
          type="submit"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Run {sport === "BASKETBALL" ? "basketball" : "soccer"} recruitment search
        </button>
      </div>
    </form>
  );
}
