// PALASH-002 acceptance: the three public handlers feed the shared `loadCatalog` client unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadCatalog as loadClientCatalog, CatalogLoadError } from "../src/shared/catalog-client.ts";
import { getLatestSourceRun, getOffers, getProviders, getTaxonomy, sourceStatuses, type CatalogFiles } from "../src/server/catalog/read.ts";
import type { Offer } from "../src/shared/contracts.ts";

const now = new Date("2026-11-14T10:00:00Z");
const repo = (p: string) => new URL(`../data/${p}`, import.meta.url);

function sandbox(): { dir: string; files: CatalogFiles } {
  const dir = mkdtempSync(join(tmpdir(), "atlas-api-"));
  mkdirSync(join(dir, "runs"));
  mkdirSync(join(dir, "catalog"));
  for (const f of ["demo-offers.json", "taxonomy.json", "providers.json"]) copyFileSync(repo(f), join(dir, f));
  return {
    dir,
    files: {
      demo: pathToFileURL(join(dir, "demo-offers.json")),
      published: pathToFileURL(join(dir, "catalog", "published-offers.json")),
      runs: pathToFileURL(join(dir, "runs") + "/"),
      taxonomy: pathToFileURL(join(dir, "taxonomy.json")),
      providers: pathToFileURL(join(dir, "providers.json")),
    },
  };
}

/** Route the client's three relative URLs to the server handlers (what Next does in the app). */
const viaHandlers = (files: CatalogFiles) => (async (url: string | URL | Request) => {
  const path = String(url);
  if (path === "/api/offers") return getOffers(undefined, now, files);
  if (path === "/api/taxonomy") return getTaxonomy(undefined, files);
  if (path === "/api/providers") return getProviders(undefined, files);
  return new Response("not found", { status: 404 });
}) as typeof fetch;

test("shared loadCatalog accepts the real /api/offers, /api/taxonomy and /api/providers responses", async () => {
  const { files } = sandbox();
  const bundle = await loadClientCatalog({ fetchImpl: viaHandlers(files) });
  assert.equal(bundle.catalog.mode, "demo");
  assert.equal(bundle.catalog.schemaVersion, 1);
  assert.ok(bundle.catalog.offers.length > 0);
  assert.ok(bundle.catalog.offers.every(o => o.reviewStatus === "approved"));
  assert.deepEqual(bundle.providers.map(p => p.id), ["aim", "experimenta", "haus-der-familie", "ipai"]);
  assert.deepEqual(bundle.taxonomy.topics.map(t => t.id), ["ai", "coding", "gaming"]);
  assert.equal(bundle.catalog.sourceStatuses?.length, 4);
  assert.ok(bundle.catalog.sourceStatuses?.every(s => s.status === "not-run"), "no run files in the sandbox");
  assert.deepEqual(bundle.catalog.cache, { status: "cached", retrievedAt: null });
});

test("staged (pending) scraped candidates never appear on /api/offers; a reviewed record does", async () => {
  const { files, dir } = sandbox();
  const aim = JSON.parse(await (await import("node:fs/promises")).readFile(repo("source-runs/aim-latest.json"), "utf8"));
  writeFileSync(join(dir, "runs", "aim-latest.json"), JSON.stringify(aim));
  let body = await getOffers(undefined, now, files).json() as { offers: Offer[]; sourceStatuses: { providerId: string; status: string; extractedCount: number }[] };
  assert.ok(!body.offers.some(o => o.source.kind === "verified"));
  const aimStatus = body.sourceStatuses.find(s => s.providerId === "aim")!;
  assert.equal(aimStatus.status, "partial");
  assert.ok(aimStatus.extractedCount > 0);

  // Simulate what U4 approval will write: one candidate approved with a human review time.
  const candidate = aim.candidates.find((c: { offer: Offer }) => c.offer.externalId === "271420SG").offer as Offer;
  const approved: Offer = { ...candidate, reviewStatus: "approved", source: { ...candidate.source, verifiedAt: "2026-11-14T09:30:00.000Z" } };
  writeFileSync(join(dir, "catalog", "published-offers.json"), JSON.stringify({ catalogueVersion: 1, publishedAt: "2026-11-14T09:30:00.000Z", offers: [approved] }));
  const bundle = await loadClientCatalog({ fetchImpl: viaHandlers(files) });
  const real = bundle.catalog.offers.filter(o => o.source.kind === "verified");
  assert.deepEqual(real.map(o => o.id), ["aim-271420sg"]);
  assert.equal(bundle.catalog.catalogueVersion, 1);
  assert.equal(bundle.catalog.mode, "demo", "demo fixtures are still present, so the mode stays demo");
  body = await getOffers(undefined, now, files).json() as typeof body;
  assert.equal(body.offers.filter(o => o.source.kind === "verified").length, 1);
});

