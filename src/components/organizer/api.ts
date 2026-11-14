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

/**
 * Configuration maintenance (docs/CONTRACT.md: POST /api/admin/topics, /api/admin/providers).
 * IDs are never deleted — a theme or source is disabled instead, so published offers keep
 * validating. A new source is CSV-only until someone writes an adapter for its website.
 */
export interface AdminProviderView {
  id: string; name: string; discoveryUrl: string; enabled: boolean; allowedHosts: string[];
  importMode: string; adapter: "implemented" | "none"; permissionStatus: string | null; strategy: string | null;
}

function providerView(input: unknown): AdminProviderView {
  const p = input as Partial<AdminProviderView>;
  if (!p || typeof p.id !== "string" || typeof p.name !== "string" || typeof p.enabled !== "boolean")
    throw new AdminApiError("Quellen-Antwort ungültig.");
  return {
    id: p.id, name: p.name, discoveryUrl: typeof p.discoveryUrl === "string" ? p.discoveryUrl : "",
    enabled: p.enabled, allowedHosts: Array.isArray(p.allowedHosts) ? p.allowedHosts.filter((h): h is string => typeof h === "string") : [],
    importMode: typeof p.importMode === "string" ? p.importMode : "csv-only",
    adapter: p.adapter === "implemented" ? "implemented" : "none",
    permissionStatus: typeof p.permissionStatus === "string" ? p.permissionStatus : null,
    strategy: typeof p.strategy === "string" ? p.strategy : null
  };
}

export async function fetchAdminProviders(): Promise<AdminProviderView[]> {
  const body = await request("/api/admin/providers") as { providers?: unknown };
  if (!Array.isArray(body?.providers)) throw new AdminApiError("Quellen-Antwort ungültig.");
  return body.providers.map(providerView);
}

export interface ProviderChange { id: string; name?: string; discoveryUrl?: string; enabled?: boolean; allowedHosts?: string[] }
export async function saveProvider(change: ProviderChange): Promise<{ provider: AdminProviderView; created: boolean; note: string }> {
  const body = await request("/api/admin/providers", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(change)
  }) as { provider?: unknown; created?: boolean; note?: string };
  return { provider: providerView(body?.provider), created: body?.created === true, note: typeof body?.note === "string" ? body.note : "" };
}

export async function fetchAdminTaxonomy(): Promise<Taxonomy> {
  const valid = validateTaxonomy(await request("/api/admin/topics"));
  if (!valid.ok) throw new AdminApiError("Themen-Antwort ungültig.");
  return valid.taxonomy;
}

export interface TopicChange { kind: "topic" | "interest"; id: string; label?: { de: string; en: string }; enabled?: boolean; topicIds?: string[] }
export async function saveTopic(change: TopicChange): Promise<Taxonomy> {
  const body = await request("/api/admin/topics", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(change)
  }) as { taxonomy?: unknown };
  const valid = validateTaxonomy(body?.taxonomy);
  if (!valid.ok) throw new AdminApiError("Gespeicherte Themen-Antwort ungültig.");
  return valid.taxonomy;
}

export async function startScrapeRun(providerId: string | "all"): Promise<{ runId: string; status: string }> {
  const result = await request("/api/admin/scrape-runs", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId })
  }) as { runId?: string; status?: string };
  if (!result?.runId) throw new AdminApiError("Scrape-Antwort ungültig.");
  return { runId: result.runId, status: result.status ?? "queued" };
}
