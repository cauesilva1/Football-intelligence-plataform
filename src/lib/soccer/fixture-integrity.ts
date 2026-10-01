import { normalizeNameForMatch } from "@/lib/sync/data-staleness";

const EUROPEAN_COUNTRIES = new Set([
  "england",
  "spain",
  "germany",
  "italy",
  "france",
  "portugal",
  "netherlands",
  "belgium",
  "scotland",
  "wales",
  "turkey",
  "holland",
]);

const GENERIC_TOKENS = new Set([
  "united",
  "city",
  "real",
  "club",
  "sporting",
  "nacional",
  "athletic",
  "atletico",
  "atlético",
  "football",
  "fc",
]);

export function isConmebolClubCompetition(competitionName?: string | null): boolean {
  const name = (competitionName ?? "").toLowerCase();
  return name.includes("libertadores") || name.includes("sudamericana");
}

export function isNationalTeamCompetition(competitionName?: string | null): boolean {
  const name = (competitionName ?? "").toLowerCase();
  return (
    name.includes("world cup") ||
    name.includes("uefa euro") ||
    name.includes("european championship") ||
    name.includes("copa america") ||
    name.includes("copa américa") ||
    name.includes("nations league")
  );
}

/** Directory rows that are national sides, not clubs or franchises. */
export function isNationalSideDirectoryTeam(team: {
  name: string;
  country?: string | null;
  competitionName?: string | null;
}): boolean {
  if (isNationalTeamCompetition(team.competitionName)) return true;
  const name = team.name.trim().toLowerCase();
  const country = (team.country ?? "").trim().toLowerCase();
  if (!name || !country || name !== country) return false;
  if (country === "international") return false;
  return !/\b(fc|cf|sc|ac|united|city|club)\b/.test(name);
}

function significantTokens(name: string): string[] {
  return normalizeNameForMatch(name)
    .split(" ")
    .filter((token) => token.length > 3 && !GENERIC_TOKENS.has(token));
}

/**
 * A headline that names a winner who is not one of the two clubs on the scoreboard.
 * Example: teams "United States" / "Newcastle United" with text about Cienciano.
 */
export function stageTextContradictsScoreboard(
  stageName: string | null | undefined,
  homeTeam: string,
  awayTeam: string
): boolean {
  const text = normalizeNameForMatch(stageName ?? "");
  if (!text) return false;
  if (!/\b(win|won|defeat|beat|aggregate|victory)\b/.test(text)) return false;

  const participants = [...significantTokens(homeTeam), ...significantTokens(awayTeam)];
  if (participants.length === 0) return true;
  return !participants.some((token) => text.includes(token));
}

export function europeanClubInConmebol(input: {
  competitionName?: string | null;
  teams: Array<{ name: string; country?: string | null }>;
  big5Squads?: ReadonlySet<string>;
}): boolean {
  if (!isConmebolClubCompetition(input.competitionName)) return false;

  return input.teams.some((team) => {
    const country = (team.country ?? "").trim().toLowerCase();
    if (EUROPEAN_COUNTRIES.has(country)) return true;
    const squad = normalizeNameForMatch(team.name);
    return Boolean(squad && input.big5Squads?.has(squad));
  });
}

export function shouldQuarantineFixture(input: {
  competitionName?: string | null;
  homeTeam: string;
  awayTeam: string;
  homeCountry?: string | null;
  awayCountry?: string | null;
  stageName?: string | null;
  big5Squads?: ReadonlySet<string>;
}): boolean {
  if (
    europeanClubInConmebol({
      competitionName: input.competitionName,
      teams: [
        { name: input.homeTeam, country: input.homeCountry },
        { name: input.awayTeam, country: input.awayCountry },
      ],
      big5Squads: input.big5Squads,
    })
  ) {
    return true;
  }

  return stageTextContradictsScoreboard(input.stageName, input.homeTeam, input.awayTeam);
}
