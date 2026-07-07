"use server";

import { cookies } from "next/headers";
import { findUserByEmail, createUser } from "@/lib/storage";

const SESSION_COOKIE = "fip_session";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SCOUT" | "ANALYST" | "VIEWER";
}

export async function login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  await new Promise((r) => setTimeout(r, 500));

  if (!email || !password) {
    return { ok: false, error: "Informe e-mail e senha." };
  }

  const user = await findUserByEmail(email);
  if (!user || user.passwordHash !== password) {
    return { ok: false, error: "Credenciais inválidas. Tente novamente." };
  }

  const session: SessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const store = await cookies();
  store.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return { ok: true };
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  await new Promise((r) => setTimeout(r, 600));

  if (!name || !email || password.length < 4) {
    return { ok: false, error: "Preencha todos os campos corretamente." };
  }

  try {
    const user = await createUser({
      name,
      email,
      role: "ANALYST",
      passwordHash: password,
    });

    const session: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const store = await cookies();
    store.set(SESSION_COOKIE, JSON.stringify(session), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_ALREADY_EXISTS") {
      return { ok: false, error: "Este e-mail já está cadastrado." };
    }
    return { ok: false, error: "Não foi possível criar a conta. Tente novamente." };
  }
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}
