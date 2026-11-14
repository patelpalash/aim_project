// U5: desk summary, theme/source maintenance, and inline-edit semantics used by Ishan's desk.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateTaxonomy } from "../src/shared/taxonomy.ts";
import { DEFAULT_TAXONOMY } from "../src/shared/taxonomy.ts";
import { changeProvider, changeTaxonomy, ConfigChangeError, providerViews } from "../src/server/config/maintenance.ts";
import { csvRowToDraft, readCsvUpload } from "../src/server/review/csv.ts";
import { createSession, patchRow } from "../src/server/review/service.ts";
import * as http from "../src/server/review/http.ts";

const now = new Date("2026-11-14T12:00:00Z");
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), "atlas-maint-"));
  cpSync(new URL("../data/", import.meta.url), join(dir, "data"), { recursive: true });
  rmSync(join(dir, "data", "catalog", "published-offers.json"), { force: true });
  rmSync(join(dir, "data", "review-sessions"), { recursive: true, force: true });
  return join(dir, "data");
}
const read = (dir: string, f: string) => JSON.parse(readFileSync(join(dir, f), "utf8"));

test("themes: add a new theme and interest, relabel and disable; IDs are never removed", () => {
  const dir = sandbox();
  const v1 = read(dir, "taxonomy.json").version;
  let t = changeTaxonomy({ kind: "topic", id: "robotics", label: { de: "Robotik", en: "Robotics" } }, dir);
  assert.equal(t.version, v1 + 1);
  t = changeTaxonomy({ kind: "interest", id: "build-robots", label: { de: "Roboter bauen", en: "Build robots" }, topicIds: ["robotics", "coding"] }, dir);
  t = changeTaxonomy({ kind: "topic", id: "gaming", enabled: false }, dir);
  t = changeTaxonomy({ kind: "topic", id: "ai", label: { de: "Künstliche Intelligenz", en: "Artificial intelligence" } }, dir);
  assert.equal(validateTaxonomy(read(dir, "taxonomy.json")).ok, true);
  assert.deepEqual(t.topics.map(x => x.id), ["ai", "coding", "gaming", "robotics"]);
  assert.equal(t.topics.find(x => x.id === "gaming")?.enabled, false);
  assert.throws(() => changeTaxonomy({ kind: "interest", id: "x-y", label: { de: "X", en: "X" }, topicIds: ["nope"] }, dir), ConfigChangeError);
  assert.throws(() => changeTaxonomy({ kind: "topic", id: "Bad ID" }, dir), ConfigChangeError);
  assert.throws(() => changeTaxonomy({ kind: "topic", id: "new-one" }, dir), /needs a German and English label/);
});

test("sources: edit/disable existing, add a CSV-only source, scraping scope cannot widen", () => {
  const dir = sandbox();
  changeProvider({ id: "ipai", enabled: false }, dir);
  assert.equal(read(dir, "providers.json").find((p: { id: string }) => p.id === "ipai").enabled, false);
  assert.throws(() => changeProvider({ id: "aim", discoveryUrl: "https://evil.example/kurse" }, dir), /must stay on/);
  assert.throws(() => changeProvider({ id: "aim", allowedHosts: ["www.aim-akademie.org", "evil.example"] }, dir), /scraping scope/);
  const added = changeProvider({ id: "stadtbibliothek", name: "Stadtbibliothek Heilbronn", discoveryUrl: "https://www.stadtbibliothek.example/veranstaltungen" }, dir);
  assert.equal(added.created, true);
  assert.equal(added.provider.importMode, "csv-only");
  const views = providerViews(["aim", "experimenta", "haus-der-familie", "ipai"], dir);
  assert.equal(views.find(p => p.id === "stadtbibliothek")?.adapter, "none");
  assert.equal(views.find(p => p.id === "aim")?.adapter, "implemented");
  assert.throws(() => changeProvider({ id: "x", name: "X", discoveryUrl: "http://x.example" }, dir), /https/);
});

