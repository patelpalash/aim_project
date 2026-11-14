// Task 6/7 (PALASH-007): committed reviewed baseline, accurate lastReviewedAt, reset restores the baseline.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
const now = new Date("2026-11-14T23:00:00Z"); // later than every baseline review time

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), "atlas-srcreview-"));
  cpSync(new URL("../data/", import.meta.url), join(dir, "data"), { recursive: true });
  rmSync(join(dir, "data", "catalog", "published-offers.json"), { force: true });
  rmSync(join(dir, "data", "review-sessions"), { recursive: true, force: true });
  // Runtime attempt markers are git-ignored but live in data/, so a failed local refresh would
  // otherwise leak into this fixture and report a provider as "error".
  for (const f of readdirSync(join(dir, "data", "source-runs")))
    if (f.endsWith("-last-attempt.json")) rmSync(join(dir, "data", "source-runs", f), { force: true });
  const d = join(dir, "data");
  const files: CatalogFiles = {
    demo: pathToFileURL(join(d, "demo-offers.json")), published: pathToFileURL(join(d, "catalog", "published-offers.json")),
    reviewed: pathToFileURL(join(d, "catalog", "reviewed-offers.json")), runs: pathToFileURL(join(d, "source-runs") + "/"),
    taxonomy: pathToFileURL(join(d, "taxonomy.json")), providers: pathToFileURL(join(d, "providers.json")),
  };
  return { d, files };
}

test("committed baseline holds only approved, human-reviewed real records that match their decisions", () => {
  assert.equal(baseline.offers.length, 19);
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
  assert.equal(body.offers.filter(o => o.source.kind === "verified").length, 19);
  const latest = (p: string) => baseline.offers.filter(o => o.providerId === p).map(o => o.source.verifiedAt!).sort().at(-1);
  for (const p of ["aim", "experimenta", "haus-der-familie"])
    assert.equal(body.sourceStatuses.find(s => s.providerId === p)?.lastReviewedAt, latest(p));
  const ipai = body.sourceStatuses.find(s => s.providerId === "ipai")!;
  assert.equal(ipai.lastReviewedAt, null);
  assert.match(ipai.message, /Prüfung: 0 nach menschlicher Prüfung veröffentlicht/);
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
  assert.equal(readPublished(store).offers.length, 19);
});

test("re-review after taxonomy v3: two held aim courses approved with evidence; earlier review times untouched", () => {
  const byId = new Map(baseline.offers.map(o => [o.id, o]));
  assert.deepEqual(byId.get("aim-271430cyc1")?.interests, ["build-worlds"]);
  assert.deepEqual(byId.get("aim-271420fe")?.interests, ["build-apps"]);
  const d = new Map(decisions.decisions.map(x => [x.rowId, x]));
  assert.match(d.get("aim-271430cyc1")?.evidence ?? "", /Sandbox-Welt von Luanti/);
  assert.match(d.get("aim-271420fe")?.evidence ?? "", /Messenger Web-App/);
  const first = byId.get("aim-271420sg")!.source.verifiedAt!;
  assert.ok(byId.get("aim-271430cyc1")!.source.verifiedAt! > first, "new approval has its own, later review time");
  const times = new Set(baseline.offers.filter(o => !["aim-271430cyc1", "aim-271420fe"].includes(o.id)).map(o => o.source.verifiedAt));
  assert.equal(times.size, 1, "the 17 earlier records keep their single original review time");
});

test("future runs tag the new interests from source wording", async () => {
  const { matchInterests } = await import("../src/server/normalize/rules.ts");
  assert.ok(matchInterests("eine smarte Stadt in der Sandbox-Welt von Luanti").some(h => h.value === "build-worlds"));
  assert.ok(matchInterests("baust deine eigene Messenger Web-App").some(h => h.value === "build-apps"));
  assert.ok(!matchInterests("Programmieren lernen mit Python").some(h => h.value === "build-apps"));
});

