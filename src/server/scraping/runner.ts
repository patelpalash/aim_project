/**
 * Bounded provider runs. Runs outside visitor requests; results are staged for review,
 * never published automatically. A failed/partial run never removes published records.
 */
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeRecord } from "../normalize/to-offer.ts";
import { PageCapReached, ProviderFetcher, type FetcherOptions } from "./fetcher.ts";
import { getProvider, loadProviders, type ProviderConfig } from "./providers.ts";
import type { Candidate, PageLog, ProviderRunResult, SourceRecord } from "./types.ts";

export type SkipKind = "outOfScope" | "outsideWindow" | "ended";

export interface AdapterContext {
  provider: ProviderConfig;
  now: Date;
  windowDays: number;
  /** Epoch ms of the end of the coverage window. */
  horizon: number;
  fetch(url: string, kind: PageLog["kind"]): Promise<{ finalUrl: string; html: string }>;
  /** A listing/discovery resource was read and recognised. */
  listingOk(count: number): void;
  skip(externalId: string, title: string, reason: string, kind: SkipKind): void;
  emit(record: SourceRecord): void;
  /** One record could not be extracted (layout/cross-check failure). */
  fail(message: string): void;
  /** A discovery resource failed or was not recognised (marks coverage partial). */
  error(message: string): void;
  /** Informational note for the maintainer that does not reduce coverage. */
  note(message: string): void;
}

export interface ProviderAdapter {
  providerId: string;
  version: string;
  collect(ctx: AdapterContext): Promise<void>;
}

export interface RunOptions extends FetcherOptions {
  now?: Date;
  windowDays?: number;
  providers?: ProviderConfig[];
}

const DAY = 86_400_000;

/** Rethrow page-cap signals so the runner can mark coverage partial; record anything else. */
export function recordFailure(ctx: AdapterContext, label: string, error: unknown): void {
  if (error instanceof PageCapReached) throw error;
  ctx.fail(`${label}: ${error instanceof Error ? error.message : String(error)}`);
}

export async function runProvider(adapter: ProviderAdapter, options: RunOptions = {}): Promise<ProviderRunResult> {
  const provider = getProvider(adapter.providerId, options.providers ?? loadProviders());
  const now = options.now ?? new Date();
  const windowDays = options.windowDays ?? provider.scraping?.windowDays ?? 90;
  const fetcher = new ProviderFetcher(provider, options);
  const startedAt = new Date().toISOString();
  const runId = `${provider.id}-${startedAt.replace(/[-:.]/g, "").slice(0, 15)}`;
  const counts = { listed: 0, outOfScope: 0, outsideWindow: 0, extracted: 0, ready: 0, blocked: 0, failed: 0 };
  const skipped: ProviderRunResult["skipped"] = [];
  const errors: string[] = [];
  const infos: string[] = [];
  const candidates: Candidate[] = [];
  let listingsOk = 0;
  let capHit = false;

  const ctx: AdapterContext = {
    provider, now, windowDays, horizon: now.getTime() + windowDays * DAY,
    fetch: (url, kind) => fetcher.get(url, kind),
    listingOk: count => { listingsOk++; counts.listed += count; },
    skip: (externalId, title, reason, kind) => {
      if (kind === "outOfScope") counts.outOfScope++;
      if (kind === "outsideWindow") counts.outsideWindow++;
      skipped.push({ externalId, title, reason });
    },
    emit: record => {
      counts.extracted++;
      const candidate = normalizeRecord(record, now);
      if (candidate.timing === "ended") { skipped.push({ externalId: record.externalId, title: record.title, reason: "All sessions have ended" }); return; }
      if (candidate.state !== "out-of-scope" && candidate.offer.topics.length === 0) {
        counts.outOfScope++;
        skipped.push({ externalId: record.externalId, title: record.title, reason: "No explicit AI/coding/gaming wording" });
        return;
      }
      if (candidate.state === "out-of-scope") {
        counts.outOfScope++;
        skipped.push({ externalId: record.externalId, title: record.title, reason: "Professional/staff training only" });
        return;
      }
      candidates.push(candidate);
      if (candidate.state === "blocked") counts.blocked++; else counts.ready++;
    },
    fail: message => { counts.failed++; errors.push(message); },
    error: message => { errors.push(message); },
    note: message => { infos.push(message); },
  };

  try {
    await adapter.collect(ctx);
  } catch (error) {
    if (error instanceof PageCapReached) capHit = true;
    else errors.push(`Adapter stopped: ${error instanceof Error ? error.message : String(error)}`);
  }

  const partialCoverage = capHit || errors.length > 0;
  const status: ProviderRunResult["status"] =
    listingsOk === 0 ? "failed" :
    candidates.length ? (partialCoverage ? "partial" : "needs-review") :
    partialCoverage ? "partial" : "empty";
  const message = [
    status === "failed" ? "Source could not be read; last published catalogue is kept." :
    status === "empty" ? `Listings read; no qualifying child/family records in the next ${windowDays} days.` :
    candidates.length ? `${candidates.length} candidate(s) staged for human review (${counts.ready} ready, ${counts.blocked} need correction).` :
    "No candidates staged.",
    capHit ? `Page cap ${fetcher.pageCap} reached; coverage incomplete.` : "",
    ...errors,
    ...infos,
  ].filter(Boolean).join(" ");

  return {
    runId, providerId: provider.id, adapterVersion: adapter.version, startedAt, finishedAt: new Date().toISOString(),
    status, message, windowDays, pageCap: fetcher.pageCap, partialCoverage, pages: fetcher.pages, counts, skipped,
    candidates: candidates.sort((a, b) => (a.offer.startsAt ?? "").localeCompare(b.offer.startsAt ?? "") || a.rowId.localeCompare(b.rowId)),
  };
}

export const runsDir = () => pathToFileURL(`${join(process.cwd(), "data", "source-runs")}/`);

function writeAtomic(target: URL, body: unknown) {
  const tmp = new URL(`${target.pathname.split("/").pop()}.tmp`, target);
  writeFileSync(tmp, `${JSON.stringify(body, null, 2)}\n`, "utf8");
  renameSync(tmp, target);
}

/**
 * Atomic write of the run record. `<provider>-last-attempt.json` always records the latest attempt;
 * `<provider>-latest.json` (what the review desk reads) is replaced only by a run that read the source,
 * so a failed refresh keeps the last good staged result.
 */
export function saveRun(result: ProviderRunResult, dir: URL = runsDir()): { latest: URL | null; attempt: URL } {
  mkdirSync(dir, { recursive: true });
  const attempt = new URL(`${result.providerId}-last-attempt.json`, dir);
  writeAtomic(attempt, { ...result, candidates: undefined, candidateCount: result.candidates.length });
  if (result.status === "failed") return { latest: null, attempt };
  const latest = new URL(`${result.providerId}-latest.json`, dir);
  writeAtomic(latest, result);
  return { latest, attempt };
}
