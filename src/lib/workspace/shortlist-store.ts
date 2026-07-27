import type { ShortlistEntry, ShortlistTag } from "@/lib/client/browser-storage";
import { getPrisma, withPrismaRetry } from "@/lib/prisma";
import { isDbSource } from "@/lib/data-source";

const VALID_TAGS = new Set<ShortlistTag>(["priority", "watch", "reject"]);

function parseTag(value: string): ShortlistTag {
  return VALID_TAGS.has(value as ShortlistTag) ? (value as ShortlistTag) : "watch";
}

function rowToEntry(row: {
  playerId: string;
  tag: string;
  note: string;
  updatedAt: Date;
  lastBriefAt: Date | null;
}): ShortlistEntry {
  return {
    playerId: row.playerId,
    tag: parseTag(row.tag),
    note: row.note,
    updatedAt: row.updatedAt.toISOString(),
    ...(row.lastBriefAt ? { lastBriefAt: row.lastBriefAt.toISOString() } : {}),
  };
}

export async function listWorkspaceShortlist(deviceId: string): Promise<ShortlistEntry[]> {
  if (!isDbSource()) return [];

  const rows = await withPrismaRetry(
    () =>
      getPrisma().workspaceShortlistEntry.findMany({
        where: { deviceId },
        orderBy: { updatedAt: "desc" },
      }),
    { label: "listWorkspaceShortlist" }
  );

  return rows.map(rowToEntry);
}

export async function replaceWorkspaceShortlist(
  deviceId: string,
  entries: ShortlistEntry[]
): Promise<void> {
  if (!isDbSource()) return;

  const normalized = dedupeEntries(entries);

  await withPrismaRetry(async () => {
    const prisma = getPrisma();
    await prisma.$transaction([
      prisma.workspaceShortlistEntry.deleteMany({ where: { deviceId } }),
      ...(normalized.length > 0
        ? [
            prisma.workspaceShortlistEntry.createMany({
              data: normalized.map((entry) => ({
                deviceId,
                playerId: entry.playerId,
                tag: entry.tag,
                note: entry.note,
                updatedAt: new Date(entry.updatedAt),
                lastBriefAt: entry.lastBriefAt ? new Date(entry.lastBriefAt) : null,
              })),
            }),
          ]
        : []),
    ]);
  }, { label: "replaceWorkspaceShortlist" });
}

export async function upsertWorkspaceShortlistEntry(
  deviceId: string,
  entry: ShortlistEntry
): Promise<void> {
  if (!isDbSource()) return;

  await withPrismaRetry(
    () =>
      getPrisma().workspaceShortlistEntry.upsert({
        where: {
          deviceId_playerId: { deviceId, playerId: entry.playerId },
        },
        create: {
          deviceId,
          playerId: entry.playerId,
          tag: entry.tag,
          note: entry.note,
          updatedAt: new Date(entry.updatedAt),
          lastBriefAt: entry.lastBriefAt ? new Date(entry.lastBriefAt) : null,
        },
        update: {
          tag: entry.tag,
          note: entry.note,
          updatedAt: new Date(entry.updatedAt),
          lastBriefAt: entry.lastBriefAt ? new Date(entry.lastBriefAt) : null,
        },
      }),
    { label: "upsertWorkspaceShortlistEntry" }
  );
}

export async function removeWorkspaceShortlistEntry(
  deviceId: string,
  playerId: string
): Promise<void> {
  if (!isDbSource()) return;

  await withPrismaRetry(
    () =>
      getPrisma().workspaceShortlistEntry.deleteMany({
        where: { deviceId, playerId },
      }),
    { label: "removeWorkspaceShortlistEntry" }
  );
}

function dedupeEntries(entries: ShortlistEntry[]): ShortlistEntry[] {
  const byId = new Map<string, ShortlistEntry>();
  for (const entry of entries) {
    if (!entry.playerId) continue;
    byId.set(entry.playerId, entry);
  }
  return [...byId.values()];
}
