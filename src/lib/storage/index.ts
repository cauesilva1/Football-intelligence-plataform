import type { ScoutingReport } from "@/lib/types";
import type { SessionUser } from "@/lib/auth/session";
import { readStore, updateStore } from "./file-store";

// ── Users ────────────────────────────────────────────────

export interface StoredUser extends SessionUser {
  passwordHash: string;
}

const DEFAULT_USERS: StoredUser[] = [
  {
    id: "user-demo-01",
    name: "Ana Ferreira",
    email: "ana.ferreira@scoutclub.com",
    role: "SCOUT",
    passwordHash: "demo1234",
  },
];

export async function getUsers(): Promise<StoredUser[]> {
  return readStore("users", DEFAULT_USERS);
}

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  const users = await getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function createUser(
  data: Omit<StoredUser, "id">
): Promise<StoredUser> {
  const existing = await findUserByEmail(data.email);
  if (existing) throw new Error("EMAIL_ALREADY_EXISTS");

  const user: StoredUser = { ...data, id: `user-${Date.now()}` };
  await updateStore("users", DEFAULT_USERS, (users) => [...users, user]);
  return user;
}

// ── Scouting Reports ─────────────────────────────────────

type ReportStore = Record<string, ScoutingReport[]>;

export async function getReportsForPlayerFromStore(
  playerId: string
): Promise<ScoutingReport[]> {
  const store = await readStore<ReportStore>("reports", {});
  return store[playerId] ?? [];
}

export async function saveReport(report: ScoutingReport): Promise<void> {
  await updateStore<ReportStore>("reports", {}, (store) => {
    const existing = store[report.playerId] ?? [];
    return { ...store, [report.playerId]: [report, ...existing] };
  });
}

export async function getAllReports(): Promise<ScoutingReport[]> {
  const store = await readStore<ReportStore>("reports", {});
  return Object.values(store).flat();
}
