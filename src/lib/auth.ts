// V1 is a single-practice self-hosted app, so there is no full auth stack yet.
// When ADMIN_TOKEN is set, admin API routes require it via a Bearer token.
// (See README "Security" section.)

export function adminTokenConfigured(): boolean {
  return Boolean(process.env.ADMIN_TOKEN && process.env.ADMIN_TOKEN.length > 0);
}

export function isAdminRequestAuthorized(request: Request): boolean {
  if (!adminTokenConfigured()) return true;
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  return token === process.env.ADMIN_TOKEN;
}
