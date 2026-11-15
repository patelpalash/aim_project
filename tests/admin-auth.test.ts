// Hosted demo admin: password mode, signed cookie, same-origin writes, temporary storage, local mode unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { deskGate, deskMode, issueToken, login, logout, sessionStatus, verifyToken } from "../src/server/admin-auth.ts";
import { dataRoot, TEMP_DATA_DIR } from "../src/server/data-root.ts";
import * as http from "../src/server/review/http.ts";

const KEYS = ["INTEREST_ATLAS_LOCAL_DESK", "INTEREST_ATLAS_ADMIN_PASSWORD", "VERCEL"] as const;
function withEnv(env: Partial<Record<(typeof KEYS)[number], string>>, fn: () => Promise<void> | void) {
  return async () => {
    const saved = Object.fromEntries(KEYS.map(k => [k, process.env[k]]));
    for (const k of KEYS) delete process.env[k];
    Object.assign(process.env, env);
    try { await fn(); } finally {
      for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
    }
  };
}
// Generated per run so no credential-like literal lives in the repository.
const PW = randomBytes(12).toString("base64url");
const OTHER = randomBytes(12).toString("base64url");
const req = (path: string, init: RequestInit & { headers?: Record<string, string> } = {}) =>
  new Request(`https://atlas.example${path}`, { ...init, headers: { host: "atlas.example", ...(init.headers ?? {}) } });
const cookieFor = (password = PW) => ({ cookie: `ia_admin=${issueToken(password)}` });

test("tokens verify, expire and reject tampering or another password", () => {
  const now = Date.now();
  const token = issueToken(PW, now);
  assert.equal(verifyToken(token, PW, now), true);
  assert.equal(verifyToken(token, OTHER, now), false);
  assert.equal(verifyToken(token, PW, now + 9 * 3600_000), false);
  assert.equal(verifyToken(`${token.slice(0, -2)}xx`, PW, now), false);
  assert.equal(verifyToken(undefined, PW, now), false);
  assert.equal(verifyToken(token, null, now), false);
});

test("mode selection: disabled by default, short passwords ignored, local wins", withEnv({}, () => {
  assert.equal(deskMode(), "disabled");
  process.env.INTEREST_ATLAS_ADMIN_PASSWORD = "short";
  assert.equal(deskMode(), "disabled");
  process.env.INTEREST_ATLAS_ADMIN_PASSWORD = PW;
  assert.equal(deskMode(), "password");
  process.env.INTEREST_ATLAS_LOCAL_DESK = "1";
  assert.equal(deskMode(), "local");
}));

test("disabled mode answers 404 for desk routes", withEnv({}, async () => {
  assert.equal(deskGate(req("/api/admin/summary"), false)?.status, 404);
  assert.equal((await http.getSummary(req("/api/admin/summary"))).status, 404);
}));

test("password mode: reads and writes need the cookie; writes must be same-origin", withEnv({ INTEREST_ATLAS_ADMIN_PASSWORD: PW }, () => {
  const noCookie = deskGate(req("/api/admin/summary"), false);
  assert.equal(noCookie?.status, 401);
  assert.equal(deskGate(undefined, false)?.status, 401);
  assert.equal(deskGate(req("/api/admin/summary", { headers: { cookie: "ia_admin=v1.123.forged-signature-value" } }), false)?.status, 401);
  assert.equal(deskGate(req("/api/admin/summary", { headers: cookieFor(OTHER) }), false)?.status, 401);
  assert.equal(deskGate(req("/api/admin/summary", { headers: cookieFor() }), false), null);
  assert.equal(deskGate(req("/api/admin/imports", { method: "POST", headers: { ...cookieFor(), origin: "https://atlas.example" } }), true), null);
  assert.equal(deskGate(req("/api/admin/imports", { method: "POST", headers: { ...cookieFor(), origin: "https://evil.example" } }), true)?.status, 403);
  assert.equal(deskGate(req("/api/admin/imports", { method: "POST", headers: { ...cookieFor(), "sec-fetch-site": "cross-site" } }), true)?.status, 403);
}));

test("login: wrong password 401, right password sets a signed HttpOnly cookie; logout clears it", withEnv({ INTEREST_ATLAS_ADMIN_PASSWORD: PW }, async () => {
  const post = (password: string, headers: Record<string, string> = {}) =>
    login(req("/api/admin/login", { method: "POST", body: JSON.stringify({ password }), headers: { "content-type": "application/json", origin: "https://atlas.example", ...headers } }));
  const bad = await post(OTHER);
  assert.equal(bad.status, 401);
  assert.equal(bad.headers.get("set-cookie"), null);
  assert.equal((await post(PW, { origin: "https://evil.example" })).status, 403);
  const ok = await post(PW);
  assert.equal(ok.status, 200);
  const cookie = ok.headers.get("set-cookie") ?? "";
  assert.match(cookie, /^ia_admin=v1\.\d+\.[\w-]+; Path=\/; HttpOnly; SameSite=Strict; Max-Age=28800; Secure$/);
  const token = cookie.split(";")[0];
  assert.equal(deskGate(req("/api/admin/summary", { headers: { cookie: token } }), false), null);
  const status = await sessionStatus(req("/api/admin/session", { headers: { cookie: token } })).json();
  assert.deepEqual(status, { mode: "password", authenticated: true, storage: "files", sourceRefresh: true });
  assert.match(logout(req("/api/admin/logout", { method: "POST" })).headers.get("set-cookie") ?? "", /^ia_admin=; .*Max-Age=0/);
}));

test("login is unavailable outside password mode", withEnv({ INTEREST_ATLAS_LOCAL_DESK: "1" }, async () => {
  assert.equal((await login(req("/api/admin/login", { method: "POST", body: "{}" }))).status, 404);
}));

test("hosted (VERCEL=1) password mode uses temporary storage and blocks source refresh", withEnv({ INTEREST_ATLAS_ADMIN_PASSWORD: PW, VERCEL: "1" }, async () => {
  assert.equal(dataRoot(), TEMP_DATA_DIR);
  const status = await sessionStatus(req("/api/admin/session", { headers: cookieFor() })).json();
  assert.deepEqual(status, { mode: "password", authenticated: true, storage: "temporary", sourceRefresh: false });
  const run = await http.postScrapeRun(req("/api/admin/scrape-runs", {
    method: "POST", body: JSON.stringify({ providerId: "aim" }), headers: { ...cookieFor(), origin: "https://atlas.example", "content-type": "application/json" },
  }));
  assert.equal(run.status, 409);
  assert.equal(((await run.json()) as { error: { code: string } }).error.code, "REFRESH_LOCAL_ONLY");
}));

test("local mode is unchanged: reads open, writes only from localhost", withEnv({ INTEREST_ATLAS_LOCAL_DESK: "1" }, () => {
  assert.equal(deskGate(req("/api/admin/summary"), false), null);
  assert.equal(deskGate(req("/api/admin/imports", { method: "POST" }), true)?.status, 403);
  const local = new Request("http://localhost:3000/api/admin/imports", { method: "POST", headers: { host: "localhost:3000", origin: "http://localhost:3000" } });
  assert.equal(deskGate(local, true), null);
  assert.ok(dataRoot().endsWith("/data"));
}));
