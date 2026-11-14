// U3/U4 acceptance (PALASH-003): 20-row fictional CSV -> 18 valid / 2 blocked -> one inline fix ->
// 19 published, one blocked row stays out -> re-import without duplicates; stale/repeat/source checks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateReviewSession } from "../src/shared/review.ts";
import { loadCatalog as loadClientCatalog } from "../src/shared/catalog-client.ts";
import { DEFAULT_TAXONOMY } from "../src/shared/taxonomy.ts";
import { parseCsv, readCsvUpload, csvRowToDraft, CsvError, CSV_TEMPLATE } from "../src/server/review/csv.ts";
import { approve, createSession, draftsFromCandidates, patchRow, readPublished, resetDemo, ReviewError, type Store } from "../src/server/review/service.ts";
import * as http from "../src/server/review/http.ts";
import { getOffers, getProviders, getTaxonomy } from "../src/server/catalog/read.ts";

const now = new Date("2026-11-14T12:00:00Z");
const csvBytes = () => new Uint8Array(readFileSync(new URL("../data/demo-upload.csv", import.meta.url)));
function sandbox(): Store {
  const dir = mkdtempSync(join(tmpdir(), "atlas-review-"));
  cpSync(new URL("../data/", import.meta.url), join(dir, "data"), { recursive: true });
  // Start from committed data only: drop local runtime state left by a dev server (git-ignored).
  rmSync(join(dir, "data", "catalog", "published-offers.json"), { force: true });
  rmSync(join(dir, "data", "review-sessions"), { recursive: true, force: true });
  return { dataDir: join(dir, "data") };
}
const uploadSession = (store: Store, mode: "demo" | "source" = "demo") => {
  const rows = readCsvUpload(csvBytes());
  const drafts = rows.map(r => { const c = csvRowToDraft(r, "aim", mode, now.toISOString()); return { rowId: c.rowKey, draft: c.offer as unknown as Record<string, unknown>, issues: c.issues, notes: c.notes }; });
  return createSession({ providerId: "aim", mode, drafts, taxonomy: DEFAULT_TAXONOMY, now, store });
};

test("CSV parser handles quotes, commas, newlines and BOM; template has the fixed header", () => {
  assert.deepEqual(parseCsv('﻿a,b\n"x, y","he said ""hi""\nnext"\n'), [["a", "b"], ["x, y", 'he said "hi"\nnext']]);
  assert.match(CSV_TEMPLATE, /^externalId,title,titleEn,/);
  assert.throws(() => readCsvUpload(new TextEncoder().encode("foo,bar\n1,2\n")), CsvError);
  assert.throws(() => readCsvUpload(new Uint8Array([0xff, 0xfe, 0x00])), /UTF-8/);
});

test("demo upload: 18 valid, 2 blocked; session matches the shared ReviewSession contract", () => {
  const store = sandbox();
  const s = uploadSession(store);
  assert.equal(s.rows.length, 20);
  assert.equal(s.counts["ready-new"], 18);
  assert.equal(s.counts.blocked, 2);
  assert.deepEqual(s.rows.filter(r => r.state === "blocked").map(r => r.rowId), ["aim-demo-csv-07", "aim-demo-csv-15"]);
  assert.ok(s.rows.find(r => r.rowId === "aim-demo-csv-07")!.issues.some(i => i.path === "startsAt"));
  assert.ok(s.rows.find(r => r.rowId === "aim-demo-csv-15")!.issues.some(i => i.path === "topics"));
  assert.equal(validateReviewSession(s).ok, true);
  const dateOnly = s.rows.find(r => r.rowId === "aim-demo-csv-04")!.candidate!;
  assert.equal(dateOnly.schedulePrecision, "date-only", "blank time stays date-only");
  assert.equal(dateOnly.startsAt, null);
  const minOnly = s.rows.find(r => r.rowId === "aim-demo-csv-03")!.candidate!;
  assert.deepEqual([minOnly.minAge, minOnly.maxAge, minOnly.ageEvidence?.kind], [12, null, "minimum-only"]);
  assert.equal(minOnly.priceEur, null, "blank price is unknown, not free");
  assert.ok(s.rows.every(r => !r.candidate || r.candidate.source.kind === "demo"));
});

