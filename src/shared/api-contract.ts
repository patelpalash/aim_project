import type { Issue, Offer, Taxonomy } from "./contracts.ts";
import { validateOffer } from "./catalog.ts";
import { DEFAULT_TAXONOMY } from "./taxonomy.ts";
import { isIsoTimestamp, isRecord } from "./validation.ts";

export interface SourceStatus {
  providerId: string;
  lastAttemptAt: string | null;
  lastSuccessfulImportAt: string | null;
  lastReviewedAt: string | null;
  status: "not-run" | "running" | "demo-only" | "review-needed" | "reviewed" | "empty" | "partial" | "error";
  message: string;
  partialCoverage: boolean;
  extractedCount: number;
  rejectedCount: number;
}
export interface CatalogResponse {
  schemaVersion: 1;
  mode: "demo" | "reviewed";
  offers: Offer[];
  generatedAt: string;
  catalogueVersion: number;
  sourceStatuses?: SourceStatus[];
  cache?: { status: "fresh" | "cached" | "stale"; retrievedAt: string | null };
}
export interface ProviderSummary { id: string; name: string; discoveryUrl: string }
export interface ProvidersResponse { schemaVersion: 1; providers: ProviderSummary[] }
export interface ApiErrorResponse { error: { code: string; message: string; issues?: Issue[] } }

export function validateCatalogResponse(input: unknown, taxonomy: Taxonomy = DEFAULT_TAXONOMY):
  { ok: true; catalog: CatalogResponse } | { ok: false; issues: Issue[] } {
  if (!isRecord(input)) return { ok: false, issues: [{ path: "$", message: "Expected catalog response" }] };
  const issues: Issue[] = [];
  if (input.schemaVersion !== 1) issues.push({ path: "schemaVersion", message: "Unsupported catalog schema" });
  if (input.mode !== "demo" && input.mode !== "reviewed") issues.push({ path: "mode", message: "Expected demo or reviewed catalog" });
  if (!isIsoTimestamp(input.generatedAt)) issues.push({ path: "generatedAt", message: "Expected generation timestamp" });
  if (!Number.isSafeInteger(input.catalogueVersion) || Number(input.catalogueVersion) < 0) issues.push({ path: "catalogueVersion", message: "Expected catalog version" });
  if (!Array.isArray(input.offers)) issues.push({ path: "offers", message: "Expected offer array" });
  else {
    const ids = new Set<string>();
    input.offers.forEach((value, index) => {
      const parsed = validateOffer(value, taxonomy);
      if (!parsed.ok) issues.push(...parsed.issues.map(issue => ({ path: `offers[${index}].${issue.path}`, message: issue.message })));
      else {
        const offer = parsed.offer;
        if (ids.has(offer.id)) issues.push({ path: `offers[${index}].id`, message: "Duplicate offer ID" });
        ids.add(offer.id);
        if (offer.reviewStatus !== "approved" || offer.availability === "cancelled") issues.push({ path: `offers[${index}]`, message: "Public catalog cannot expose pending/cancelled records" });
        if (input.mode === "reviewed" && offer.source.kind === "demo") issues.push({ path: "mode", message: "Synthetic data requires demo mode" });
      }
    });
  }
  if (input.cache !== undefined && (!isRecord(input.cache) || !["fresh", "cached", "stale"].includes(String(input.cache.status)) ||
      (input.cache.retrievedAt !== null && !isIsoTimestamp(input.cache.retrievedAt))))
    issues.push({ path: "cache", message: "Invalid cache metadata" });
  if (input.sourceStatuses !== undefined) {
    if (!Array.isArray(input.sourceStatuses)) issues.push({ path: "sourceStatuses", message: "Expected source statuses" });
    else input.sourceStatuses.forEach((status, index) => {
      const path = `sourceStatuses[${index}]`;
      if (!isRecord(status) || typeof status.providerId !== "string" || !status.providerId.trim() || typeof status.message !== "string" ||
          !["not-run", "running", "demo-only", "review-needed", "reviewed", "empty", "partial", "error"].includes(String(status.status)) ||
          typeof status.partialCoverage !== "boolean" || !Number.isSafeInteger(status.extractedCount) || Number(status.extractedCount) < 0 ||
          !Number.isSafeInteger(status.rejectedCount) || Number(status.rejectedCount) < 0) {
        issues.push({ path, message: "Invalid source status" }); return;
      }
      for (const key of ["lastAttemptAt", "lastSuccessfulImportAt", "lastReviewedAt"])
        if (status[key] !== null && !isIsoTimestamp(status[key])) issues.push({ path: `${path}.${key}`, message: "Expected timestamp or null" });
    });
  }
  return issues.length ? { ok: false, issues } : { ok: true, catalog: input as unknown as CatalogResponse };
}
