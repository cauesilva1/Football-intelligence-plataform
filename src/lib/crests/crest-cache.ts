import { prisma } from "@/lib/prisma";

interface CrestCachePayload {
  url: string;
  source: "flagcdn" | "api-sports" | "transfermarkt" | "static";
  cachedAt: string;
}

function crestCacheKey(kind: "national" | "club", slug: string): string {
  return `crest:${kind}:${slug}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function readCachedCrest(
  kind: "national" | "club",
  name: string
): Promise<string | null> {
  const key = crestCacheKey(kind, slugify(name));
  const row = await prisma.systemCache.findUnique({ where: { key } });
  const payload = row?.json as CrestCachePayload | undefined;
  return payload?.url ?? null;
}

export async function writeCachedCrest(
  kind: "national" | "club",
  name: string,
  url: string,
  source: CrestCachePayload["source"]
): Promise<void> {
  const key = crestCacheKey(kind, slugify(name));
  const payload: CrestCachePayload = {
    url,
    source,
    cachedAt: new Date().toISOString(),
  };

  await prisma.systemCache.upsert({
    where: { key },
    create: { key, json: payload as object },
    update: { json: payload as object },
  });
}
