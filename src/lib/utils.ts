import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMarketValue(value: number): string {
  if (!value || value <= 0) return "Sob consulta";
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}K`;
  return `€${value}`;
}

/** Formata cap hit NBA em dólares (ex: $24.5M). */
export function formatCapHit(value: number): string {
  if (!value || value <= 0) return "—";
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1).replace(".", ",")}M`;
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

export function formatMinutes(minutes: number): string {
  return `${minutes.toLocaleString("en-US")}'`;
}

export function calcAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function ratingColor(rating: number): string {
  if (rating >= 8) return "text-pitch-400";
  if (rating >= 7) return "text-signal-azure";
  if (rating >= 6) return "text-signal-amber";
  return "text-signal-rose";
}

export function per90(value: number, minutes: number): number {
  if (!minutes || minutes <= 0) return 0;
  const rate = (value / minutes) * 90;
  // Soft-cap absurd rates from tiny samples (shared with lib/metrics/per90).
  return Number(Math.min(rate, 1.8).toFixed(2));
}
