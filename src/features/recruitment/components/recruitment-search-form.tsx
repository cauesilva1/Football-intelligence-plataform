"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

const POSITIONS = ["ST", "LW", "RW", "CF", "CAM", "CM", "CDM", "CB", "LB", "RB"];

export function RecruitmentSearchForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [position, setPosition] = useState(params.get("position") ?? "ST");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      const text = String(value).trim();
      if (text) query.set(key, text);
    }
    router.push(`/recruitment?${query.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-border bg-surface-muted/20 p-4 md:grid-cols-2 lg:grid-cols-3">
      <label className="space-y-1 text-xs">
        <span className="font-medium text-muted-foreground">Position</span>
        <select
          name="position"
          value={position}
          onChange={(event) => setPosition(event.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {POSITIONS.map((pos) => (
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
          defaultValue={params.get("maxAge") ?? "23"}
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
          defaultValue={params.get("maxValue") ?? "5000000"}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
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
        <span className="font-medium text-muted-foreground">League ID (optional)</span>
        <input
          name="league"
          type="text"
          defaultValue={params.get("league") ?? ""}
          placeholder="competitionId"
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
          Run recruitment search
        </button>
      </div>
    </form>
  );
}
