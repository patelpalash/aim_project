/**
 * Local maintenance desk handlers (U3/U4/U5). Every handler returns 404 unless
 * INTEREST_ATLAS_LOCAL_DESK=1; an adult-view switch is not admin authorization.
 * Errors use the agreed envelope `{ error: { code, message, issues } }`, no stack traces.
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadCatalog as loadStoredCatalog, loadTaxonomy, publicOffers, sourceStatuses } from "../catalog/read.ts";
import { deskGate } from "../admin-auth.ts";
import { dataRoot } from "../data-root.ts";
import { changeProvider, changeTaxonomy, ConfigChangeError, providerViews, readDemoGapSeeds } from "../config/maintenance.ts";
import { ADAPTERS } from "../scraping/adapters/index.ts";
import { runProvider, saveRun } from "../scraping/runner.ts";
import type { ProviderRunResult } from "../scraping/types.ts";
import { CSV_TEMPLATE, CsvError, MAX_UPLOAD_BYTES, csvRowToDraft, readCsvUpload } from "./csv.ts";
import { ReviewError, approve, createSession, draftsFromCandidates, getSession, patchRow, resetDemo } from "./service.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const fail = (status: number, code: string, message: string, issues: unknown[] = []) => json({ error: { code, message, issues } }, status);

/**
 * Every desk route goes through `deskGate` (see admin-auth.ts): 404 when the desk is disabled,
 * a login in password mode, and same-origin (local mode: localhost) checks for writes.
 */
async function desk(fn: () => Promise<Response> | Response, request?: Request): Promise<Response> {
  const write = !!request && request.method !== "GET" && request.method !== "HEAD";
  const blocked = deskGate(request, write);
  if (blocked) return blocked;
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

export const getImportTemplate = (request?: Request) => desk(() => new Response(`﻿${CSV_TEMPLATE}`, {
  headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=\"interest-atlas-vorlage.csv\"", "cache-control": "no-store" },
}), request);

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
  const file = join(/*turbopackIgnore: true*/ dataRoot(), "source-runs", `${providerId}-latest.json`);
  if (!existsSync(/*turbopackIgnore: true*/ file)) return fail(404, "NOT_FOUND", "No stored source run for this provider; refresh it first.");
  const run = JSON.parse(readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as ProviderRunResult;
  if (!run.candidates.length) return fail(400, "EMPTY_RUN", "The last run staged no candidates.");
  return json(createSession({ providerId, mode: "source", drafts: draftsFromCandidates(run.candidates.slice(0, 100)), taxonomy: loadTaxonomy() }), 201);
}, request);

export const getImport = (importId: string, request?: Request) => desk(() => json(getSession(importId)), request);

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
  // Serverless platforms stop work after the response, so a background scrape would never finish there.
  if (process.env.VERCEL === "1") return fail(409, "REFRESH_LOCAL_ONLY", "Quellen-Aktualisierung läuft nur lokal; in der gehosteten Demo bitte gespeicherte Läufe prüfen. / Source refresh runs locally only; in the hosted demo, review the stored runs.");
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

export const getScrapeRun = (runId: string, request?: Request) => desk(() => {
  const state = runs.get(runId);
  return state ? json(state) : fail(404, "NOT_FOUND", "Unknown run (runs are kept in memory until the server restarts).");
}, request);

// ---- U5: summary and configuration maintenance (themes, sources).

async function config(fn: () => Promise<Response> | Response, request?: Request): Promise<Response> {
  return desk(async () => {
    try { return await fn(); }
    catch (error) {
      if (error instanceof ConfigChangeError) return fail(400, "INVALID_CONFIGURATION_CHANGE", error.message, error.issues);
      throw error;
    }
  }, request);
}

/** Desk overview: catalogue version, per-source status and the synthetic demo gap panel. */
export const getSummary = (request?: Request) => desk(() => {
  const taxonomy = loadTaxonomy();
  const stored = loadStoredCatalog(undefined, taxonomy);
  const visible = publicOffers(stored.offers, new Date());
  const seeds = readDemoGapSeeds();
  const gaps = taxonomy.interests.filter(i => i.enabled).map(i => ({
    interest: i.id,
    exampleRequests: seeds[i.id] ?? 0,
    suitableCatalogCount: visible.filter(o => o.interests.includes(i.id) && o.availability !== "full").length,
    synthetic: true as const,
  }));
  return json({
    mode: stored.hasDemo ? "demo" : "reviewed",
    catalogueVersion: stored.catalogueVersion,
    publishedRealCount: visible.filter(o => o.source.kind === "verified").length,
    sourceStatuses: sourceStatuses(),
    gaps,
    gapsNote: "Example requests are invented demo numbers (data/demo-gap-requests.json), not measured demand.",
  });
}, request);

export const getTopics = (request?: Request) => config(() => json(loadTaxonomy()), request);
export const postTopic = (request: Request) => config(async () => json({ taxonomy: changeTaxonomy(await body(request)) }), request);

export const getAdminProviders = (request?: Request) => config(() => json({ providers: providerViews(Object.keys(ADAPTERS)) }), request);
export const postAdminProvider = (request: Request) => config(async () => {
  const result = changeProvider(await body(request));
  const provider = { ...result.provider, adapter: ADAPTERS[result.provider.id] ? "implemented" : "none" };
  return json({
    provider,
    created: result.created,
    note: provider.adapter === "none"
      ? "Saved as a CSV-only source. Automatic refresh needs a website-specific adapter (development work)."
      : "Saved. The source adapter is unchanged.",
  }, result.created ? 201 : 200);
}, request);
