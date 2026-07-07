import { mkdir, readFile, writeFile, rename } from "fs/promises";
import path from "path";

// ==========================================================
// Hybrid storage: file-based locally, in-memory on Vercel.
// Serverless filesystems are read-only — writes fail in prod.
// ==========================================================

declare global {
  // eslint-disable-next-line no-var
  var __fipMemoryStore: Map<string, unknown> | undefined;
}

const memoryStore = globalThis.__fipMemoryStore ?? new Map<string, unknown>();
if (process.env.NODE_ENV !== "production") {
  globalThis.__fipMemoryStore = memoryStore;
}

const DATA_DIR = path.join(process.cwd(), ".data");

function useMemoryStore(): boolean {
  return process.env.VERCEL === "1" || process.env.STORAGE_MODE === "memory";
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

function filePath(name: string) {
  return path.join(DATA_DIR, `${name}.json`);
}

export async function readStore<T>(name: string, fallback: T): Promise<T> {
  if (useMemoryStore()) {
    const cached = memoryStore.get(name);
    if (cached !== undefined) return cached as T;
    memoryStore.set(name, fallback);
    return fallback;
  }

  await ensureDataDir();
  try {
    const raw = await readFile(filePath(name), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    await writeStore(name, fallback);
    return fallback;
  }
}

export async function writeStore<T>(name: string, data: T): Promise<void> {
  if (useMemoryStore()) {
    memoryStore.set(name, data);
    return;
  }

  await ensureDataDir();
  const target = filePath(name);
  const tmp = `${target}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await rename(tmp, target);
}

export async function updateStore<T>(
  name: string,
  fallback: T,
  updater: (current: T) => T
): Promise<T> {
  const current = await readStore(name, fallback);
  const next = updater(current);
  await writeStore(name, next);
  return next;
}

export function isMemoryStorageActive(): boolean {
  return useMemoryStore();
}
