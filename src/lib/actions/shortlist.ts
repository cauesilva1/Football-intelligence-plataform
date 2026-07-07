"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import {
  addToShortlistStore,
  getShortlistIds,
  isInShortlistStore,
  removeFromShortlistStore,
} from "@/lib/storage/shortlist";

async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session.id;
}

export async function getShortlistAction(): Promise<string[]> {
  const userId = await requireUserId();
  return getShortlistIds(userId);
}

export async function checkShortlistAction(playerId: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return isInShortlistStore(session.id, playerId);
}

export async function addToShortlistAction(playerId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    await addToShortlistStore(userId, playerId);
    revalidatePath("/shortlist");
    revalidatePath(`/players/${playerId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Faça login para salvar jogadores." };
  }
}

export async function removeFromShortlistAction(playerId: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  await removeFromShortlistStore(userId, playerId);
  revalidatePath("/shortlist");
  revalidatePath(`/players/${playerId}`);
  return { ok: true };
}

export async function toggleShortlistAction(
  playerId: string,
  currentlySaved: boolean
): Promise<{ ok: boolean; saved: boolean; error?: string }> {
  if (currentlySaved) {
    await removeFromShortlistAction(playerId);
    return { ok: true, saved: false };
  }
  const result = await addToShortlistAction(playerId);
  return { ok: result.ok, saved: result.ok, error: result.error };
}
