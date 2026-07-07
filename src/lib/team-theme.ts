export interface TeamTheme {
  primaryColor: string;
  secondaryColor: string;
  gradientString: string;
  gradientFrom: string;
  gradientTo: string;
  accent: string;
  text: string;
}

interface ClubThemeDef {
  keys: string[];
  theme: TeamTheme;
}

function clubTheme(
  primaryColor: string,
  secondaryColor: string,
  gradientString: string,
  accent?: string
): TeamTheme {
  return {
    primaryColor,
    secondaryColor,
    gradientString,
    gradientFrom: primaryColor,
    gradientTo: "#09090b",
    accent: accent ?? secondaryColor,
    text: "#fafafa",
  };
}

const CLUB_THEMES: ClubThemeDef[] = [
  // 🇧🇷 Brasil
  { keys: ["flamengo"], theme: clubTheme("#E30613", "#000000", "from-red-950 via-zinc-950 to-black") },
  { keys: ["palmeiras"], theme: clubTheme("#006437", "#FFFFFF", "from-green-950 via-zinc-950 to-black", "#FFFFFF") },
  { keys: ["sao paulo", "são paulo"], theme: clubTheme("#FE0000", "#000000", "from-neutral-900 via-zinc-900 to-neutral-950") },
  { keys: ["corinthians"], theme: clubTheme("#FFFFFF", "#000000", "from-neutral-900 via-zinc-800 to-black", "#FFFFFF") },
  { keys: ["atletico mineiro", "atlético-mg", "atletico-mg", "galo"], theme: clubTheme("#000000", "#FFFFFF", "from-neutral-950 via-zinc-900 to-neutral-950", "#FFFFFF") },
  { keys: ["cruzeiro"], theme: clubTheme("#0033A0", "#FFFFFF", "from-blue-950 via-zinc-950 to-neutral-950", "#FFFFFF") },
  { keys: ["gremio", "grêmio"], theme: clubTheme("#0D80BF", "#000000", "from-sky-950 via-zinc-950 to-black") },
  { keys: ["colorado", "sport club internacional"], theme: clubTheme("#E31C23", "#FFFFFF", "from-red-950 via-zinc-950 to-neutral-950", "#FFFFFF") },
  { keys: ["botafogo"], theme: clubTheme("#000000", "#FFFFFF", "from-neutral-950 via-neutral-900 to-black", "#FFFFFF") },
  { keys: ["fluminense"], theme: clubTheme("#831633", "#1F5237", "from-rose-950 via-zinc-950 to-emerald-950") },
  { keys: ["vasco"], theme: clubTheme("#000000", "#FFFFFF", "from-zinc-900 via-neutral-950 to-zinc-900", "#FFFFFF") },

  // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra
  { keys: ["arsenal"], theme: clubTheme("#EF0107", "#063672", "from-red-950 via-zinc-950 to-black") },
  { keys: ["manchester united", "man united", "man utd"], theme: clubTheme("#DA020E", "#FFE500", "from-red-950 via-zinc-950 to-black", "#FFE500") },
  { keys: ["manchester city", "man city"], theme: clubTheme("#6CABDD", "#1C2C5B", "from-sky-900 via-zinc-950 to-slate-950") },
  { keys: ["liverpool"], theme: clubTheme("#C8102E", "#F6EB61", "from-red-950 via-zinc-950 to-neutral-950", "#F6EB61") },
  { keys: ["chelsea"], theme: clubTheme("#034694", "#EE242C", "from-blue-950 via-zinc-950 to-black") },
  { keys: ["tottenham", "spurs"], theme: clubTheme("#132257", "#FFFFFF", "from-slate-900 via-zinc-950 to-neutral-950", "#FFFFFF") },

  // 🇪🇸 Espanha
  { keys: ["real madrid"], theme: clubTheme("#FFFFFF", "#F1CB2A", "from-blue-950 via-zinc-950 to-black", "#F1CB2A") },
  { keys: ["barcelona", "barça", "barca", "fc barcelona"], theme: clubTheme("#004D98", "#A50044", "from-blue-950 via-zinc-950 to-rose-950", "#EDBB00") },
  { keys: ["atletico madrid", "atlético de madrid", "atletico de madrid"], theme: clubTheme("#CB3524", "#19448E", "from-red-950 via-zinc-950 to-slate-950") },

  // 🇮🇹 Itália
  { keys: ["juventus", "juve"], theme: clubTheme("#FFFFFF", "#000000", "from-neutral-900 via-zinc-900 to-neutral-950", "#FFFFFF") },
  { keys: ["ac milan"], theme: clubTheme("#AC101B", "#000000", "from-red-950 via-zinc-950 to-black", "#FFFFFF") },
  { keys: ["internazionale", "inter milan"], theme: clubTheme("#0053A0", "#A29160", "from-blue-950 via-zinc-950 to-black", "#A29160") },

  // 🇩🇪 Alemanha & 🇫🇷 França
  { keys: ["bayern", "bayern munich", "bayern munchen", "bayer munchen"], theme: clubTheme("#DC052D", "#0066B2", "from-red-950 via-zinc-950 to-blue-950", "#FFFFFF") },
  { keys: ["borussia dortmund", "dortmund", "bvb"], theme: clubTheme("#FDE100", "#000000", "from-yellow-950 via-zinc-950 to-black") },
  { keys: ["paris saint-germain", "paris saint", "psg"], theme: clubTheme("#004170", "#E30613", "from-blue-950 via-zinc-950 to-red-950") },
];

