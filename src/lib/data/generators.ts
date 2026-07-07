import { mulberry32, seededRange, seededFloat, pick } from "../mock-data/seedrandom";
import type { Competition, Player, Team, TeamStatistic } from "@/types";
import { toPlayerStatistic, type StatisticInput } from "@/lib/metrics/map-statistic";
import { calcAge } from "@/lib/utils";

export { CURRENT_SEASON, SEASONS } from "@/lib/seasons";
import { CURRENT_SEASON, SEASONS } from "@/lib/seasons";

export const PLAYER_COUNT = 100;

const COMPETITIONS_DATA = [
  { name: "Premier League", country: "England", tier: 1 },
  { name: "La Liga", country: "Spain", tier: 1 },
  { name: "Serie A", country: "Italy", tier: 1 },
  { name: "Bundesliga", country: "Germany", tier: 1 },
  { name: "Ligue 1", country: "France", tier: 1 },
  { name: "Brasileirão Série A", country: "Brazil", tier: 1 },
];

const TEAMS_DATA = [
  { name: "Northgate United", shortName: "NGU", country: "England", foundedYear: 1892, stadium: "Northgate Arena" },
  { name: "Redmoor City", shortName: "RMC", country: "England", foundedYear: 1904, stadium: "Redmoor Park" },
  { name: "Costa Serena FC", shortName: "CSE", country: "Spain", foundedYear: 1919, stadium: "Estadio de la Costa" },
  { name: "Real Altamira", shortName: "ALT", country: "Spain", foundedYear: 1902, stadium: "Altamira Sports Complex" },
  { name: "Vesuvio Calcio", shortName: "VES", country: "Italy", foundedYear: 1911, stadium: "Stadio Vesuvio" },
  { name: "Torino Azzurra", shortName: "TAZ", country: "Italy", foundedYear: 1908, stadium: "Arena Azzurra" },
  { name: "Rheinstadt SV", shortName: "RHS", country: "Germany", foundedYear: 1900, stadium: "Rheinstadt Arena" },
  { name: "Schwarzwald 05", shortName: "SW05", country: "Germany", foundedYear: 1905, stadium: "Schwarzwald Stadion" },
  { name: "Olympique Marbelle", shortName: "OLM", country: "France", foundedYear: 1899, stadium: "Parc Marbelle" },
  { name: "AS Loire Valley", shortName: "ASL", country: "France", foundedYear: 1913, stadium: "Stade de la Loire" },
  { name: "Flamengo", shortName: "FLA", country: "Brazil", foundedYear: 1895, stadium: "Maracanã" },
  { name: "Palmeiras", shortName: "PAL", country: "Brazil", foundedYear: 1914, stadium: "Allianz Parque" },
];

const FIRST_NAMES = [
  "Mateus", "Lucas", "Bruno", "Kevin", "Diego", "Sofian", "Marek", "Igor", "Tomas", "Erik",
  "Andres", "Rafael", "Nuno", "Sven", "Milan", "Adrian", "Jonas", "Theo", "Marco", "Felix",
  "Leandro", "Nikolai", "Pablo", "Julian", "Hugo", "Otto", "Yusuf", "Dario", "Emil", "Rui",
  "Gabriel", "Antoine", "Stefan", "Ivo", "Noah", "Samir", "Leon", "Mats", "Ricardo", "Tobias",
  "Vitor", "Alex", "Simon", "Pietro", "Karim", "Enzo", "Matteo", "Lars", "Cristian", "Filipe",
];
const LAST_NAMES = [
  "Silveira", "Costa", "Kowalski", "Berger", "Novak", "Fontaine", "Reyes", "Almeida", "Bergstrom", "Duarte",
  "Moreau", "Santini", "Adler", "Vidal", "Karlsson", "Petrov", "Fischer", "Oliveira", "Rossi", "Bianchi",
  "Schmidt", "Dubois", "Lindqvist", "Marchetti", "Herrera", "Novotny", "Weber", "Ferreira", "Laurent", "Kessler",
];
const NATIONALITIES = [
  "Brazil", "Portugal", "Argentina", "France", "Germany", "Netherlands", "Croatia", "Poland",
  "Sweden", "Italy", "Spain", "Senegal", "Morocco", "Belgium", "Denmark", "Serbia", "Nigeria", "Uruguay",
];
const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"] as const;

