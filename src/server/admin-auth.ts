/**
 * Access control for the organizer desk.
 *
 * Modes:
 * - "local":    INTEREST_ATLAS_LOCAL_DESK=1 — unchanged local behaviour (localhost-only writes, no login).
 * - "password": INTEREST_ATLAS_ADMIN_PASSWORD set (>= 8 chars) — hosted demo behind a shared password.
 *               Login sets a signed, HttpOnly, SameSite=Strict cookie valid for 8 hours. Writes must also
 *               be same-origin. This is a demo safeguard, not individual accounts or a production auth system.
 * - "disabled": neither set — every desk route answers 404 (public, read-only deployment).
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { adminPassword, usesTemporaryData } from "./data-root.ts";

export type DeskMode = "local" | "password" | "disabled";
export const COOKIE = "ia_admin";
const TTL_MS = 8 * 60 * 60 * 1000;

export function deskMode(): DeskMode {
  if (process.env.INTEREST_ATLAS_LOCAL_DESK === "1") return "local";
  return adminPassword() ? "password" : "disabled";
}

const key = (password: string) => createHash("sha256").update(`interest-atlas-admin:${password}`).digest();
const sign = (password: string, expires: number) => createHmac("sha256", key(password)).update(`v1.${expires}`).digest("base64url");

export function issueToken(password: string, now = Date.now()): string {
  const expires = now + TTL_MS;
  return `v1.${expires}.${sign(password, expires)}`;
}

export function verifyToken(token: string | undefined, password: string | null, now = Date.now()): boolean {
  if (!token || !password) return false;
  const m = /^v1\.(\d{10,16})\.([A-Za-z0-9_-]{20,})$/.exec(token);
  if (!m) return false;
  const expires = Number(m[1]);
  if (!Number.isFinite(expires) || expires <= now || expires > now + TTL_MS + 60_000) return false;
  const expected = Buffer.from(sign(password, expires));
  const given = Buffer.from(m[2]);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function cookieValue(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export const isAuthenticated = (request: Request) => verifyToken(cookieValue(request, COOKIE), adminPassword());

function passwordMatches(given: string, password: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(password).digest();
  return timingSafeEqual(a, b);
}

/** Same-origin browser request (also rejects cross-site fetches and forms). */
export function sameOrigin(request: Request): boolean {
  try {
    const url = new URL(request.url);
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
    const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
    if (request.headers.get("sec-fetch-site") === "cross-site") return false;
    const origin = request.headers.get("origin");
    return !origin || origin === `${proto}://${host}`;
  } catch { return false; }
}

const secure = (request: Request) => (request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "")) === "https";
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const fail = (status: number, code: string, message: string) => json({ error: { code, message, issues: [] } }, status);

export function sessionStatus(request: Request): Response {
  const mode = deskMode();
  return json({
    mode,
    authenticated: mode === "local" || (mode === "password" && isAuthenticated(request)),
    storage: usesTemporaryData() ? "temporary" : "files",
    sourceRefresh: !(mode === "password" && process.env.VERCEL === "1"),
  });
}

export async function login(request: Request): Promise<Response> {
  const password = adminPassword();
  if (deskMode() !== "password" || !password) return fail(404, "DESK_DISABLED", "Not available.");
  if (!sameOrigin(request)) return fail(403, "SAME_ORIGIN_ONLY", "Login must come from this site.");
  let given = "";
  try { const body = await request.json() as { password?: unknown }; given = typeof body?.password === "string" ? body.password : ""; } catch { /* empty */ }
  if (!given || given.length > 200 || !passwordMatches(given, password)) {
    await new Promise(r => setTimeout(r, 800)); // slow down guessing
    return fail(401, "BAD_PASSWORD", "Falsches Passwort. / Wrong password.");
  }
  const cookie = `${COOKIE}=${issueToken(password)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${TTL_MS / 1000}${secure(request) ? "; Secure" : ""}`;
  return json({ authenticated: true }, 200, { "set-cookie": cookie });
}

export function logout(request: Request): Response {
  const cookie = `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure(request) ? "; Secure" : ""}`;
  return json({ authenticated: false }, 200, { "set-cookie": cookie });
}

/** Local-mode write check (unchanged rule): same-origin request addressed to localhost. */
export function localWrite(request: Request): boolean {
  try {
    const url = new URL(request.url);
    const local = (host: string) => ["localhost", "127.0.0.1", "[::1]"].includes(host);
    const destination = new URL(`${url.protocol}//${request.headers.get("host") ?? url.host}`);
    if (!local(url.hostname) || !local(destination.hostname) || destination.username || destination.password) return false;
    if (request.headers.get("sec-fetch-site") === "cross-site") return false;
    const origin = request.headers.get("origin");
    return !origin || origin === destination.origin;
  } catch { return false; }
}

/**
 * Gate for every desk route. Returns an error Response, or null when the request may proceed.
 * Reads need a login in password mode; writes additionally need a same-origin (or local) request.
 */
export function deskGate(request: Request | undefined, write: boolean): Response | null {
  const mode = deskMode();
  if (mode === "disabled") return fail(404, "DESK_DISABLED", "Not available.");
  if (mode === "local") {
    if (write && (!request || !localWrite(request))) return fail(403, "LOCAL_ONLY", "Maintenance writes require a same-origin localhost request.");
    return null;
  }
  if (!request || !isAuthenticated(request)) return fail(401, "LOGIN_REQUIRED", "Bitte anmelden. / Please sign in.");
  if (write && !sameOrigin(request)) return fail(403, "SAME_ORIGIN_ONLY", "Maintenance writes must come from this site.");
  return null;
}