const PREMIER_THEME = clubTheme("#3D195B", "#00FF87", "from-purple-950 via-zinc-950 to-black", "#00FF87");
const LALIGA_THEME = clubTheme("#EE242C", "#F5C518", "from-red-950 via-orange-950/40 to-black", "#F5C518");
const BRASILEIRAO_THEME = clubTheme("#009C3B", "#FFDF00", "from-green-950 via-yellow-950/30 to-black", "#FFDF00");

const DEFAULT_THEME: TeamTheme = {
  primaryColor: "#64748b",
  secondaryColor: "#334155",
  gradientString: "from-slate-900 via-zinc-950 to-black",
  gradientFrom: "#334155",
  gradientTo: "#0f172a",
  accent: "#94a3b8",
  text: "#f1f5f9",
};

const COUNTRY_PREFIXES = /\b(eng|es|de|it|fr|pt|nl|be|tr|us|scot|wls)\b/gi;

function normalizeThemeContext(...parts: (string | null | undefined)[]): string {
  return parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(COUNTRY_PREFIXES, "")
    .replace(/\s+/g, " ")
    .trim();
}

function themeFromClub(ctx: string): TeamTheme | null {
  if (ctx.includes("atletico") && (ctx.includes("mineiro") || ctx.includes("galo") || ctx.includes("-mg"))) {
    return CLUB_THEMES.find((c) => c.keys.includes("atletico mineiro"))!.theme;
  }

  if (ctx.includes("manchester") && ctx.includes("united")) {
    return CLUB_THEMES.find((c) => c.keys.includes("manchester united"))!.theme;
  }

  if (ctx.includes("manchester") && ctx.includes("city")) {
    return CLUB_THEMES.find((c) => c.keys.includes("manchester city"))!.theme;
  }

  if (
    (ctx.includes("inter") && (ctx.includes("milan") || ctx.includes("milao"))) ||
    ctx.includes("internazionale")
  ) {
    if (!ctx.includes("miami") && !ctx.includes("colorado")) {
      return CLUB_THEMES.find((c) => c.keys.includes("internazionale"))!.theme;
    }
  }

  if (ctx.includes("colorado") || ctx.includes("sport club internacional")) {
    return CLUB_THEMES.find((c) => c.keys.includes("colorado"))!.theme;
  }

  if (ctx.includes("atletico") || ctx.includes("atlético")) {
    return CLUB_THEMES.find((c) => c.keys.includes("atletico madrid"))!.theme;
  }

  if (ctx.includes("madrid") && !ctx.includes("atletico")) {
    return CLUB_THEMES.find((c) => c.keys.includes("real madrid"))!.theme;
  }

  for (const club of CLUB_THEMES) {
    for (const key of club.keys) {
      if (!ctx.includes(key)) continue;
      return club.theme;
    }
  }

  if (ctx.includes("milan") && !ctx.includes("inter")) {
    return CLUB_THEMES.find((c) => c.keys.includes("ac milan"))!.theme;
  }

  if (ctx.includes("city") && !ctx.includes("manchester")) {
    return CLUB_THEMES.find((c) => c.keys.includes("manchester city"))!.theme;
  }

  if (ctx.includes("united") && !ctx.includes("manchester")) {
    return CLUB_THEMES.find((c) => c.keys.includes("manchester united"))!.theme;
  }

  if (ctx.includes("barca") || (ctx.includes("barcelona") && !ctx.includes("ecuador"))) {
    return CLUB_THEMES.find((c) => c.keys.includes("barcelona"))!.theme;
  }

  return null;
}

