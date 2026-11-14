/**
 * Apply recorded source-review decisions (data/catalog/review-decisions.json) through the normal
 * review service and write the committed reviewed baseline (data/catalog/reviewed-offers.json).
 *
 *   node src/server/review/apply-review.ts [--dry-run] [--fresh]
 * Builds on the committed baseline (unchanged records keep their review time); --fresh starts empty.
 *
 * Safety: a row is approved only if the latest staged run still shows exactly the facts the
 * reviewer checked (start, fee, availability, title). Anything else is held and reported, so a
 * changed source page always needs a fresh review. Held rows are never published.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTaxonomy } from "../catalog/read.ts";
import type { ProviderRunResult } from "../scraping/types.ts";
import { approve, createSession, draftsFromCandidates, patchRow, readPublished } from "./service.ts";

interface Decision {
  rowId: string;
  decision: "approve" | "correct-and-approve" | "hold";
  expect?: { startsAt: string | null; priceEur: number | null; availability: string; titleDe: string };
  changes?: Record<string, unknown>;
  reason: string;
  evidence?: string;
}
interface DecisionFile { reviewer: string; basis: Record<string, string>; method: string; decisions: Decision[] }

const DATA = join(process.cwd(), "data");
const dryRun = process.argv.includes("--dry-run");
const doc = JSON.parse(readFileSync(join(DATA, "catalog", "review-decisions.json"), "utf8")) as DecisionFile;
const taxonomy = loadTaxonomy();
const now = new Date();
// Work in a scratch store seeded with the committed baseline (never the runtime catalogue), so records
// that are already published unchanged keep their original human review time.
const store = { dataDir: mkdtempSync(join(tmpdir(), "atlas-apply-review-")) };
const baselineFile = join(DATA, "catalog", "reviewed-offers.json");
const fresh = process.argv.includes("--fresh");
mkdirSync(join(store.dataDir, "catalog"), { recursive: true });
if (!fresh && existsSync(baselineFile)) writeFileSync(join(store.dataDir, "catalog", "published-offers.json"), readFileSync(baselineFile, "utf8"));

const report = { reviewer: doc.reviewer, appliedAt: now.toISOString(), basis: doc.basis, approved: [] as unknown[], held: [] as unknown[] };
const byProvider = new Map<string, Decision[]>();
for (const d of doc.decisions) {
  const provider = d.rowId.startsWith("haus-der-familie-") ? "haus-der-familie" : d.rowId.split("-")[0];
  byProvider.set(provider, [...(byProvider.get(provider) ?? []), d]);
}

for (const [providerId, decisions] of byProvider) {
  const run = JSON.parse(readFileSync(join(DATA, "source-runs", `${providerId}-latest.json`), "utf8")) as ProviderRunResult;
  if (doc.basis[providerId] && doc.basis[providerId] !== run.runId)
    console.warn(`! ${providerId}: decisions were made on ${doc.basis[providerId]}, latest run is ${run.runId}; facts are re-checked per row.`);
  const wanted = decisions.filter(d => d.decision !== "hold");
  for (const d of decisions.filter(d => d.decision === "hold")) report.held.push({ rowId: d.rowId, reason: d.reason, evidence: d.evidence ?? null });
  if (!wanted.length) continue;

  let session = createSession({ providerId, mode: "source", drafts: draftsFromCandidates(run.candidates), taxonomy, now, store });
  const approveIds: string[] = [];
  for (const d of wanted) {
    const row = session.rows.find(r => r.rowId === d.rowId);
    const offer = row?.candidate ?? (row?.draft as { startsAt?: string | null; priceEur?: number | null; availability?: string; title?: { de?: string } } | undefined);
    const same = !!offer && !!d.expect && offer.startsAt === d.expect.startsAt && offer.priceEur === d.expect.priceEur &&
      offer.availability === d.expect.availability && offer.title?.de === d.expect.titleDe;
    if (!row || !same) { report.held.push({ rowId: d.rowId, reason: "Source facts changed or row missing since review; needs a fresh review.", evidence: null }); continue; }
    if (d.decision === "correct-and-approve" && d.changes)
      session = patchRow(session.importId, d.rowId, { revision: session.revision, changes: d.changes }, { taxonomy, now, store });
    const after = session.rows.find(r => r.rowId === d.rowId)!;
    if (after.state === "unchanged") {
      report.approved.push({ rowId: d.rowId, decision: "already-published", reason: "Published earlier with identical facts; original review time kept.", evidence: null, changes: null });
      continue;
    }
    if (after.state === "blocked" || !after.candidate) {
      report.held.push({ rowId: d.rowId, reason: `Not publishable after review (${after.state}: ${after.issues.map(i => i.message).join("; ")})`, evidence: null });
      continue;
    }
    approveIds.push(d.rowId);
  }
  if (approveIds.length) {
    approve(session.importId, { approve: true, rowIds: approveIds, revision: session.revision }, { taxonomy, now, store });
    for (const id of approveIds) {
      const d = wanted.find(x => x.rowId === id)!;
      report.approved.push({ rowId: id, decision: d.decision, reason: d.reason, evidence: d.evidence ?? null, changes: d.changes ?? null });
    }
  }
}

const published = readPublished(store);
const real = published.offers.filter(o => o.source.kind === "verified");
console.log(`approved ${report.approved.length}, held ${report.held.length}, real records in baseline ${real.length}`);
for (const h of report.held as { rowId: string; reason: string }[]) console.log(`  hold ${h.rowId}: ${h.reason.slice(0, 110)}`);
if (!dryRun) {
  const write = (name: string, body: unknown) => {
    const file = join(DATA, "catalog", name);
    writeFileSync(`${file}.tmp`, `${JSON.stringify(body, null, 2)}\n`, "utf8");
    renameSync(`${file}.tmp`, file);
  };
  write("reviewed-offers.json", { catalogueVersion: published.catalogueVersion, publishedAt: published.publishedAt, reviewer: doc.reviewer, offers: real });
  write("review-report.json", report);
  console.log("wrote data/catalog/reviewed-offers.json and data/catalog/review-report.json");
}