const STRENGTHS_BY_POS: Record<string, string[]> = {
  GK: ["Elite Reflexes", "Excellent Shot Stopping", "Aerial Command", "Excellent Long Passing"],
  CB: ["Aerial Dominance", "Anticipation in Duels", "Clean Ball Progression", "Defensive Leadership"],
  LB: ["Overlapping Intensity", "Accurate Crosses", "Quick Defensive Recovery", "Solid One-on-One Defending"],
  RB: ["Constant Overlaps", "Accurate Crosses", "Physical Endurance", "Defensive Cover"],
  CDM: ["Consistent Interceptions", "Intelligent Distribution", "Space Coverage", "Tactical Discipline"],
  CM: ["Vision", "Line-Breaking Passes", "Box-to-Box Engine", "Late Runs into the Box"],
  CAM: ["Final Ball", "Creativity in Tight Spaces", "Shooting from Distance", "Finding Pockets Between Lines"],
  LW: ["Pace Dribbling", "Finishing with Right Foot", "One-on-One Threat", "Inverting Play"],
  RW: ["Explosive Runs in Behind", "Low Crosses", "Close Control Dribbling", "Cutting Inside"],
  ST: ["Clinical Finishing", "Runs in Behind", "Link-Up Play", "Box Instinct"],
};
const WEAKNESSES_BY_POS: Record<string, string[]> = {
  GK: ["Limited Footwork", "Cross Claiming", "Slow Reactions on Rebounds"],
  CB: ["Recovery Pace", "Exposure in Wide Areas", "Imprecise Long Passing"],
  LB: ["Aerial Marking", "Defensive Consistency", "Risky Ball Progression"],
  RB: ["Stamina in High-Intensity Games", "Defensive Positioning", "Finishing"],
  CDM: ["Reduced Mobility", "Through Balls", "Limited Offensive Contribution"],
  CM: ["Defensive Consistency", "Physical Duels", "Finishing"],
  CAM: ["Defensive Contribution", "Form Inconsistency", "Physical Duels"],
  LW: ["Defensive Consistency", "Final Decision in 1v1", "Aerial Play"],
  RW: ["Performance Consistency", "Defensive Contribution", "Physical Duels"],
  ST: ["Limited Aerial Play", "Build-Up Contribution", "Defensive Pressing"],
};

