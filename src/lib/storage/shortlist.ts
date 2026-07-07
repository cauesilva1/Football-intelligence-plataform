import { readStore, updateStore } from "./file-store";

type ShortlistStore = Record<string, string[]>;

export async function getShortlistIds(userId: string): Promise<string[]> {
  const store = await readStore<ShortlistStore>("shortlists", {});
  return store[userId] ?? [];
}

export async function addToShortlistStore(userId: string, playerId: string): Promise<string[]> {
  return updateStore<ShortlistStore>("shortlists", {}, (store) => {
    const current = store[userId] ?? [];
    if (current.includes(playerId)) return store;
    return { ...store, [userId]: [playerId, ...current] };
  }).then((s) => s[userId] ?? []);
}

export async function removeFromShortlistStore(userId: string, playerId: string): Promise<string[]> {
  return updateStore<ShortlistStore>("shortlists", {}, (store) => {
    const current = store[userId] ?? [];
    return { ...store, [userId]: current.filter((id) => id !== playerId) };
  }).then((s) => s[userId] ?? []);
}

export async function isInShortlistStore(userId: string, playerId: string): Promise<boolean> {
  const ids = await getShortlistIds(userId);
  return ids.includes(playerId);
}
