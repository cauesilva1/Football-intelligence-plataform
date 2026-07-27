"use server";

import type { ShortlistEntry } from "@/lib/client/browser-storage";
import { isDbSource } from "@/lib/data-source";
import { getOrCreateDeviceId } from "@/lib/workspace/device-id";
import {
  listRecruitmentBriefRuns,
  saveRecruitmentBriefRun,
  type RecruitmentBriefRunSummary,
} from "@/lib/workspace/recruitment-history-store";
import { mergeShortlistEntries } from "@/lib/workspace/shortlist-merge";
import {
  listWorkspaceShortlist,
  removeWorkspaceShortlistEntry,
  replaceWorkspaceShortlist,
  upsertWorkspaceShortlistEntry,
} from "@/lib/workspace/shortlist-store";
import type { RecruitmentBrief } from "@/lib/intelligence/recruitment-types";

export async function fetchWorkspaceShortlist(): Promise<ShortlistEntry[]> {
  if (!isDbSource()) return [];
  const deviceId = await getOrCreateDeviceId();
  if (!deviceId) return [];
  return listWorkspaceShortlist(deviceId);
}

export async function syncWorkspaceShortlist(entries: ShortlistEntry[]): Promise<void> {
  if (!isDbSource()) return;
  const deviceId = await getOrCreateDeviceId();
  if (!deviceId) return;
  await replaceWorkspaceShortlist(deviceId, entries);
}

export async function syncWorkspaceShortlistEntry(entry: ShortlistEntry): Promise<void> {
  if (!isDbSource()) return;
  const deviceId = await getOrCreateDeviceId();
  if (!deviceId) return;
  await upsertWorkspaceShortlistEntry(deviceId, entry);
}

export async function removeWorkspaceShortlistPlayer(playerId: string): Promise<void> {
  if (!isDbSource()) return;
  const deviceId = await getOrCreateDeviceId();
  if (!deviceId) return;
  await removeWorkspaceShortlistEntry(deviceId, playerId);
}

/** Merge remote shortlist into local entries — remote wins on timestamp ties. */
export async function hydrateWorkspaceShortlist(
  localEntries: ShortlistEntry[]
): Promise<ShortlistEntry[]> {
  const remote = await fetchWorkspaceShortlist();
  if (remote.length === 0) return localEntries;
  return mergeShortlistEntries(localEntries, remote);
}

export async function recordRecruitmentBriefRun(input: {
  brief: RecruitmentBrief;
  totalEvaluated: number;
  resultCount: number;
}): Promise<void> {
  if (!isDbSource()) return;
  const deviceId = await getOrCreateDeviceId();
  if (!deviceId) return;
  await saveRecruitmentBriefRun(deviceId, input);
}

export async function fetchRecruitmentBriefHistory(
  limit = 8
): Promise<RecruitmentBriefRunSummary[]> {
  if (!isDbSource()) return [];
  const deviceId = await getOrCreateDeviceId();
  if (!deviceId) return [];
  return listRecruitmentBriefRuns(deviceId, limit);
}
