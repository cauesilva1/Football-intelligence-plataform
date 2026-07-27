export const DEVICE_COOKIE_NAME = "omniscout_device";
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2;

const DEVICE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidDeviceId(value: string | undefined | null): value is string {
  return typeof value === "string" && DEVICE_ID_PATTERN.test(value);
}

/** Web Crypto UUID — safe in Edge Runtime and Node. */
export function createDeviceId(): string {
  return crypto.randomUUID();
}
