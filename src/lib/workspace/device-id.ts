import { cookies } from "next/headers";
import {
  DEVICE_COOKIE_MAX_AGE,
  DEVICE_COOKIE_NAME,
  createDeviceId,
  isValidDeviceId,
} from "@/lib/workspace/device-cookie";

export {
  DEVICE_COOKIE_NAME,
  DEVICE_COOKIE_MAX_AGE,
  isValidDeviceId,
  createDeviceId,
} from "@/lib/workspace/device-cookie";

/** Read or issue an anonymous workspace device id (httpOnly cookie). */
export async function getOrCreateDeviceId(): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(DEVICE_COOKIE_NAME)?.value;
  if (isValidDeviceId(existing)) return existing;

  const next = createDeviceId();
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
