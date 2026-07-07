import { readStore, updateStore } from "./file-store";

export interface ScoutNote {
  text: string;
  updatedAt: string;
}

type ScoutNotesStore = Record<string, Record<string, ScoutNote>>;

export async function getScoutNoteFromStore(
  userId: string,
  playerId: string
): Promise<ScoutNote | null> {
  const store = await readStore<ScoutNotesStore>("scout-notes", {});
  return store[userId]?.[playerId] ?? null;
}

export async function saveScoutNoteToStore(
  userId: string,
  playerId: string,
  text: string
): Promise<ScoutNote> {
  const note: ScoutNote = { text, updatedAt: new Date().toISOString() };

  await updateStore<ScoutNotesStore>("scout-notes", {}, (store) => ({
    ...store,
    [userId]: {
      ...(store[userId] ?? {}),
      [playerId]: note,
    },
  }));

  return note;
}

export async function deleteScoutNoteFromStore(userId: string, playerId: string): Promise<void> {
  await updateStore<ScoutNotesStore>("scout-notes", {}, (store) => {
    const userNotes = { ...(store[userId] ?? {}) };
    delete userNotes[playerId];
    return { ...store, [userId]: userNotes };
  });
}
