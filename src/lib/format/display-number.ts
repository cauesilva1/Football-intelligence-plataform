/**
 * User-facing numbers. At most `maxDecimals` fraction digits.
 * `6.800000190734863` with 1 decimal becomes `6.8`. Integers stay integers (`10` stays `10`).
 */
export function formatDisplayNumber(
  value: number | null | undefined,
  maxDecimals = 2
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const text = value.toFixed(maxDecimals);
  if (!text.includes(".")) return text;
  return text.replace(/0+$/, "").replace(/\.$/, "");
}

/** Value for `<input type="number">`. Empty when the source is missing. */
export function formatInputNumber(
  value: number | string | null | undefined,
  maxDecimals = 2
): string {
  if (value == null || value === "") return "";
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "";
  return formatDisplayNumber(numeric, maxDecimals);
}

/** Recharts tooltip / axis tick. */
export function formatChartNumber(value: unknown, maxDecimals = 2): string {
  if (Array.isArray(value)) {
    return value.map((item) => formatChartNumber(item, maxDecimals)).join(" – ");
  }
  if (typeof value === "number") return formatDisplayNumber(value, maxDecimals);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return formatDisplayNumber(Number(value), maxDecimals);
  }
  return "—";
}
