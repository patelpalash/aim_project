/**
 * Read side of the catalogue (U1/U5, PALASH-002). Framework-neutral Web `Request`/`Response`
 * handlers mounted by Next.js route files. Every public response is checked with the shared
 * validators (`validateCatalogResponse`, `validateTaxonomy`, `validateProvidersResponse`) before
 * it is sent, so the client's `loadCatalog` receives exactly the agreed contract.
 *
 * Public:  GET /api/offers     – approved, not cancelled, not past offers + per-source status.
 *          GET /api/taxonomy   – validated data/taxonomy.json.
 *          GET /api/providers  – enabled configured providers (id, name, discoveryUrl).
 * Local:   GET /api/admin/source-runs/:providerId/latest – staged candidates; 404 unless
 *          INTEREST_ATLAS_LOCAL_DESK=1 (maintenance routes stay local).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { validateOffer } from "../../shared/catalog.ts";
import type { Offer, Taxonomy } from "../../shared/contracts.ts";
import {
  validateCatalogResponse, validateProvidersResponse,
  type CatalogResponse, type ProvidersResponse, type SourceStatus,
} from "../../shared/api-contract.ts";
import { getScheduleStatus } from "../../shared/schedule.ts";
import { validateTaxonomy } from "../../shared/taxonomy.ts";
import type { ProviderRunResult } from "../scraping/types.ts";
import { dataRoot } from "../data-root.ts";
import { deskGate } from "../admin-auth.ts";

/**
 * Data directory: <project root>/data, resolved from the working directory (npm scripts and
 * `next start` run there). Bundlers rewrite `new URL(…, import.meta.url)` as an asset, and a
 * statically scoped path keeps Next from tracing the whole project. Tests pass explicit files.
 */
const dataDir = () => pathToFileURL(`${join(/*turbopackIgnore: true*/ dataRoot())}/`);

export interface CatalogFiles {
  demo: URL;
  /** Local runtime catalogue written by the approval service (U4); git-ignored. */
  published: URL;
  /** Committed reviewed baseline used when no runtime catalogue exists (and restored by reset). */
  reviewed?: URL;
  runs: URL;
  taxonomy: URL;
  providers: URL;
}

export const defaultFiles = (): CatalogFiles => {
  const DATA = dataDir();
  return {
    demo: new URL("demo-offers.json", DATA),
    published: new URL("catalog/published-offers.json", DATA),
    reviewed: new URL("catalog/reviewed-offers.json", DATA),
    runs: new URL("source-runs/", DATA),
    taxonomy: new URL("taxonomy.json", DATA),
    providers: new URL("providers.json", DATA),
  };
};

const readJson = <T>(file: URL, fallback: T): T => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback);

class ConfigError extends Error {}

export function loadTaxonomy(files: CatalogFiles = defaultFiles()): Taxonomy {
  const parsed = validateTaxonomy(readJson<unknown>(files.taxonomy, null));
  if (!parsed.ok) throw new ConfigError(`Taxonomy configuration is invalid: ${parsed.issues.map(i => i.path).join(", ")}`);
  return parsed.taxonomy;
}

interface ProviderFileEntry { id: string; name: string; discoveryUrl: string; enabled: boolean }

export function loadProviderSummaries(files: CatalogFiles = defaultFiles()): ProvidersResponse {
  const entries = readJson<ProviderFileEntry[]>(files.providers, []);
  const body: ProvidersResponse = {
    schemaVersion: 1,
    providers: entries.filter(p => p.enabled).map(p => ({ id: p.id, name: p.name, discoveryUrl: p.discoveryUrl })),
  };
  const valid = validateProvidersResponse(body);
  if (!valid.ok) throw new ConfigError(`Provider configuration is invalid: ${valid.issues.map(i => i.path).join(", ")}`);
  return body;
}

interface StoredCatalog { catalogueVersion: number; publishedAt?: string | null; offers: unknown[]; source: "runtime" | "reviewed-baseline" | "none" }

/** Runtime catalogue if present, else the committed reviewed baseline, else empty. */
export function readStoredCatalog(files: CatalogFiles = defaultFiles()): StoredCatalog {
  if (existsSync(files.published)) return { ...readJson<Omit<StoredCatalog, "source">>(files.published, { catalogueVersion: 0, offers: [] }), source: "runtime" };
  if (files.reviewed && existsSync(files.reviewed)) return { ...readJson<Omit<StoredCatalog, "source">>(files.reviewed, { catalogueVersion: 0, offers: [] }), source: "reviewed-baseline" };
  return { catalogueVersion: 0, publishedAt: null, offers: [], source: "none" };
}