function shuffleTake<T>(rand: () => number, arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function buildStatInput(
  rand: () => number,
  playerId: string,
  teamId: string,
  teamName: string,
  teamShortName: string,
  season: string,
  position: string,
  ageFactor: number,
  minutesScale = 1
): StatisticInput {
  const isAttacker = ["ST", "LW", "RW", "CAM"].includes(position);
  const isMid = ["CM", "CDM"].includes(position);
  const isDef = ["CB", "LB", "RB"].includes(position);
  const isGK = position === "GK";

  const appearances = seededRange(rand, 10, 22);
  const minutesPlayed = Math.round(appearances * seededRange(rand, 55, 88) * minutesScale);
  const goals = isGK
    ? 0
    : Math.round(
        (isAttacker ? seededRange(rand, 3, 14) : isMid ? seededRange(rand, 1, 6) : seededRange(rand, 0, 3)) *
          ageFactor
      );
  const assists = isGK
    ? 0
    : Math.round(
        (isAttacker ? seededRange(rand, 2, 8) : isMid ? seededRange(rand, 1, 6) : seededRange(rand, 0, 3)) *
          ageFactor
      );
  const shots = isAttacker ? seededRange(rand, 15, 45) : seededRange(rand, 2, 18);
  const shotsOnTarget = Math.min(shots, isAttacker ? seededRange(rand, 8, 28) : seededRange(rand, 1, 8));
  const passes = seededRange(rand, 400, 1800);

  return {
    id: `stat-${playerId}-${teamId}-${season}`,
    playerId,
    teamId,
    teamName,
    teamShortName,
    season,
    appearances,
    minutesPlayed,
    goals,
    assists,
    xG: Number((goals * seededFloat(rand, 0.75, 1.25)).toFixed(2)),
    xA: Number((assists * seededFloat(rand, 0.75, 1.25)).toFixed(2)),
    shots,
    shotsOnTarget,
    passes,
    passAccuracy: isDef || isGK ? seededFloat(rand, 78, 92) : isMid ? seededFloat(rand, 84, 94) : seededFloat(rand, 72, 88),
    keyPasses: seededFloat(rand, 0.4, isAttacker || isMid ? 3.2 : 1.0),
    dribblesCompleted: seededFloat(rand, 0.2, isAttacker ? 4.5 : 1.5),
    tacklesWon: seededFloat(rand, isDef || isMid ? 1.8 : 0.4, isDef || isMid ? 4.2 : 1.6),
    interceptions: seededFloat(rand, isDef || isMid ? 1.2 : 0.2, isDef || isMid ? 3.5 : 1.2),
    duelsWonPct: seededFloat(rand, 42, 68),
    yellowCards: seededRange(rand, 0, 5),
    redCards: seededRange(rand, 0, 1),
    rating: seededFloat(rand, 6.1, 8.4),
  };
}

export function generateCompetitions(): Competition[] {
  return COMPETITIONS_DATA.map((c, i) => ({
    id: `comp-${String(i + 1).padStart(2, "0")}`,
    ...c,
  }));
}

export function generateTeams(competitions: Competition[]): Team[] {
  return TEAMS_DATA.map((t, i) => ({
    id: `team-${String(i + 1).padStart(2, "0")}`,
    ...t,
    competitionId: competitions[i % competitions.length].id,
  }));
}

export function generateTeamStatistics(teams: Team[]): TeamStatistic[] {
  const rand = mulberry32(20260706);
  return teams.map((team) => ({
    id: `tstat-${team.id}-${CURRENT_SEASON}`,
    teamId: team.id,
    season: CURRENT_SEASON,
    matchesPlayed: seededRange(rand, 30, 38),
    wins: seededRange(rand, 8, 26),
    draws: seededRange(rand, 2, 10),
    losses: seededRange(rand, 2, 12),
    goalsFor: seededRange(rand, 35, 78),
    goalsAgainst: seededRange(rand, 20, 60),
    xG: seededRange(rand, 35, 80),
    xGA: seededRange(rand, 20, 60),
    possessionPct: seededFloat(rand, 38, 66),
    passAccuracyPct: seededFloat(rand, 74, 90),
    pressuresPer90: seededFloat(rand, 14, 26),
    attackRating: seededFloat(rand, 55, 95),
    defenseRating: seededFloat(rand, 50, 92),
  }));
}

export function generatePlayers(teams: Team[], count = PLAYER_COUNT): Player[] {
  const rand = mulberry32(20260706);
  const players: Player[] = [];

  for (let i = 0; i < count; i++) {
    const position = POSITIONS[i % POSITIONS.length];
    const primaryTeam = teams[i % teams.length];
    const first = pick(rand, FIRST_NAMES);
    const last = pick(rand, LAST_NAMES);
    const age = seededRange(rand, 18, 34);
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age, seededRange(rand, 0, 11), seededRange(rand, 1, 28));
    const ageFactor = age < 23 ? 0.85 : age < 30 ? 1.1 : 0.9;
    const id = `player-${String(i + 1).padStart(3, "0")}`;

    // ~12% of players transfer mid-season in the current campaign
    const hasMidSeasonTransfer = i % 8 === 0;
    const secondaryTeam = teams[(i + 3) % teams.length];
    const currentTeam = hasMidSeasonTransfer ? secondaryTeam : primaryTeam;

    const history: ReturnType<typeof toPlayerStatistic>[] = [];

    for (const season of SEASONS) {
      if (season === CURRENT_SEASON && hasMidSeasonTransfer) {
        history.push(
          toPlayerStatistic(
            buildStatInput(rand, id, primaryTeam.id, primaryTeam.name, primaryTeam.shortName, season, position, ageFactor, 0.55)
          )
        );
        history.push(
          toPlayerStatistic(
            buildStatInput(rand, id, secondaryTeam.id, secondaryTeam.name, secondaryTeam.shortName, season, position, ageFactor, 0.45)
          )
        );
      } else {
        const team = season === CURRENT_SEASON ? currentTeam : primaryTeam;
        history.push(
          toPlayerStatistic(
            buildStatInput(rand, id, team.id, team.name, team.shortName, season, position, ageFactor)
          )
        );
      }
    }

    const currentSeasonRecords = history.filter((h) => h.season === CURRENT_SEASON);
    const aggregatedCurrent = aggregateSeasonStats(currentSeasonRecords);

    players.push({
      id,
      fullName: `${first} ${last}`,
      knownAs: last,
      dateOfBirth: dob.toISOString(),
      age,
      nationality: pick(rand, NATIONALITIES),
      position,
      secondaryPosition: rand() > 0.7 ? pick(rand, POSITIONS.filter((p) => p !== position)) : undefined,
      height: seededRange(rand, 168, 198),
      weight: seededRange(rand, 62, 92),
      preferredFoot: rand() > 0.8 ? "BOTH" : rand() > 0.5 ? "RIGHT" : "LEFT",
      marketValue: Math.round(seededRange(rand, 800, 90000) * 1000 * ageFactor),
      teamId: currentTeam.id,
      teamName: currentTeam.name,
      teamShortName: currentTeam.shortName,
      strengths: shuffleTake(rand, STRENGTHS_BY_POS[position], 3),
      weaknesses: shuffleTake(rand, WEAKNESSES_BY_POS[position], 2),
      currentSeasonStats: aggregatedCurrent,
      history,
    });
  }

  return players;
}

