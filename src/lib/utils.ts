import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMarketValue(value: number): string {
  if (!value || value <= 0) return "Undisclosed";
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}K`;
  return `€${value}`;
}

/** Formata cap hit NBA em dólares (ex: $24.5M). */
export function formatCapHit(value: number): string {
  if (!value || value <= 0) return "—";
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value.toLocaleString("en-US")}`;
}

export function formatPhysicalMetric(value: number, unit: string): string | null {
  if (!value || value <= 0) return null;
  return `${value} ${unit}`;
}

export function formatPreferredFoot(foot: string): string {
  if (foot === "LEFT") return "Left";
  if (foot === "RIGHT") return "Right";
  if (foot === "BOTH") return "Two-footed";
  return "Unknown";
}

/**
 * List/table label. `knownAs` is often a surname-only feed slug ("Martín", "Dijk");
 * prefer fullName when it carries a clearer identity.
 */
export function playerDisplayName(player: {
  knownAs?: string | null;
  fullName?: string | null;
}): string {
  const known = player.knownAs?.trim() ?? "";
  const full = player.fullName?.trim() ?? "";
  if (!full) return known || "—";
  if (!known) return full;
  // Slug-style knownAs (hyphenated) → prefer fullName
  if (known.includes("-") && full.includes(" ")) return full;
  // Single-token knownAs that is a suffix of fullName → use fullName
  const knownTokens = known.split(/\s+/).filter(Boolean);
  if (knownTokens.length === 1 && full.toLowerCase().includes(known.toLowerCase()) && full !== known) {
    return full;
  }
  return known;
}

export function formatMinutes(minutes: number): string {
  return `${minutes.toLocaleString("en-US")}'`;
}

export function calcAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function ratingColor(rating: number): string {
  if (rating >= 8) return "text-pitch-600";
  if (rating >= 7) return "text-signal-azure";
  if (rating >= 6) return "text-signal-amber";
  return "text-signal-rose";
}

const UNLISTED_LABELS = new Set(["UNK", "UNKNOWN", "N/A", "NA", "NULL", "NONE", "NAN", "—", "-"]);

/** Honest label for a missing nationality code. */
export function formatNationalityLabel(value?: string | null): string {
  const token = (value ?? "").trim();
  if (!token || UNLISTED_LABELS.has(token.toUpperCase())) return "Unlisted";
  return token;
}

/** A stored 0.0 with no games is an empty row, not a rose-rated player. */
export function hasRatingSample(stats: {
  appearances?: number;
  minutesPlayed?: number;
  goals?: number;
  assists?: number;
  points?: number;
  rebounds?: number;
  totalYards?: number | null;
  passingYards?: number | null;
  rushingYards?: number | null;
  receivingYards?: number | null;
  touchdowns?: number | null;
  tacklesWon?: number;
}): boolean {
  return (
    (stats.appearances ?? 0) > 0 ||
    (stats.minutesPlayed ?? 0) > 0 ||
    (stats.goals ?? 0) > 0 ||
    (stats.assists ?? 0) > 0 ||
    (stats.points ?? 0) > 0 ||
    (stats.rebounds ?? 0) > 0 ||
    (stats.totalYards ?? 0) > 0 ||
    (stats.passingYards ?? 0) > 0 ||
    (stats.rushingYards ?? 0) > 0 ||
    (stats.receivingYards ?? 0) > 0 ||
    (stats.touchdowns ?? 0) > 0 ||
    (stats.tacklesWon ?? 0) > 0
  );
}

export function per90(value: number, minutes: number): number {
  if (!minutes || minutes <= 0) return 0;
  const rate = (value / minutes) * 90;
  // Soft-cap absurd rates from tiny samples (shared with lib/metrics/per90).
  return Number(Math.min(rate, 1.8).toFixed(2));
}