/** Load demo + published records; anything that fails validation is dropped, never repaired silently. */
export function loadCatalog(files: CatalogFiles = defaultFiles(), taxonomy = loadTaxonomy(files)) {
  const published = readStoredCatalog(files);
  const offers: Offer[] = [];
  let dropped = 0;
  for (const raw of [...readJson<unknown[]>(files.demo, []), ...published.offers]) {
    const v = validateOffer(raw, taxonomy);
    if (v.ok) offers.push(v.offer); else dropped++;
  }
  return {
    offers, dropped, catalogueVersion: published.catalogueVersion,
    publishedAt: published.publishedAt ?? null, hasPublishedFile: published.source !== "none",
    hasDemo: offers.some(o => o.source.kind === "demo"),
  };
}

/** Publication/time gate only; audience filtering stays client-side so parent/school data is not lost. */
export function publicOffers(offers: readonly Offer[], now: Date): Offer[] {
  return offers.filter(o => {
    if (o.reviewStatus !== "approved" || o.availability === "cancelled") return false;
    if (o.source.kind === "verified" && !o.source.verifiedAt) return false;
    return getScheduleStatus(o, now) !== "past";
  });
}

const RUN_STATUS: Record<ProviderRunResult["status"], SourceStatus["status"]> = {
  "not-run": "not-run", running: "running", "needs-review": "review-needed", reviewed: "reviewed",
  empty: "empty", partial: "partial", failed: "error",
};

const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * Visitor/organizer-facing German status sentence (ISH-REQ-3), built from structured run data.
 * The English technical log stays in the run files (`message` of `<provider>-latest.json`).
 */
export function germanStatusMessage(input: {
  current: Partial<ProviderRunResult>; latest: ProviderRunResult | null; lastAttemptFailed: boolean;
  published: number; awaiting: number; blocked: number;
}): string {
  const { current, latest, lastAttemptFailed, published, awaiting, blocked } = input;
  const parts: string[] = [];
  const counts = current.counts;
  if (lastAttemptFailed)
    parts.push(latest ? "Die letzte Aktualisierung ist fehlgeschlagen; angezeigt wird der letzte erfolgreiche Lauf." : "Die Quelle konnte nicht gelesen werden; der veröffentlichte Katalog bleibt unverändert.");
  else if (current.status === "failed") parts.push("Die Quelle konnte nicht gelesen werden; der veröffentlichte Katalog bleibt unverändert.");
  else if (current.status === "empty") parts.push(`Quelle gelesen; in den nächsten ${current.windowDays ?? 90} Tagen gibt es keine passenden Angebote für Kinder, Jugendliche oder Familien.`);
  else if (counts) {
    const staged = (counts.ready ?? 0) + (counts.blocked ?? 0);
    parts.push(`${n(staged, "Angebot", "Angebote")} zur Prüfung bereitgestellt (${counts.ready ?? 0} prüfbereit, ${counts.blocked ?? 0} mit Korrekturbedarf).`);
  }
  if (!lastAttemptFailed && current.status !== "failed" && current.partialCoverage) {
    const capHit = (current.pages?.length ?? 0) >= (current.pageCap ?? Infinity);
    const unread = counts?.failed ?? 0;
    parts.push(`Abdeckung unvollständig${capHit ? ": Seitenlimit erreicht" : ""}${unread ? `${capHit ? "," : ":"} ${n(unread, "Seite", "Seiten")} nicht lesbar` : ""}.`);
  }
  if (latest)
    parts.push(`Prüfung: ${published} nach menschlicher Prüfung veröffentlicht, ${awaiting} bereitgestellt, aber nicht veröffentlicht (wartet auf Prüfung oder zurückgestellt), ${blocked} blockiert.`);
  return parts.join(" ");
}

