/**
 * Local maintenance desk handlers (U3/U4/U5). Every handler returns 404 unless
 * INTEREST_ATLAS_LOCAL_DESK=1; an adult-view switch is not admin authorization.
 * Errors use the agreed envelope `{ error: { code, message, issues } }`, no stack traces.
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadTaxonomy, localDeskEnabled } from "../catalog/read.ts";
import { ADAPTERS } from "../scraping/adapters/index.ts";
import { runProvider, saveRun } from "../scraping/runner.ts";
import type { ProviderRunResult } from "../scraping/types.ts";
import { CSV_TEMPLATE, CsvError, MAX_UPLOAD_BYTES, csvRowToDraft, readCsvUpload } from "./csv.ts";
import { ReviewError, approve, createSession, draftsFromCandidates, getSession, patchRow, resetDemo } from "./service.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const fail = (status: number, code: string, message: string, issues: unknown[] = []) => json({ error: { code, message, issues } }, status);

/** Local writes also reject cross-site browser requests; a parent-view switch grants no access. */
function localWrite(request: Request): boolean {
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
async function desk(fn: () => Promise<Response> | Response, request?: Request): Promise<Response> {
  if (!localDeskEnabled()) return fail(404, "DESK_DISABLED", "Not available.");
  if (request && !localWrite(request)) return fail(403, "LOCAL_ONLY", "Maintenance writes require a same-origin localhost request.");
  try { return await fn(); }
  catch (error) {
    if (error instanceof ReviewError) return fail(error.status, error.code, error.message, error.issues);
    if (error instanceof CsvError) return fail(400, "INVALID_IMPORT", error.message);
    return fail(500, "INTERNAL_ERROR", "The request could not be completed.");
  }
}
async function body(request: Request): Promise<unknown> {
  try { return await request.json(); } catch { throw new ReviewError(400, "MALFORMED", "Expected a JSON body."); }
}

export const getImportTemplate = () => desk(() => new Response(`﻿${CSV_TEMPLATE}`, {
  headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=\"interest-atlas-vorlage.csv\"", "cache-control": "no-store" },
}));

/** Multipart: file (CSV), providerId, mode=source|demo. */
export const postUpload = (request: Request) => desk(async () => {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64_000) return fail(413, "TOO_LARGE", "Datei ist größer als 1 MB.");
  let form: FormData;
  try { form = await request.formData(); } catch { return fail(400, "MALFORMED", "Expected multipart form data with a CSV file."); }
  const file = form.get("file");
  const providerId = String(form.get("providerId") ?? "");
  const mode = String(form.get("mode") ?? "");
  if (!(file instanceof Blob)) return fail(400, "MALFORMED", "CSV file is missing.");
  if (mode !== "source" && mode !== "demo") return fail(400, "MALFORMED", "mode must be source or demo.");
  if (file.size > MAX_UPLOAD_BYTES) return fail(413, "TOO_LARGE", "Datei ist größer als 1 MB.");
  const rows = readCsvUpload(new Uint8Array(await file.arrayBuffer()));
  const fetchedAt = new Date().toISOString();
  const drafts = rows.map(r => {
    const c = csvRowToDraft(r, providerId, mode, fetchedAt);
    return { rowId: c.rowKey, draft: c.offer as unknown as Record<string, unknown>, issues: c.issues, notes: c.notes };
  });
  return json(createSession({ providerId, mode, drafts, taxonomy: loadTaxonomy() }), 201);
}, request);

/** Stage the latest stored source run of a provider into a review session. */
export const postImportFromSource = (request: Request) => desk(async () => {
  const input = await body(request) as { providerId?: unknown };
  const providerId = typeof input?.providerId === "string" ? input.providerId : "";
  if (!/^[a-z0-9-]{1,40}$/.test(providerId)) return fail(400, "MALFORMED", "providerId required.");
  const file = join(process.cwd(), "data", "source-runs", `${providerId}-latest.json`);
  if (!existsSync(file)) return fail(404, "NOT_FOUND", "No stored source run for this provider; refresh it first.");
  const run = JSON.parse(readFileSync(file, "utf8")) as ProviderRunResult;
  if (!run.candidates.length) return fail(400, "EMPTY_RUN", "The last run staged no candidates.");
  return json(createSession({ providerId, mode: "source", drafts: draftsFromCandidates(run.candidates.slice(0, 100)), taxonomy: loadTaxonomy() }), 201);
}, request);

export const getImport = (importId: string) => desk(() => json(getSession(importId)));

export const patchImportRow = (request: Request, importId: string, rowId: string) =>
  desk(async () => json(patchRow(importId, rowId, await body(request), { taxonomy: loadTaxonomy() })), request);

export const postApprove = (request: Request, importId: string) =>
  desk(async () => json(approve(importId, await body(request), { taxonomy: loadTaxonomy() })), request);

export const postReset = (request: Request) => desk(async () => {
  const input = await body(request) as { resetDemo?: unknown };
  if (input?.resetDemo !== true) return fail(400, "MALFORMED", "Send { \"resetDemo\": true } to confirm.");
  return json(resetDemo());
}, request);

// ---- Source refresh: bounded background run, polled status (visitor requests never wait for it).
type RunState = { runId: string; providerIds: string[]; status: "queued" | "running" | "done"; results: Pick<ProviderRunResult, "providerId" | "runId" | "status" | "message" | "counts">[] };
const runs = new Map<string, RunState>();
let active: string | null = null;

export const postScrapeRun = (request: Request) => desk(async () => {
  const input = await body(request) as { providerId?: unknown };
  const requested = typeof input?.providerId === "string" ? input.providerId : "";
  const providerIds = requested === "all" ? Object.keys(ADAPTERS) : ADAPTERS[requested] ? [requested] : [];
  if (!providerIds.length) return fail(400, "UNKNOWN_PROVIDER", "providerId must be a configured provider or \"all\".");
  if (active) return fail(409, "RUN_IN_PROGRESS", "A source refresh is already running.", [{ path: "runId", message: active }]);
  const state: RunState = { runId: randomUUID(), providerIds, status: "queued", results: [] };
  runs.set(state.runId, state);
  active = state.runId;
  void (async () => {
    state.status = "running";
    try {
      for (const id of providerIds) {
        const result = await runProvider(ADAPTERS[id]);
        saveRun(result);
        state.results.push({ providerId: id, runId: result.runId, status: result.status, message: result.message, counts: result.counts });
      }
    } catch (error) {
      state.results.push({ providerId: "?", runId: "", status: "failed", message: error instanceof Error ? error.message : "Run failed", counts: { listed: 0, outOfScope: 0, outsideWindow: 0, extracted: 0, ready: 0, blocked: 0, failed: 1 } });
    } finally {
      state.status = "done";
      active = null;
    }
  })();
  return json({ runId: state.runId, status: "queued" }, 202);
}, request);

export const getScrapeRun = (runId: string) => desk(() => {
  const state = runs.get(runId);
  return state ? json(state) : fail(404, "NOT_FOUND", "Unknown run (runs are kept in memory until the server restarts).");
});