function aggregateSeasonStats(records: ReturnType<typeof toPlayerStatistic>[]) {
  if (records.length === 1) return records[0];

  const latest = records[records.length - 1];
  const totals = records.reduce(
    (acc, r) => ({
      appearances: acc.appearances + r.appearances,
      minutesPlayed: acc.minutesPlayed + r.minutesPlayed,
      goals: acc.goals + r.goals,
      assists: acc.assists + r.assists,
      xG: acc.xG + r.xG,
      xA: acc.xA + r.xA,
      shots: acc.shots + r.shots,
      shotsOnTarget: acc.shotsOnTarget + r.shotsOnTarget,
      passes: acc.passes + r.passes,
      keyPasses: acc.keyPasses + r.keyPasses,
      dribblesCompleted: acc.dribblesCompleted + r.dribblesCompleted,
      tacklesWon: acc.tacklesWon + r.tacklesWon,
      interceptions: acc.interceptions + r.interceptions,
      yellowCards: acc.yellowCards + r.yellowCards,
      redCards: acc.redCards + r.redCards,
      ratingWeight: acc.ratingWeight + r.rating * r.appearances,
    }),
    {
      appearances: 0,
      minutesPlayed: 0,
      goals: 0,
      assists: 0,
      xG: 0,
      xA: 0,
      shots: 0,
      shotsOnTarget: 0,
      passes: 0,
      keyPasses: 0,
      dribblesCompleted: 0,
      tacklesWon: 0,
      interceptions: 0,
      yellowCards: 0,
      redCards: 0,
      ratingWeight: 0,
    }
  );

  const passAccuracy =
    records.reduce((s, r) => s + r.passAccuracy, 0) / records.length;
  const duelsWonPct =
    records.reduce((s, r) => s + r.duelsWonPct, 0) / records.length;
  const rating = totals.appearances > 0 ? totals.ratingWeight / totals.appearances : latest.rating;

  return toPlayerStatistic({
    id: `stat-agg-${latest.playerId}-${latest.season}`,
    playerId: latest.playerId,
    teamId: latest.teamId,
    teamName: latest.teamName,
    teamShortName: latest.teamShortName,
    season: latest.season,
    appearances: totals.appearances,
    minutesPlayed: totals.minutesPlayed,
    goals: totals.goals,
    assists: totals.assists,
    xG: Number(totals.xG.toFixed(2)),
    xA: Number(totals.xA.toFixed(2)),
    shots: totals.shots,
    shotsOnTarget: totals.shotsOnTarget,
    passes: totals.passes,
    passAccuracy: Number(passAccuracy.toFixed(1)),
    keyPasses: totals.keyPasses,
    dribblesCompleted: totals.dribblesCompleted,
    tacklesWon: totals.tacklesWon,
    interceptions: totals.interceptions,
    duelsWonPct: Number(duelsWonPct.toFixed(1)),
    yellowCards: totals.yellowCards,
    redCards: totals.redCards,
    rating: Number(rating.toFixed(2)),
  });
}

export function buildPlayerAge(dateOfBirth: string): number {
  return calcAge(dateOfBirth);
}
