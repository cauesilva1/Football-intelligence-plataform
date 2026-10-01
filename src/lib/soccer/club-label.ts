const JUNK_LABELS = new Set(["NAN", "NA", "N/A", "NULL", "UNDEFINED", "NONE", "—", "-", ""]);

function normalizeToken(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

/** Three-letter club code that never spells the missing-value token NAN. */
export function clubShortCode(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const initials =
    words.length <= 1
      ? (words[0] ?? "").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()
      : words
          .map((word) => word[0] ?? "")
          .join("")
          .replace(/[^A-Za-z]/g, "")
          .slice(0, 3)
          .toUpperCase();

  if (initials && initials !== "NAN") return initials;

  const compact = name.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (compact.length >= 3) {
    const alternate = `${compact[0]}${compact.slice(-2)}`;
    if (alternate !== "NAN") return alternate;
  }
  return "UNK";
}

/**
 * Player-facing club label.
 * "NAN" is the trigram for Nantes and must not render. Missing clubs say Unknown.
 */
export function formatClubLabel(
  teamName?: string | null,
  shortName?: string | null
): string {
  const name = (teamName ?? "").trim();
  const code = (shortName ?? "").trim();
  const nameJunk = JUNK_LABELS.has(normalizeToken(name));
  const codeJunk = JUNK_LABELS.has(normalizeToken(code));

  if (!codeJunk) return code;
  if (!nameJunk) return name;
  return "Unknown";
}