/** Returns vivid club- or league-inspired theme for immersive UI. */
export function getTeamTheme(
  competitionName?: string | null,
  teamName?: string | null
): TeamTheme {
  const ctx = normalizeThemeContext(competitionName, teamName);

  const clubThemeResult = themeFromClub(ctx);
  if (clubThemeResult) return clubThemeResult;

  if (ctx.includes("brasileir")) return BRASILEIRAO_THEME;
  if (ctx.includes("premier league") || ctx.includes("premier")) return PREMIER_THEME;
  if (ctx.includes("la liga") || (ctx.includes("liga") && !ctx.includes("bundesliga") && !ctx.includes("brasileir"))) {
    return LALIGA_THEME;
  }
  if (ctx.includes("ligue 1") || ctx.includes("ligue")) {
    return clubTheme("#091C3D", "#E11D48", "from-blue-950 via-rose-950/30 to-black", "#E11D48");
  }
  if (ctx.includes("bundesliga")) {
    return clubTheme("#D20515", "#FBBF24", "from-red-950 via-zinc-950 to-black", "#FBBF24");
  }
  if (ctx.includes("serie a")) {
    return clubTheme("#008C45", "#CD212A", "from-emerald-950 via-zinc-950 to-black", "#CD212A");
  }

  return DEFAULT_THEME;
}

export function getPositionAbbreviation(position: string): string {
  const map: Record<string, string> = {
    GK: "GK",
    CB: "DF",
    LB: "DF",
    RB: "DF",
    CDM: "MF",
    CM: "MF",
    CAM: "MF",
    LW: "FW",
    RW: "FW",
    ST: "FW",
  };
  return map[position] ?? position.slice(0, 2).toUpperCase();
}

/** National team palette for tournament crests */
export function getNationalTeamTheme(teamName: string): TeamTheme {
  const palettes: Record<string, TeamTheme> = {
    brazil: {
      primaryColor: "#009C3B",
      secondaryColor: "#FFDF00",
      gradientString: "from-green-900 via-yellow-900/30 to-black",
      gradientFrom: "#009C3B",
      gradientTo: "#14532d",
      accent: "#FFDF00",
      text: "#fafafa",
    },
    argentina: {
      primaryColor: "#74ACDF",
      secondaryColor: "#FFFFFF",
      gradientString: "from-sky-900 via-zinc-900 to-black",
      gradientFrom: "#74ACDF",
      gradientTo: "#1e3a8a",
      accent: "#FFFFFF",
      text: "#eff6ff",
    },
    france: {
      primaryColor: "#002395",
      secondaryColor: "#ED2939",
      gradientString: "from-blue-950 via-red-950/40 to-black",
      gradientFrom: "#002395",
      gradientTo: "#1e1b4b",
      accent: "#ED2939",
      text: "#f8fafc",
    },
  };

  const key = teamName.toLowerCase();
  for (const [name, theme] of Object.entries(palettes)) {
    if (key.includes(name)) return theme;
  }

  return {
    ...DEFAULT_THEME,
    gradientString: "from-slate-800 via-zinc-900 to-black",
  };
}