test("ISH-REQ-3: source status messages are German and built from structured run data", async () => {
  const { germanStatusMessage } = await import("../src/server/catalog/read.ts");
  const run = (o: object) => ({ status: "needs-review", windowDays: 90, pageCap: 20, pages: [], partialCoverage: false,
    counts: { listed: 0, outOfScope: 0, outsideWindow: 0, extracted: 0, ready: 0, blocked: 0, failed: 0 }, ...o }) as never;
  const capped = run({ status: "partial", partialCoverage: true, pages: new Array(20).fill({}), counts: { ready: 9, blocked: 6, failed: 0 } });
  assert.equal(germanStatusMessage({ current: capped, latest: capped, lastAttemptFailed: false, published: 8, awaiting: 1, blocked: 6 }),
    "15 Angebote zur Prüfung bereitgestellt (9 prüfbereit, 6 mit Korrekturbedarf). Abdeckung unvollständig: Seitenlimit erreicht. " +
    "Prüfung: 8 nach menschlicher Prüfung veröffentlicht, 1 bereitgestellt, aber nicht veröffentlicht (wartet auf Prüfung oder zurückgestellt), 6 blockiert.");
  assert.match(germanStatusMessage({ current: run({ status: "empty", windowDays: 90 }), latest: null, lastAttemptFailed: false, published: 0, awaiting: 0, blocked: 0 }),
    /^Quelle gelesen; in den nächsten 90 Tagen gibt es keine passenden Angebote/);
  assert.match(germanStatusMessage({ current: run({ status: "failed" }), latest: null, lastAttemptFailed: true, published: 0, awaiting: 0, blocked: 0 }),
    /^Die Quelle konnte nicht gelesen werden; der veröffentlichte Katalog bleibt unverändert\.$/);
  const one = run({ counts: { ready: 1, blocked: 0, failed: 0 } });
  assert.match(germanStatusMessage({ current: one, latest: one, lastAttemptFailed: false, published: 1, awaiting: 0, blocked: 0 }), /^1 Angebot zur Prüfung bereitgestellt/);
  // The live statuses contain no English run-log sentence.
  const { files } = sandbox();
  for (const s of sourceStatuses(files)) assert.doesNotMatch(s.message, /candidate|staged for|published after|Page cap/, s.providerId);
});

test("rows blocked at extraction but corrected and published in review are not counted as blocked", () => {
  const { files } = sandbox();
  const msg = (p: string) => sourceStatuses(files).find(s => s.providerId === p)!.message;
  // aim: 6 blocked in the run, 2 of them (Craft Your City, Code your Chat) corrected and published.
  assert.match(msg("aim"), /8 nach menschlicher Prüfung veröffentlicht, 3 bereitgestellt, aber nicht veröffentlicht .*, 4 blockiert\./);
  // Haus der Familie: 3 blocked in the run, the two Data Literacy workshops corrected and published.
  assert.match(msg("haus-der-familie"), /10 nach menschlicher Prüfung veröffentlicht, 0 bereitgestellt, .*, 1 blockiert\./);
  assert.match(msg("ipai"), /0 nach menschlicher Prüfung veröffentlicht, 0 bereitgestellt, .*, 4 blockiert\./);
});

test("status and rejectedCount reflect review outcomes, conservatively", () => {
  const { files } = sandbox();
  const st = (p: string) => sourceStatuses(files).find(s => s.providerId === p)!;
  assert.equal(st("experimenta").status, "reviewed", "its one staged record is published; nothing awaits or is blocked");
  assert.equal(st("experimenta").rejectedCount, 0);
  assert.equal(st("haus-der-familie").status, "review-needed", "one online record is still blocked");
  assert.equal(st("haus-der-familie").rejectedCount, 1);
  assert.equal(st("aim").status, "partial", "page cap: coverage stays explicitly incomplete");
  assert.equal(st("aim").rejectedCount, 4);
  assert.equal(st("ipai").status, "review-needed");
  assert.equal(st("ipai").rejectedCount, 4);
  assert.equal(st("ipai").lastReviewedAt, null);
});