/** Per-provider status from the stored run files (no raw evidence, no candidate data). */
export function sourceStatuses(files: CatalogFiles = defaultFiles(), providerIds = loadProviderSummaries(files).providers.map(p => p.id)): SourceStatus[] {
  const published = readStoredCatalog(files).offers as Partial<Offer>[];
  return providerIds.map(providerId => {
    // Human review time comes only from approved provider records (set at approval), never from a run.
    const reviewed = published.filter(o => o?.providerId === providerId && o.reviewStatus === "approved" && o.source?.kind === "verified" && typeof o.source.verifiedAt === "string");
    const lastReviewedAt = reviewed.map(o => o.source!.verifiedAt as string).sort().at(-1) ?? null;
    const latest = readJson<ProviderRunResult | null>(new URL(`${providerId}-latest.json`, files.runs), null);
    const attempt = readJson<(Partial<ProviderRunResult> & { finishedAt?: string }) | null>(new URL(`${providerId}-last-attempt.json`, files.runs), null);
    if (!latest && !attempt)
      return { providerId, lastAttemptAt: null, lastSuccessfulImportAt: null, lastReviewedAt, status: "not-run",
        message: "Für diese Quelle wurde noch kein Lauf erfasst.", partialCoverage: false, extractedCount: 0, rejectedCount: 0 };
    const lastAttemptFailed = attempt?.status === "failed" && (!latest || (attempt.finishedAt ?? "") > latest.finishedAt);
    const current = lastAttemptFailed ? attempt! : latest!;
    // Staged, publishable candidates that are not yet published unchanged still await review.
    const byId = new Map(reviewed.map(o => [o.id, o]));
    const staged = (latest?.candidates ?? []).filter(c => c.state !== "blocked" && c.timing !== "ended");
    const awaiting = staged.filter(c => {
      const p = byId.get(c.offer.id);
      return !p || p.startsAt !== c.offer.startsAt || p.startDate !== c.offer.startDate || p.availability !== c.offer.availability || p.priceEur !== c.offer.priceEur || p.title?.de !== c.offer.title.de;
    }).length;
    // A row blocked at extraction but corrected and approved in review is published, not blocked.
    const blocked = (latest?.candidates ?? []).filter(c => c.state === "blocked" && !byId.has(c.offer.id)).length;
    return {
      providerId,
      lastAttemptAt: (attempt?.finishedAt && (!latest || attempt.finishedAt > latest.finishedAt)) ? attempt.finishedAt : latest?.finishedAt ?? null,
      lastSuccessfulImportAt: latest?.finishedAt ?? null,
      lastReviewedAt,
      // "reviewed" only when the latest run was fully read and every staged record has been decided:
      // nothing awaiting review, nothing still blocked, and at least one record published after review.
      status: !lastAttemptFailed && current.status === "needs-review" && awaiting === 0 && blocked === 0 && reviewed.length > 0
        ? "reviewed" : RUN_STATUS[current.status ?? "not-run"],
      message: germanStatusMessage({ current, latest, lastAttemptFailed, published: reviewed.length, awaiting, blocked }),
      partialCoverage: Boolean(current.partialCoverage),
      extractedCount: current.counts?.extracted ?? 0,
      // Still-unpublished blocked rows plus unreadable pages; rows corrected and published in review are excluded.
      rejectedCount: (lastAttemptFailed ? (current.counts?.blocked ?? 0) : blocked) + (current.counts?.failed ?? 0),
    };
  });
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const failure = (status: number, code: string, message: string) => json({ error: { code, message, issues: [] } }, status);

/** Run a handler and turn configuration/validation faults into the agreed error envelope (no stack traces). */
function guarded(fn: () => Response): Response {
  try { return fn(); }
  catch (error) {
    if (error instanceof ConfigError) return failure(500, "INVALID_CONFIGURATION", error.message);
    return failure(500, "INTERNAL_ERROR", "The catalogue could not be read.");
  }
}

export function getOffers(_request?: Request, now = new Date(), files = defaultFiles()): Response {
  return guarded(() => {
    const taxonomy = loadTaxonomy(files);
    const providers = loadProviderSummaries(files).providers.map(p => p.id);
    const { offers, catalogueVersion, hasDemo, publishedAt, hasPublishedFile } = loadCatalog(files, taxonomy);
    const body: CatalogResponse = {
      schemaVersion: 1,
      mode: hasDemo ? "demo" : "reviewed",
      offers: publicOffers(offers, now).filter(o => providers.includes(o.providerId)),
      generatedAt: now.toISOString(),
      catalogueVersion,
      sourceStatuses: sourceStatuses(files, providers),
      cache: { status: "cached", retrievedAt: hasPublishedFile ? publishedAt : null },
    };
    const valid = validateCatalogResponse(body, taxonomy);
    if (!valid.ok) throw new ConfigError(`Catalogue failed contract validation: ${valid.issues.slice(0, 3).map(i => `${i.path} ${i.message}`).join("; ")}`);
    return json(body);
  });
}

export function getTaxonomy(_request?: Request, files = defaultFiles()): Response {
  return guarded(() => json(loadTaxonomy(files)));
}

export function getProviders(_request?: Request, files = defaultFiles()): Response {
  return guarded(() => json(loadProviderSummaries(files)));
}

export const localDeskEnabled = () => process.env.INTEREST_ATLAS_LOCAL_DESK === "1";

/** Staged run for the review desk: selected fields, issues, notes and field evidence (no raw HTML). */
export function getLatestSourceRun(providerId: string, files = defaultFiles(), request?: Request): Response {
  const blocked = deskGate(request, false);
  if (blocked) return blocked;
  if (!/^[a-z0-9-]{1,40}$/.test(providerId)) return failure(404, "NOT_FOUND", "Not available.");
  const run = readJson<ProviderRunResult | null>(new URL(`${providerId}-latest.json`, files.runs), null);
  if (!run) return json({ schemaVersion: 1, providerId, status: "not-run", candidates: [] });
  return json({
    schemaVersion: 1,
    runId: run.runId,
    providerId: run.providerId,
    adapterVersion: run.adapterVersion,
    status: run.status,
    message: run.message,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    windowDays: run.windowDays,
    partialCoverage: run.partialCoverage,
    counts: run.counts,
    skipped: run.skipped ?? [],
    pages: run.pages.map(p => ({ url: p.url, status: p.status, kind: p.kind, error: p.error ?? null })),
    candidates: run.candidates,
  });
}