test("inline fix -> 19 published, unresolved row stays unpublished, re-import adds no duplicates", async () => {
  const store = sandbox();
  let s = uploadSession(store);
  assert.equal(readPublished(store).offers.length, 0);
  s = patchRow(s.importId, "aim-demo-csv-07", { revision: 1, changes: { startDate: "2026-12-20" } }, { taxonomy: DEFAULT_TAXONOMY, now, store });
  assert.equal(s.revision, 2);
  assert.equal(s.rows.find(r => r.rowId === "aim-demo-csv-07")!.state, "ready-new");
  assert.equal(s.counts.blocked, 1);
  assert.equal(readPublished(store).offers.length, 0, "editing never publishes");

  const eligible = s.rows.filter(r => r.state !== "blocked").map(r => r.rowId);
  assert.equal(eligible.length, 19);
  const result = approve(s.importId, { approve: true, rowIds: eligible, revision: 2 }, { taxonomy: DEFAULT_TAXONOMY, now, store });
  assert.deepEqual(result, { approved: true, publishedCount: 19, blockedCount: 1, unchangedCount: 0, catalogueVersion: 1 });
  const published = readPublished(store);
  assert.equal(published.offers.length, 19);
  assert.ok(!published.offers.some(o => o.id === "aim-demo-csv-15"));
  assert.ok(published.offers.every(o => o.reviewStatus === "approved" && o.source.kind === "demo" && o.source.url === null));

  // Repeating the same approval returns the earlier result and writes nothing new.
  assert.deepEqual(approve(s.importId, { approve: true, rowIds: eligible, revision: 2 }, { taxonomy: DEFAULT_TAXONOMY, now, store }), result);
  assert.equal(readPublished(store).catalogueVersion, 1);

  // Re-import the same file: published rows are unchanged, nothing duplicates.
  const again = uploadSession(store);
  assert.equal(again.counts.unchanged, 18);
  assert.equal(again.counts.blocked, 2, "row 07 is blocked again in the original file; its published copy is untouched");
  assert.equal(readPublished(store).offers.length, 19);
});

test("blocked rows, stale revisions and stale catalogue are refused", () => {
  const store = sandbox();
  const s = uploadSession(store);
  const opts = { taxonomy: DEFAULT_TAXONOMY, now, store };
  assert.throws(() => approve(s.importId, { approve: true, rowIds: ["aim-demo-csv-15"], revision: 1 }, opts), (e: unknown) => e instanceof ReviewError && e.status === 400);
  assert.throws(() => patchRow(s.importId, "aim-demo-csv-01", { revision: 7, changes: { priceEur: 5 } }, opts), (e: unknown) => e instanceof ReviewError && e.status === 409);
  assert.throws(() => patchRow(s.importId, "aim-demo-csv-01", { revision: 1, changes: { reviewStatus: "approved" } }, opts), (e: unknown) => e instanceof ReviewError && e.code === "INVALID_PATCH");
  const other = uploadSession(store);
  approve(other.importId, { approve: true, rowIds: ["aim-demo-csv-01"], revision: 1 }, opts);
  assert.throws(() => approve(s.importId, { approve: true, rowIds: ["aim-demo-csv-02"], revision: 1 }, opts), (e: unknown) => e instanceof ReviewError && e.status === 409, "catalogue changed since preview");
  assert.throws(() => approve(s.importId, { approve: true, rowIds: ["aim-demo-csv-02"], revision: 1 }, { ...opts, now: new Date(now.getTime() + 31 * 60_000) }), (e: unknown) => e instanceof ReviewError && e.status === 404, "expired");
});

test("source mode: real scraped record goes through the same review and reaches /api/offers only after approval", async () => {
  const store = sandbox();
  const run = JSON.parse(readFileSync(join(store.dataDir, "source-runs", "aim-latest.json"), "utf8"));
  const s = createSession({ providerId: "aim", mode: "source", drafts: draftsFromCandidates(run.candidates), taxonomy: DEFAULT_TAXONOMY, now, store });
  assert.equal(validateReviewSession(s).ok, true);
  const sg = s.rows.find(r => r.rowId === "aim-271420sg")!;
  assert.equal(sg.state, "needs-review", "translation pending / derived city notes require explicit review");
  assert.ok(s.notes["aim-271420sg"].some(n => /translation pending/.test(n)));
  const blocked = s.rows.filter(r => r.state === "blocked");
  assert.ok(blocked.length > 0 && blocked.every(r => r.issues.length));

  const files = { demo: new URL(`file://${join(store.dataDir, "demo-offers.json")}`), published: new URL(`file://${join(store.dataDir, "catalog", "published-offers.json")}`),
    runs: new URL(`file://${join(store.dataDir, "source-runs")}/`), taxonomy: new URL(`file://${join(store.dataDir, "taxonomy.json")}`), providers: new URL(`file://${join(store.dataDir, "providers.json")}`) };
  const read = async () => (await getOffers(undefined, now, files).json()) as { offers: { id: string; source: { verifiedAt: string | null } }[] };
  assert.ok(!(await read()).offers.some(o => o.id === "aim-271420sg"));
  approve(s.importId, { approve: true, rowIds: ["aim-271420sg"], revision: 1 }, { taxonomy: DEFAULT_TAXONOMY, now, store });
  const pub = (await read()).offers.find(o => o.id === "aim-271420sg");
  assert.equal(pub?.source.verifiedAt, now.toISOString(), "human review time recorded at approval");
  const fetchImpl = (async (u: string | URL | Request) => String(u) === "/api/offers" ? getOffers(undefined, now, files) : String(u) === "/api/taxonomy" ? getTaxonomy(undefined, files) : getProviders(undefined, files)) as typeof fetch;
  const bundle = await loadClientCatalog({ fetchImpl });
  assert.ok(bundle.catalog.offers.some(o => o.id === "aim-271420sg" && o.reviewStatus === "approved"));

  // A source URL outside the provider's hosts is blocked.
  const bad = structuredClone(run.candidates[0]);
  bad.offer.source.url = "https://evil.example/kurs/1";
  const s2 = createSession({ providerId: "aim", mode: "source", drafts: draftsFromCandidates([bad]), taxonomy: DEFAULT_TAXONOMY, now, store });
  assert.equal(s2.rows[0].state, "blocked");
  assert.ok(s2.rows[0].issues.some(i => i.path === "sourceUrl"));
});