test("desk edits from simple fields keep the record valid (date move keeps times; age evidence follows bounds)", () => {
  const dir = sandbox();
  const store = { dataDir: dir };
  const rows = readCsvUpload(new Uint8Array(readFileSync(join(dir, "demo-upload.csv"))));
  const drafts = rows.map(r => { const c = csvRowToDraft(r, "aim", "demo", now.toISOString()); return { rowId: c.rowKey, draft: c.offer as unknown as Record<string, unknown>, issues: c.issues, notes: c.notes }; });
  const opts = { taxonomy: DEFAULT_TAXONOMY, now, store };
  let s = createSession({ providerId: "aim", mode: "demo", drafts, taxonomy: DEFAULT_TAXONOMY, now, store });
  // Row 01 is timed (14:00-16:00): the desk sends only startDate.
  s = patchRow(s.importId, "aim-demo-csv-01", { revision: s.revision, changes: { startDate: "2026-12-18" } }, opts);
  const r1 = s.rows.find(r => r.rowId === "aim-demo-csv-01")!;
  assert.equal(r1.state, "ready-new");
  assert.equal(r1.candidate?.startsAt, "2026-12-18T14:00:00+01:00");
  assert.equal(r1.candidate?.endsAt, "2026-12-18T16:00:00+01:00");
  // Row 02 is "9–12 Jahre": clearing the maximum makes it minimum-only, not an invalid range.
  s = patchRow(s.importId, "aim-demo-csv-02", { revision: s.revision, changes: { maxAge: null } }, opts);
  const r2 = s.rows.find(r => r.rowId === "aim-demo-csv-02")!;
  assert.equal(r2.state, "ready-new");
  assert.deepEqual([r2.candidate?.minAge, r2.candidate?.maxAge, r2.candidate?.ageEvidence?.kind], [9, null, "minimum-only"]);
  // Row 04 is date-only: the edit keeps it date-only.
  s = patchRow(s.importId, "aim-demo-csv-04", { revision: s.revision, changes: { startDate: "2026-12-30" } }, opts);
  const r4 = s.rows.find(r => r.rowId === "aim-demo-csv-04")!;
  assert.deepEqual([r4.candidate?.schedulePrecision, r4.candidate?.startDate, r4.candidate?.startsAt], ["date-only", "2026-12-30", null]);
});

test("HTTP: summary, topics and providers routes (local desk only)", async () => {
  const dir = sandbox();
  const cwd = process.cwd();
  process.chdir(join(dir, ".."));
  try {
    delete process.env.INTEREST_ATLAS_LOCAL_DESK;
    assert.equal((await http.getSummary()).status, 404);
    process.env.INTEREST_ATLAS_LOCAL_DESK = "1";
    const summary = await (await http.getSummary()).json() as { mode: string; sourceStatuses: unknown[]; gaps: { interest: string; synthetic: boolean; exampleRequests: number }[] };
    assert.equal(summary.mode, "demo");
    assert.equal(summary.sourceStatuses.length, 4);
    assert.ok(summary.gaps.length >= 5 && summary.gaps.every(g => g.synthetic === true));
    const bad = await http.postTopic(new Request("http://x", { method: "POST", body: JSON.stringify({ kind: "topic", id: "x" }) }));
    assert.equal(bad.status, 400);
    assert.equal((await bad.json() as { error: { code: string } }).error.code, "INVALID_CONFIGURATION_CHANGE");
    const ok = await http.postTopic(new Request("http://x", { method: "POST", body: JSON.stringify({ kind: "topic", id: "robotics", label: { de: "Robotik", en: "Robotics" } }) }));
    assert.equal(ok.status, 200);
    const prov = await http.postAdminProvider(new Request("http://x", { method: "POST", body: JSON.stringify({ id: "stadtbibliothek", name: "Stadtbibliothek", discoveryUrl: "https://www.stadtbibliothek.example/" }) }));
    assert.equal(prov.status, 201);
    assert.match((await prov.json() as { note: string }).note, /CSV-only/);
    const list = await (await http.getAdminProviders()).json() as { providers: { id: string; adapter: string }[] };
    assert.equal(list.providers.find(p => p.id === "stadtbibliothek")?.adapter, "none");
  } finally {
    delete process.env.INTEREST_ATLAS_LOCAL_DESK;
    process.chdir(cwd);
  }
});
