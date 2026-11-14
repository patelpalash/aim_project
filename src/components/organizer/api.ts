"use client";

import type { Taxonomy } from "../../shared/contracts.ts";
import type { ProviderSummary, SourceStatus } from "../../shared/api-contract.ts";
import { validateCatalogResponse, validateProvidersResponse } from "../../shared/api-contract.ts";
import { validateTaxonomy } from "../../shared/taxonomy.ts";
import { validateReviewSession, type ReviewFieldPatch, type ReviewSession } from "../../shared/review.ts";
import { isRecord } from "../../shared/validation.ts";

/**
 * Thin client for the local desk. Disabled/missing routes and expired sessions are distinct.
 * Shared catalog/review validators keep client and service payloads aligned.
 */
export class ServiceMissingError extends Error { constructor() { super("Review service not available yet"); this.name = "ServiceMissingError"; } }
export class AdminApiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) { super(message); this.name = "AdminApiError"; this.status = status; }
}

async function request(url: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try { response = await fetch(url, { ...init, headers: { Accept: "application/json", ...(init?.headers ?? {}) }, credentials: "same-origin" }); }
  catch { throw new AdminApiError("Server nicht erreichbar."); }
  // A route that does not exist yet answers 404, or — for a method the dev server does not route —
  // 405/409/501 with an HTML error page. None of those are real review errors.
  const json = (response.headers.get("content-type") ?? "").includes("json");
  let payload: unknown;
  try { payload = json ? await response.json() : null; } catch { throw new AdminApiError("Antwort ist kein gültiges JSON.", response.status); }
  const envelope = isRecord(payload) && isRecord(payload.error) ? payload.error : null;
  if ((response.status === 404 && (!json || envelope?.code === "DESK_DISABLED" || envelope?.message === "Not available.")) ||
      ([405, 409, 501].includes(response.status) && !json)) throw new ServiceMissingError();
  if (!response.ok) {
    const message = typeof envelope?.message === "string" ? envelope.message
      : isRecord(payload) && typeof payload.message === "string" ? payload.message : `Fehler ${response.status}`;
    throw new AdminApiError(message, response.status);
  }
  if (!json) throw new AdminApiError("Antwort ist kein JSON.");
  return payload;
}

function toSession(input: unknown, taxonomy?: Taxonomy): ReviewSession {
  const valid = validateReviewSession(input, taxonomy);
  if (!valid.ok) throw new AdminApiError(`Review-Antwort ungültig: ${valid.issues[0]?.path ?? ""} ${valid.issues[0]?.message ?? ""}`);
  return valid.session;
}

export async function fetchProviders(): Promise<ProviderSummary[]> {
  const valid = validateProvidersResponse(await request("/api/providers"));
  if (!valid.ok) throw new AdminApiError("Anbieter-Antwort ungültig.");
  return [...valid.providers];
}

export async function fetchTaxonomy(): Promise<Taxonomy> {
  const valid = validateTaxonomy(await request("/api/taxonomy"));
  if (!valid.ok) throw new AdminApiError("Themen-Antwort ungültig.");
  return valid.taxonomy;
}

export async function uploadCsv(file: File, providerId: string, mode: "source" | "demo", taxonomy?: Taxonomy): Promise<ReviewSession> {
  const body = new FormData();
  body.set("file", file);
  body.set("providerId", providerId);
  body.set("mode", mode);
  return toSession(await request("/api/admin/uploads", { method: "POST", body }), taxonomy);
}

export async function fetchSession(importId: string, taxonomy?: Taxonomy): Promise<ReviewSession> {
  return toSession(await request(`/api/admin/imports/${encodeURIComponent(importId)}`), taxonomy);
}

export async function patchRow(importId: string, rowId: string, revision: number, changes: ReviewFieldPatch, taxonomy?: Taxonomy): Promise<ReviewSession> {
  return toSession(await request(`/api/admin/imports/${encodeURIComponent(importId)}/rows/${encodeURIComponent(rowId)}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision, changes })
  }), taxonomy);
}

export interface ApproveResult { approved: true; publishedCount: number; blockedCount: number; unchangedCount: number; catalogueVersion: number }
export async function approveRows(importId: string, rowIds: string[], revision: number): Promise<ApproveResult> {
  const result = await request(`/api/admin/imports/${encodeURIComponent(importId)}/approve`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approve: true, rowIds, revision })
  }) as Partial<ApproveResult>;
  if (result?.approved !== true || !Number.isFinite(result.publishedCount)) throw new AdminApiError("Veröffentlichen-Antwort ungültig.");
  return result as ApproveResult;
}

export async function startScrapeRun(providerId: string | "all"): Promise<{ runId: string; status: string }> {
  const result = await request("/api/admin/scrape-runs", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId })
  }) as { runId?: string; status?: string };
  if (!result?.runId) throw new AdminApiError("Scrape-Antwort ungültig.");
  return { runId: result.runId, status: result.status ?? "queued" };
}

export interface ScrapeRun {
  runId: string;
  status: "queued" | "running" | "done";
  results: { providerId: string; status: string; message: string }[];
}
export async function fetchScrapeRun(runId: string): Promise<ScrapeRun> {
  const value = await request(`/api/admin/scrape-runs/${encodeURIComponent(runId)}`);
  if (!isRecord(value) || value.runId !== runId || !["queued", "running", "done"].includes(String(value.status)) ||
      !Array.isArray(value.results) || value.results.some(r => !isRecord(r) || typeof r.providerId !== "string" || typeof r.status !== "string" || typeof r.message !== "string"))
    throw new AdminApiError("Quellenstatus ist ungültig.");
  return value as unknown as ScrapeRun;
}
export async function importFromSource(providerId: string, taxonomy?: Taxonomy): Promise<ReviewSession> {
  return toSession(await request("/api/admin/imports/from-source", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId })
  }), taxonomy);
}
export async function fetchSourceStatuses(taxonomy?: Taxonomy): Promise<SourceStatus[]> {
  const parsed = validateCatalogResponse(await request("/api/offers"), taxonomy);
  if (!parsed.ok) throw new AdminApiError("Katalogstatus ist ungültig.");
  return parsed.catalog.sourceStatuses ?? [];
}
