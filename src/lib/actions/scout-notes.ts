"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import {
  deleteScoutNoteFromStore,
  getScoutNoteFromStore,
  saveScoutNoteToStore,
  type ScoutNote,
} from "@/lib/storage/scout-notes";

async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session.id;
}

export async function getScoutNoteAction(playerId: string): Promise<ScoutNote | null> {
  const session = await getSession();
  if (!session) return null;
  return getScoutNoteFromStore(session.id, playerId);
}

export async function saveScoutNoteAction(
  playerId: string,
  text: string
): Promise<{ ok: boolean; note?: ScoutNote; error?: string }> {
  try {
    const userId = await requireUserId();
    const trimmed = text.trim();
    if (!trimmed) {
      await deleteScoutNoteFromStore(userId, playerId);
      revalidatePath(`/players/${playerId}`);
      return { ok: true };
    }
    const note = await saveScoutNoteToStore(userId, playerId, trimmed);
    revalidatePath(`/players/${playerId}`);
    return { ok: true, note };
  } catch {
    return { ok: false, error: "Faça login para salvar notas." };
  }
}
