/**
 * Bounded provider run (U1: aim). Runs outside visitor requests; results are staged for review,
 * never published automatically. A failed/partial run never removes published records.
 */
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { normalizeRecord } from "../normalize/to-offer.ts";
import { isProfessionalOnly } from "../normalize/rules.ts";
import { AIM_ADAPTER_VERSION, AimLayoutError, parseAimDetail, parseAimListing, type AimListingCard } from "./adapters/aim.ts";
import { PageCapReached, ProviderFetcher, type FetcherOptions } from "./fetcher.ts";
import { getProvider, loadProviders, type ProviderConfig } from "./providers.ts";
import type { Candidate, ProviderRunResult } from "./types.ts";

export interface RunOptions extends FetcherOptions {
  now?: Date;
  windowDays?: number;
  providers?: ProviderConfig[];
}

const DAY = 86_400_000;

export async function runAim(options: RunOptions = {}): Promise<ProviderRunResult> {
  const provider = getProvider("aim", options.providers ?? loadProviders());
  const now = options.now ?? new Date();
  const windowDays = options.windowDays ?? provider.scraping?.windowDays ?? 90;
  const fetcher = new ProviderFetcher(provider, options);
  const startedAt = new Date().toISOString();
  const runId = `aim-${startedAt.replace(/[-:.]/g, "").slice(0, 15)}`;
  const counts = { listed: 0, outOfScope: 0, outsideWindow: 0, extracted: 0, ready: 0, blocked: 0, failed: 0 };
  const errors: string[] = [];
  let capHit = false;

  const cards = new Map<string, AimListingCard>();
  let listingsOk = 0;
  for (const seed of provider.scraping?.seedUrls ?? []) {
    try {
      const { html } = await fetcher.get(seed, "listing");
      const found = parseAimListing(html);
      if (!found.length) { errors.push(`No course cards recognised on ${seed} (layout change or empty listing)`); continue; }
      listingsOk++;
      for (const card of found) if (!cards.has(card.externalId)) cards.set(card.externalId, card);
    } catch (error) {
      if (error instanceof PageCapReached) { capHit = true; break; }
      errors.push(`Listing ${seed}: ${(error as Error).message}`);
    }
  }
  counts.listed = cards.size;

  const horizon = now.getTime() + windowDays * DAY;
  const candidates: Candidate[] = [];
  for (const card of cards.values()) {
    if (isProfessionalOnly(card.audienceLabels)) { counts.outOfScope++; continue; }
    if (card.firstDate && Date.parse(`${card.firstDate}T00:00:00Z`) > horizon) { counts.outsideWindow++; continue; }
    try {
      const { html, finalUrl } = await fetcher.get(card.detailUrl, "detail");
      const record = parseAimDetail(html, finalUrl, new Date().toISOString(), card);
      record.evidence.push({ field: "audienceLabels", value: card.audienceLabels, text: card.audienceLabels.join(", ") || null,
        locator: "listing card badges", method: card.audienceLabels.length ? "explicit" : "absent" });
      counts.extracted++;
      const candidate = normalizeRecord(record, now);
      if (candidate.timing === "ended") continue;
      if (candidate.state === "out-of-scope") { counts.outOfScope++; continue; }
      candidates.push(candidate);
      if (candidate.state === "blocked") counts.blocked++; else counts.ready++;
    } catch (error) {
      if (error instanceof PageCapReached) { capHit = true; break; }
      counts.failed++;
      errors.push(`${card.externalId}: ${error instanceof AimLayoutError ? "layout check failed – " : ""}${(error as Error).message}`);
    }
  }

  const partialCoverage = capHit || errors.length > 0;
  const status: ProviderRunResult["status"] =
    listingsOk === 0 ? "failed" :
    candidates.length ? (partialCoverage ? "partial" : "needs-review") :
    partialCoverage ? "partial" : "empty";
  const message = [
    status === "failed" ? "Source could not be read; last published catalogue is kept." :
    status === "empty" ? `Listings read; no qualifying child/family records in the next ${windowDays} days.` :
    `${candidates.length} candidate(s) staged for human review (${counts.ready} ready, ${counts.blocked} need correction).`,
    capHit ? `Page cap ${fetcher.pageCap} reached; coverage incomplete.` : "",
    ...errors,
  ].filter(Boolean).join(" ");

  return {
    runId, providerId: "aim", adapterVersion: AIM_ADAPTER_VERSION, startedAt, finishedAt: new Date().toISOString(),
    status, message, windowDays, pageCap: fetcher.pageCap, partialCoverage, pages: fetcher.pages, counts,
    candidates: candidates.sort((a, b) => (a.offer.startsAt ?? "").localeCompare(b.offer.startsAt ?? "")),
  };
}

export const RUNS_DIR = new URL("../../../data/source-runs/", import.meta.url);

/** Atomic write of the run record; `<provider>-latest.json` is what the review read uses. */
export function saveRun(result: ProviderRunResult, dir: URL = RUNS_DIR): URL {
  mkdirSync(dir, { recursive: true });
  const target = new URL(`${result.providerId}-latest.json`, dir);
  const tmp = new URL(`${result.providerId}-latest.json.tmp`, dir);
  writeFileSync(tmp, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  renameSync(tmp, target);
  return target;
}
