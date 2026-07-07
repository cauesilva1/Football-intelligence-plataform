import { readCachedCrest, writeCachedCrest } from "./crest-cache";

const NATIONAL_ISO: Array<{ keys: string[]; iso: string }> = [
  { keys: ["brazil", "brasil"], iso: "br" },
  { keys: ["argentina"], iso: "ar" },
  { keys: ["france"], iso: "fr" },
  { keys: ["germany"], iso: "de" },
  { keys: ["spain", "espana"], iso: "es" },
  { keys: ["england"], iso: "gb-eng" },
  { keys: ["portugal"], iso: "pt" },
  { keys: ["italy"], iso: "it" },
  { keys: ["netherlands", "holland"], iso: "nl" },
  { keys: ["belgium"], iso: "be" },
  { keys: ["croatia"], iso: "hr" },
  { keys: ["uruguay"], iso: "uy" },
  { keys: ["mexico"], iso: "mx" },
  { keys: ["united states", "usa", "us"], iso: "us" },
  { keys: ["canada"], iso: "ca" },
  { keys: ["morocco"], iso: "ma" },
  { keys: ["senegal"], iso: "sn" },
  { keys: ["japan"], iso: "jp" },
  { keys: ["south korea", "korea republic"], iso: "kr" },
  { keys: ["australia"], iso: "au" },
  { keys: ["saudi arabia"], iso: "sa" },
  { keys: ["iran"], iso: "ir" },
  { keys: ["qatar"], iso: "qa" },
  { keys: ["ecuador"], iso: "ec" },
  { keys: ["colombia"], iso: "co" },
  { keys: ["chile"], iso: "cl" },
  { keys: ["peru"], iso: "pe" },
  { keys: ["paraguay"], iso: "py" },
  { keys: ["venezuela"], iso: "ve" },
  { keys: ["bolivia"], iso: "bo" },
  { keys: ["costa rica"], iso: "cr" },
  { keys: ["panama"], iso: "pa" },
  { keys: ["honduras"], iso: "hn" },
  { keys: ["jamaica"], iso: "jm" },
  { keys: ["haiti"], iso: "ht" },
  { keys: ["cuba"], iso: "cu" },
  { keys: ["south africa"], iso: "za" },
  { keys: ["nigeria"], iso: "ng" },
  { keys: ["ghana"], iso: "gh" },
  { keys: ["cameroon"], iso: "cm" },
  { keys: ["ivory coast", "cote d'ivoire", "côte d'ivoire"], iso: "ci" },
  { keys: ["algeria"], iso: "dz" },
  { keys: ["tunisia"], iso: "tn" },
  { keys: ["egypt"], iso: "eg" },
  { keys: ["cape verde"], iso: "cv" },
  { keys: ["congo dr", "dr congo", "democratic republic of the congo"], iso: "cd" },
  { keys: ["poland"], iso: "pl" },
  { keys: ["sweden"], iso: "se" },
  { keys: ["norway"], iso: "no" },
  { keys: ["denmark"], iso: "dk" },
  { keys: ["finland"], iso: "fi" },
  { keys: ["switzerland"], iso: "ch" },
  { keys: ["austria"], iso: "at" },
  { keys: ["czechia", "czech republic"], iso: "cz" },
  { keys: ["slovakia"], iso: "sk" },
  { keys: ["hungary"], iso: "hu" },
  { keys: ["romania"], iso: "ro" },
  { keys: ["serbia"], iso: "rs" },
  { keys: ["scotland"], iso: "gb-sct" },
  { keys: ["wales"], iso: "gb-wls" },
  { keys: ["ireland", "republic of ireland"], iso: "ie" },
  { keys: ["northern ireland"], iso: "gb-nir" },
  { keys: ["turkey", "turkiye", "türkiye"], iso: "tr" },
  { keys: ["greece"], iso: "gr" },
  { keys: ["ukraine"], iso: "ua" },
  { keys: ["russia"], iso: "ru" },
  { keys: ["bosnia", "bosnia-herzegovina"], iso: "ba" },
  { keys: ["slovenia"], iso: "si" },
  { keys: ["albania"], iso: "al" },
  { keys: ["north macedonia"], iso: "mk" },
  { keys: ["montenegro"], iso: "me" },
  { keys: ["kosovo"], iso: "xk" },
  { keys: ["iceland"], iso: "is" },
  { keys: ["georgia"], iso: "ge" },
  { keys: ["armenia"], iso: "am" },
  { keys: ["azerbaijan"], iso: "az" },
  { keys: ["israel"], iso: "il" },
  { keys: ["jordan"], iso: "jo" },
  { keys: ["iraq"], iso: "iq" },
  { keys: ["uzbekistan"], iso: "uz" },
  { keys: ["new zealand"], iso: "nz" },
  { keys: ["curacao", "curaçao"], iso: "cw" },
  { keys: ["china"], iso: "cn" },
  { keys: ["india"], iso: "in" },
  { keys: ["thailand"], iso: "th" },
  { keys: ["vietnam"], iso: "vn" },
  { keys: ["indonesia"], iso: "id" },
];

function normalizeNationalName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function resolveNationalIsoCode(teamName: string): string | null {
  const normalized = normalizeNationalName(teamName);

  for (const entry of NATIONAL_ISO) {
    if (entry.keys.some((key) => normalized === key || normalized.includes(key))) {
      return entry.iso;
    }
  }

  return null;
}

export function flagCdnUrl(iso: string, width = 80): string {
  return `https://flagcdn.com/w${width}/${iso}.png`;
}

export function resolveNationalCrestUrlSync(teamName: string, width = 80): string | null {
  const iso = resolveNationalIsoCode(teamName);
  return iso ? flagCdnUrl(iso, width) : null;
}

export async function resolveNationalCrestUrl(teamName: string, width = 80): Promise<string | null> {
  const cached = await readCachedCrest("national", teamName);
  if (cached) return cached;

  const url = resolveNationalCrestUrlSync(teamName, width);
  if (!url) return null;

  await writeCachedCrest("national", teamName, url, "flagcdn");
  return url;
}

export async function resolveNationalCrestMap(teamNames: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(teamNames.filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (name) => {
      const url = await resolveNationalCrestUrl(name);
      return url ? ([name, url] as const) : null;
    })
  );

  return Object.fromEntries(entries.filter((entry): entry is [string, string] => entry != null));
}
