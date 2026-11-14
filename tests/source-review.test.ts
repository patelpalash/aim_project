// Task 6/7 (PALASH-007): committed reviewed baseline, accurate lastReviewedAt, reset restores the baseline.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { validateOffer } from "../src/shared/catalog.ts";
import { DEFAULT_TAXONOMY } from "../src/shared/taxonomy.ts";
import { getOffers, sourceStatuses, type CatalogFiles } from "../src/server/catalog/read.ts";
import { approve, createSession, draftsFromCandidates, readPublished, resetDemo } from "../src/server/review/service.ts";
import type { Offer } from "../src/shared/contracts.ts";

const repo = (p: string) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), "utf8"));
const baseline = repo("catalog/reviewed-offers.json") as { offers: Offer[] };
const decisions = repo("catalog/review-decisions.json") as { decisions: { rowId: string; decision: string; evidence?: string }[] };
const now = new Date("2026-11-14T18:00:00Z");

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), "atlas-srcreview-"));
  cpSync(new URL("../data/", import.meta.url), join(dir, "data"), { recursive: true });
  rmSync(join(dir, "data", "catalog", "published-offers.json"), { force: true });
  rmSync(join(dir, "data", "review-sessions"), { recursive: true, force: true });
  const d = join(dir, "data");
  const files: CatalogFiles = {
    demo: pathToFileURL(join(d, "demo-offers.json")), published: pathToFileURL(join(d, "catalog", "published-offers.json")),
    reviewed: pathToFileURL(join(d, "catalog", "reviewed-offers.json")), runs: pathToFileURL(join(d, "source-runs") + "/"),
    taxonomy: pathToFileURL(join(d, "taxonomy.json")), providers: pathToFileURL(join(d, "providers.json")),
  };
  return { d, files };
}

test("committed baseline holds only approved, human-reviewed real records that match their decisions", () => {
  assert.equal(baseline.offers.length, 17);
  const approved = new Set(decisions.decisions.filter(x => x.decision !== "hold").map(x => x.rowId));
  for (const o of baseline.offers) {
    assert.equal(validateOffer(o, DEFAULT_TAXONOMY).ok, true, o.id);
    assert.equal(o.reviewStatus, "approved");
    assert.equal(o.source.kind, "verified");
    assert.match(o.source.url ?? "", /^https:\/\/(www\.aim-akademie\.org|www\.experimenta\.science|hdf-hn\.de)\//);
    assert.ok(o.source.verifiedAt && o.source.fetchedAt && o.source.verifiedAt >= o.source.fetchedAt, "review after retrieval");
    assert.ok(approved.has(o.id), `${o.id} has an approval decision`);
  }
  const held = decisions.decisions.filter(x => x.decision === "hold").map(x => x.rowId);
  assert.ok(held.every(id => !baseline.offers.some(o => o.id === id)), "held rows are never published");
  assert.ok(!baseline.offers.some(o => o.providerId === "ipai"), "adult-only IPAI events stay out (UMANG-001(4))");
  // Evidence-based correction was applied, not a rule guess.
  assert.deepEqual(baseline.offers.find(o => o.id === "haus-der-familie-261h207004")?.interests, ["solve-puzzles"]);
});

test("public API serves the reviewed baseline; lastReviewedAt comes from approvals, null where none", async () => {
  const { files } = sandbox();
  const body = await getOffers(undefined, now, files).json() as { mode: string; offers: Offer[]; sourceStatuses: { providerId: string; lastReviewedAt: string | null; message: string }[] };
  assert.equal(body.mode, "demo", "demo fixtures are still present");
  assert.equal(body.offers.filter(o => o.source.kind === "verified").length, 17);
  const latest = (p: string) => baseline.offers.filter(o => o.providerId === p).map(o => o.source.verifiedAt!).sort().at(-1);
  for (const p of ["aim", "experimenta", "haus-der-familie"])
    assert.equal(body.sourceStatuses.find(s => s.providerId === p)?.lastReviewedAt, latest(p));
  const ipai = body.sourceStatuses.find(s => s.providerId === "ipai")!;
  assert.equal(ipai.lastReviewedAt, null);
  assert.match(ipai.message, /0 published after human review/);
});

test("a new approval moves lastReviewedAt to that approval time; staged-only records never do", () => {
  const { d, files } = sandbox();
  const store = { dataDir: d };
  const before = sourceStatuses(files).find(s => s.providerId === "aim")!.lastReviewedAt;
  const run = JSON.parse(readFileSync(join(d, "source-runs", "aim-latest.json"), "utf8"));
  // Staging alone changes nothing.
  const s = createSession({ providerId: "aim", mode: "source", drafts: draftsFromCandidates(run.candidates), taxonomy: DEFAULT_TAXONOMY, now, store });
  assert.equal(sourceStatuses(files).find(x => x.providerId === "aim")!.lastReviewedAt, before);
  // Approving a still-unpublished ready row records the human review time.
  const target = s.rows.find(r => r.rowId === "aim-262420py")!;
  assert.notEqual(target.state, "blocked");
  approve(s.importId, { approve: true, rowIds: ["aim-262420py"], revision: s.revision }, { taxonomy: DEFAULT_TAXONOMY, now, store });
  assert.equal(sourceStatuses(files).find(x => x.providerId === "aim")!.lastReviewedAt, now.toISOString());
  assert.equal(sourceStatuses(files).find(x => x.providerId === "ipai")!.lastReviewedAt, null);
});

test("reset restores the reviewed baseline instead of emptying the catalogue", () => {
  const { d } = sandbox();
  const store = { dataDir: d };
  writeFileSync(join(d, "catalog", "published-offers.json"), JSON.stringify({ catalogueVersion: 5, publishedAt: null, offers: [] }));
  assert.equal(readPublished(store).offers.length, 0);
  const r = resetDemo(store);
  assert.equal(r.catalogueVersion, 6);
  assert.equal(readPublished(store).offers.length, 17);
});
