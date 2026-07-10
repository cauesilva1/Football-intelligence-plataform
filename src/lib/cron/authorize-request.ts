/**
 * Valida requisições de cron (CLI local ou Vercel Cron).
 * Exige `Authorization: Bearer ${CRON_SECRET}`.
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

export function cronUnauthorizedResponse(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function cronMisconfiguredResponse(): Response {
  return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
}
