/**
 * Polite bounded fetcher for configured providers: exact host allowlist (also for
 * every redirect hop), one request at a time, minimum interval, timeout, page cap
 * and limited retries. It only issues GET requests for listing/detail pages.
 */
import { isAllowedUrl, type ProviderConfig } from "./providers.ts";
import type { PageLog } from "./types.ts";

export const USER_AGENT = "InterestAtlas-AIM-prototype/0.1 (public course/event listing check; low rate)";

export class PageCapReached extends Error {}

export interface FetcherOptions {
  fetchImpl?: typeof fetch;
  minIntervalMs?: number;
  timeoutMs?: number;
  maxRetries?: number;
  pageCap?: number;
  sleep?: (ms: number) => Promise<void>;
}

export class ProviderFetcher {
  readonly pages: PageLog[] = [];
  private last = 0;
  private readonly fetchImpl: typeof fetch;
  private readonly minIntervalMs: number;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  readonly pageCap: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly provider: ProviderConfig;

  constructor(provider: ProviderConfig, options: FetcherOptions = {}) {
    this.provider = provider;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.minIntervalMs = options.minIntervalMs ?? provider.scraping?.minRequestIntervalMs ?? 1000;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.pageCap = options.pageCap ?? provider.scraping?.maxPagesPerRun ?? 20;
    this.sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  }

  get remaining() { return this.pageCap - this.pages.length; }

  /** Fetch a page as text. Throws on disallowed hosts, cap, non-2xx or network failure (logged either way). */
  async get(url: string, kind: PageLog["kind"]): Promise<{ finalUrl: string; html: string }> {
    if (!isAllowedUrl(this.provider, url)) throw new Error(`Refusing URL outside ${this.provider.id} allowed hosts: ${url}`);
    if (this.remaining <= 0) throw new PageCapReached(`Page cap of ${this.pageCap} reached`);
    const log: PageLog = { url, finalUrl: null, status: null, bytes: 0, kind };
    this.pages.push(log);
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) await this.sleep(this.minIntervalMs * 2 ** attempt);
      try {
        const { response, finalUrl } = await this.followAllowed(url);
        log.status = response.status;
        log.finalUrl = finalUrl;
        if (response.status >= 500) { lastError = new Error(`HTTP ${response.status}`); continue; }
        if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), { final: true });
        const html = await response.text();
        log.bytes = html.length;
        return { finalUrl, html };
      } catch (error) {
        lastError = error;
        if ((error as { final?: boolean }).final) break;
      }
    }
    log.error = lastError instanceof Error ? lastError.message : String(lastError);
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async followAllowed(url: string) {
    let current = url;
    for (let hop = 0; hop <= 3; hop++) {
      const wait = this.last + this.minIntervalMs - Date.now();
      if (wait > 0) await this.sleep(wait);
      this.last = Date.now();
      const response = await this.fetchImpl(current, {
        redirect: "manual",
        headers: { "user-agent": USER_AGENT, accept: "text/html,application/json;q=0.9" },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        const next = new URL(location, current).toString();
        if (!isAllowedUrl(this.provider, next))
          throw Object.assign(new Error(`Redirect to a host outside the allowlist: ${next}`), { final: true });
        current = next;
        continue;
      }
      return { response, finalUrl: current };
    }
    throw Object.assign(new Error("Too many redirects"), { final: true });
  }
}
