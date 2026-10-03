/**
 * Valida requisições de cron (CLI local ou Vercel Cron).
 * Exige `Authorization: Bearer ${CRON_SECRET}`.
 */
import { createHash, timingSafeEqual } from "node:crypto";

/** SHA-256 digests are always 32 bytes, so the compare does not leak length. */
function safeCompare(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authorization = request.headers.get("authorization");
  if (!authorization) return false;
  return safeCompare(authorization, `Bearer ${secret}`);
}

export function cronUnauthorizedResponse(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function cronMisconfiguredResponse(): Response {
  return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
}
