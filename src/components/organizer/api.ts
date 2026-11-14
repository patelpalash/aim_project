"use client";

import type { Taxonomy } from "@/shared/contracts";
import type { ProviderSummary } from "@/shared/api-contract";
import { validateProvidersResponse } from "@/shared/api-contract";
import { validateTaxonomy } from "@/shared/taxonomy";
import { validateReviewSession, type ReviewFieldPatch, type ReviewSession } from "@/shared/review";

/**
 * Thin client for Umang's admin routes (docs/CONTRACT.md). Every call validates the response
 * through the shared validators. A 404 means the route is not built yet (U-tasks): that state is
 * surfaced as `ServiceMissingError` so the UI can say so honestly instead of pretending.
 */
export class ServiceMissingError extends Error { constructor() { super("Review service not available yet"); this.name = "ServiceMissingError"; } }
export class AdminApiError extends Error { constructor(message: string, readonly status?: number) { super(message); this.name = "AdminApiError"; } }

async function request(url: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try { response = await fetch(url, { ...init, headers: { Accept: "application/json", ...(init?.headers ?? {}) }, credentials: "same-origin" }); }
  catch { throw new AdminApiError("Server nicht erreichbar."); }
  // A route that does not exist yet answers 404, or — for a method the dev server does not route —
  // 405/409/501 with an HTML error page. None of those are real review errors.
  const json = (response.headers.get("content-type") ?? "").includes("json");
  if (response.status === 404 || ([405, 409, 501].includes(response.status) && !json)) throw new ServiceMissingError();
  if (!response.ok) {
    let message = `Fehler ${response.status}`;
    try { const body = await response.json() as { message?: string; error?: string }; message = body.message ?? body.error ?? message; } catch { /* keep status text */ }
    throw new AdminApiError(message, response.status);
  }
  try { return await response.json(); } catch { throw new AdminApiError("Antwort ist kein JSON."); }
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
