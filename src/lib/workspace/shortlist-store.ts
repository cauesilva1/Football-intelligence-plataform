import type { ShortlistEntry, ShortlistTag } from "@/lib/client/browser-storage";
import { getPrisma, withPrismaRetry } from "@/lib/prisma";
import { isDbSource } from "@/lib/data-source";

export const SHORTLIST_ENTRY_CAP = 200;
export const SHORTLIST_NOTE_CAP = 2_000;

const VALID_TAGS = new Set<ShortlistTag>(["priority", "watch", "reject"]);

function capNote(note: string | null | undefined): string {
  return (note ?? "").slice(0, SHORTLIST_NOTE_CAP);
}

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
        take: SHORTLIST_ENTRY_CAP,
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

  const normalized = capShortlistPayload(entries);

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
  const note = capNote(entry.note);

  await withPrismaRetry(async () => {
    const prisma = getPrisma();
    const existing = await prisma.workspaceShortlistEntry.findUnique({
      where: { deviceId_playerId: { deviceId, playerId: entry.playerId } },
      select: { playerId: true },
    });
    if (!existing) {
      const count = await prisma.workspaceShortlistEntry.count({ where: { deviceId } });
      if (count >= SHORTLIST_ENTRY_CAP) return;
    }
    await prisma.workspaceShortlistEntry.upsert({
      where: {
        deviceId_playerId: { deviceId, playerId: entry.playerId },
      },
      create: {
        deviceId,
        playerId: entry.playerId,
        tag: entry.tag,
        note,
        updatedAt: new Date(entry.updatedAt),
        lastBriefAt: entry.lastBriefAt ? new Date(entry.lastBriefAt) : null,
      },
      update: {
        tag: entry.tag,
        note,
        updatedAt: new Date(entry.updatedAt),
        lastBriefAt: entry.lastBriefAt ? new Date(entry.lastBriefAt) : null,
      },
    });
  }, { label: "upsertWorkspaceShortlistEntry" });
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

export function capShortlistPayload(entries: ShortlistEntry[]): ShortlistEntry[] {
  const byId = new Map<string, ShortlistEntry>();
  for (const entry of entries) {
    if (!entry.playerId) continue;
    byId.set(entry.playerId, { ...entry, note: capNote(entry.note) });
  }
  return [...byId.values()].slice(-SHORTLIST_ENTRY_CAP);
}
