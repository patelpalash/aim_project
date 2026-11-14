/**
 * Read side of the catalogue (U1). Framework-neutral Web `Request`/`Response` handlers so
 * Palash can mount them as Next.js route handlers without changes.
 *
 * Public:  GET /api/offers           – approved, not cancelled, not ended offers only.
 * Local:   GET /api/admin/source-runs/:providerId/latest – staged candidates for review;
 *          404 unless INTEREST_ATLAS_LOCAL_DESK=1 (writable/maintenance routes stay local).
 */
import { existsSync, readFileSync } from "node:fs";
import { validateOffer } from "../../shared/catalog.ts";
import type { Offer } from "../../shared/contracts.ts";
import type { ProviderRunResult } from "../scraping/types.ts";

const DATA = new URL("../../../data/", import.meta.url);

export interface CatalogFiles {
  demo: URL;
  /** Reviewed provider records written by the (planned, U4) approval service. */
  published: URL;
  runs: URL;
}

export const defaultFiles = (): CatalogFiles => ({
  demo: new URL("demo-offers.json", DATA),
  published: new URL("catalog/published-offers.json", DATA),
  runs: new URL("source-runs/", DATA),
});

const readJson = <T>(file: URL, fallback: T): T => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback);

/** Load demo + published records; anything that fails validation is dropped, never repaired silently. */
export function loadCatalog(files: CatalogFiles = defaultFiles()): { offers: Offer[]; catalogueVersion: number; hasDemo: boolean } {
  const published = readJson<{ catalogueVersion: number; offers: unknown[] }>(files.published, { catalogueVersion: 0, offers: [] });
  const offers: Offer[] = [];
  for (const raw of [...readJson<unknown[]>(files.demo, []), ...published.offers]) {
    const v = validateOffer(raw);
    if (v.ok) offers.push(v.offer);
  }
  return { offers, catalogueVersion: published.catalogueVersion, hasDemo: offers.some(o => o.source.kind === "demo") };
}

/** Publication/time gate only; audience filtering stays client-side so parent/school data is not lost. */
export function publicOffers(offers: readonly Offer[], now: Date): Offer[] {
  return offers.filter(o => {
    if (o.reviewStatus !== "approved" || o.availability === "cancelled") return false;
    if (o.source.kind === "verified" && !o.source.verifiedAt) return false;
    const expiry = o.endsAt ?? o.startsAt;
    return !expiry || Date.parse(expiry) >= now.getTime();
  });
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export function getOffers(_request?: Request, now = new Date(), files = defaultFiles()): Response {
  const { offers, catalogueVersion, hasDemo } = loadCatalog(files);
  return json({
    schemaVersion: 1,
    mode: hasDemo ? "demo" : "reviewed",
    offers: publicOffers(offers, now),
    generatedAt: now.toISOString(),
    catalogueVersion,
  });
}

export const localDeskEnabled = () => process.env.INTEREST_ATLAS_LOCAL_DESK === "1";

const notFound = () => json({ error: { code: "NOT_FOUND", message: "Not available.", issues: [] } }, 404);

/** Staged run for the review desk: selected fields, issues, notes and field evidence (no raw HTML). */
export function getLatestSourceRun(providerId: string, files = defaultFiles()): Response {
  if (!localDeskEnabled()) return notFound();
  if (!/^[a-z0-9-]{1,40}$/.test(providerId)) return notFound();
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
    pages: run.pages.map(p => ({ url: p.url, status: p.status, kind: p.kind, error: p.error ?? null })),
    candidates: run.candidates,
  });
}