test("a failed latest refresh is reported as error but the last good run still counts", () => {
  const { files, dir } = sandbox();
  writeFileSync(join(dir, "runs", "ipai-latest.json"), JSON.stringify({ status: "needs-review", finishedAt: "2026-11-14T08:00:00.000Z", message: "4 staged", partialCoverage: false, counts: { extracted: 4, blocked: 4, failed: 0 } }));
  writeFileSync(join(dir, "runs", "ipai-last-attempt.json"), JSON.stringify({ status: "failed", finishedAt: "2026-11-14T09:00:00.000Z", message: "HTTP 503", partialCoverage: true, counts: { extracted: 0, blocked: 0, failed: 0 } }));
  const s = sourceStatuses(files).find(x => x.providerId === "ipai")!;
  assert.equal(s.status, "error");
  assert.equal(s.lastAttemptAt, "2026-11-14T09:00:00.000Z");
  assert.equal(s.lastSuccessfulImportAt, "2026-11-14T08:00:00.000Z");
  assert.match(s.message, /last good staged run/);
});

test("invalid configuration is an explicit error envelope, and the client reports it as such", async () => {
  const { files, dir } = sandbox();
  writeFileSync(join(dir, "taxonomy.json"), JSON.stringify({ version: 0, topics: [], interests: [] }));
  const res = getTaxonomy(undefined, files);
  assert.equal(res.status, 500);
  const body = await res.json() as { error: { code: string } };
  assert.equal(body.error.code, "INVALID_CONFIGURATION");
  await assert.rejects(loadClientCatalog({ fetchImpl: viaHandlers(files) }), (e: unknown) => e instanceof CatalogLoadError && e.code === "http");
});

test("disabled providers disappear from /api/providers and their offers from /api/offers", async () => {
  const { files, dir } = sandbox();
  const providers = JSON.parse(await (await import("node:fs/promises")).readFile(join(dir, "providers.json"), "utf8")) as { id: string; enabled: boolean }[];
  providers.find(p => p.id === "ipai")!.enabled = false;
  writeFileSync(join(dir, "providers.json"), JSON.stringify(providers));
  const bundle = await loadClientCatalog({ fetchImpl: viaHandlers(files) });
  assert.ok(!bundle.providers.some(p => p.id === "ipai"));
  assert.ok(!bundle.catalog.offers.some(o => o.providerId === "ipai"));
});

test("review desk read is local-only and rejects path tricks", () => {
  const { files, dir } = sandbox();
  delete process.env.INTEREST_ATLAS_LOCAL_DESK;
  assert.equal(getLatestSourceRun("aim", files).status, 404);
  process.env.INTEREST_ATLAS_LOCAL_DESK = "1";
  try {
    writeFileSync(join(dir, "runs", "aim-latest.json"), JSON.stringify({ runId: "r", providerId: "aim", adapterVersion: "t", status: "needs-review",
      message: "m", startedAt: "", finishedAt: "", windowDays: 90, pageCap: 20, partialCoverage: false, pages: [], counts: {}, skipped: [], candidates: [] }));
    assert.equal(getLatestSourceRun("aim", files).status, 200);
    assert.equal(getLatestSourceRun("../etc", files).status, 404);
  } finally {
    delete process.env.INTEREST_ATLAS_LOCAL_DESK;
  }
});