test("wrong provider, duplicates in one upload and reset", () => {
  const store = sandbox();
  const rows = readCsvUpload(csvBytes()).slice(0, 2);
  rows[1].values.externalId = rows[0].values.externalId;
  const drafts = rows.map(r => { const c = csvRowToDraft(r, "aim", "demo", now.toISOString()); return { rowId: c.rowKey, draft: c.offer as unknown as Record<string, unknown>, issues: c.issues, notes: c.notes }; });
  const s = createSession({ providerId: "aim", mode: "demo", drafts, taxonomy: DEFAULT_TAXONOMY, now, store });
  assert.equal(s.rows[1].state, "blocked");
  assert.ok(s.rows[1].issues.some(i => /Duplicate identity/.test(i.message)));
  assert.throws(() => createSession({ providerId: "nope", mode: "demo", drafts, taxonomy: DEFAULT_TAXONOMY, now, store }), ReviewError);
  approve(s.importId, { approve: true, rowIds: [s.rows[0].rowId], revision: 1 }, { taxonomy: DEFAULT_TAXONOMY, now, store });
  assert.equal(readPublished(store).offers.length, 1);
  assert.deepEqual(resetDemo(store), { reset: true, catalogueVersion: 2 });
  assert.equal(readPublished(store).offers.length, 0);
});

test("HTTP desk: 404 unless local flag; upload -> patch -> approve over Request/Response", async () => {
  const store = sandbox();
  const cwd = process.cwd();
  process.chdir(join(store.dataDir, ".."));
  try {
    delete process.env.INTEREST_ATLAS_LOCAL_DESK;
    assert.equal((await http.getImportTemplate()).status, 404);
    process.env.INTEREST_ATLAS_LOCAL_DESK = "1";
    const tpl = await http.getImportTemplate();
    assert.equal(tpl.headers.get("content-type"), "text/csv; charset=utf-8");
    const form = new FormData();
    form.set("file", new Blob([csvBytes()], { type: "text/csv" }), "demo-upload.csv");
    form.set("providerId", "aim");
    form.set("mode", "demo");
    const up = await http.postUpload(new Request("http://localhost/api/admin/uploads", { method: "POST", body: form }));
    assert.equal(up.status, 201);
    const session = await up.json() as { importId: string; counts: Record<string, number> };
    assert.equal(session.counts["ready-new"], 18);
    const fix = await http.patchImportRow(new Request("http://x", { method: "PATCH", body: JSON.stringify({ revision: 1, changes: { startDate: "2026-12-20" } }) }), session.importId, "aim-demo-csv-07");
    assert.equal(fix.status, 200);
    const stale = await http.patchImportRow(new Request("http://x", { method: "PATCH", body: JSON.stringify({ revision: 1, changes: { priceEur: 3 } }) }), session.importId, "aim-demo-csv-01");
    assert.equal(stale.status, 409);
    const current = await (await http.getImport(session.importId)).json() as { revision: number; rows: { rowId: string; state: string }[] };
    const ids = current.rows.filter(r => r.state !== "blocked").map(r => r.rowId);
    const ok = await http.postApprove(new Request("http://x", { method: "POST", body: JSON.stringify({ approve: true, rowIds: ids, revision: current.revision }) }), session.importId);
    assert.equal(ok.status, 200);
    assert.equal((await ok.json() as { publishedCount: number }).publishedCount, 19);
    const blocked = await http.postApprove(new Request("http://x", { method: "POST", body: JSON.stringify({ approve: true, rowIds: ["aim-demo-csv-15"], revision: current.revision }) }), session.importId);
    assert.equal(blocked.status, 400);
    assert.equal((await http.postReset(new Request("http://x", { method: "POST", body: "{}" }))).status, 400);
    assert.equal((await http.postReset(new Request("http://x", { method: "POST", body: JSON.stringify({ resetDemo: true }) }))).status, 200);
  } finally {
    delete process.env.INTEREST_ATLAS_LOCAL_DESK;
    process.chdir(cwd);
  }
});
