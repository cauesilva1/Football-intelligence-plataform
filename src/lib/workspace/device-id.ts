import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export const DEVICE_COOKIE_NAME = "omniscout_device";
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2;

const DEVICE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidDeviceId(value: string | undefined | null): value is string {
  return typeof value === "string" && DEVICE_ID_PATTERN.test(value);
}

/** Read or issue an anonymous workspace device id (httpOnly cookie). */
export async function getOrCreateDeviceId(): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(DEVICE_COOKIE_NAME)?.value;
  if (isValidDeviceId(existing)) return existing;

  const next = randomUUID();
  jar.set(DEVICE_COOKIE_NAME, next, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: DEVICE_COOKIE_MAX_AGE,
    path: "/",
  });
  return next;
}

/** Read device id without creating one (e.g. middleware already set it). */
export async function getDeviceId(): Promise<string | null> {
  const value = (await cookies()).get(DEVICE_COOKIE_NAME)?.value;
  return isValidDeviceId(value) ? value : null;
}
