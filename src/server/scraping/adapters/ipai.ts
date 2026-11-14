/**
 * IPAI Foundation adapter (WordPress/Elementor event pages), U2.
 *
 * Discovery: the configured overview (https://ipai-foundation.ai/#events) links to /event/<slug>/.
 * Detail anchors:
 *   - body/post class "post-<id> event type-event"  -> stable WordPress post ID (externalId)
 *   - <cruise-event-details-hero><h1>                 -> title, ".bx-category" -> category
 *   - <cruise-event-informations> (rendered twice for desktop/mobile; the copies must agree)
 *        .bx-location, .bx-date-time-container       -> venue, date, time
 *   - optional "Keyfacts" list: Wann / Wo / Teilnahme / Zielgruppe
 * External ticket links (e.g. eventbrite) are recorded as not followed.
 * Audience comes only from the published "Zielgruppe"; a public AI event is not a child offer by default.
 */
import { cityFromAddress, decodeEntities, findElement, htmlToText, oneLine } from "../html.ts";
import { germanLongDateToIso, parseTimeRange } from "../berlin-time.ts";
import { PageCapReached } from "../fetcher.ts";
import { recordFailure, type AdapterContext, type ProviderAdapter } from "../runner.ts";
import type { FieldEvidence, SourceRecord } from "../types.ts";
import type { Format, Issue } from "../../../shared/contracts.ts";

export const IPAI_ADAPTER_VERSION = "ipai-html/1";
const ORIGIN = "https://ipai-foundation.ai";

export class IpaiLayoutError extends Error {}

export function canonicalIpaiEventUrl(href: string): string | null {
  try {
    const u = new URL(decodeEntities(href), ORIGIN);
    if (u.hostname !== "ipai-foundation.ai" && u.hostname !== "www.ipai-foundation.ai") return null;
    const m = /^\/(?:en\/)?event\/([a-z0-9-]+)\/?$/.exec(u.pathname);
    return m ? `${ORIGIN}${u.pathname.endsWith("/") ? u.pathname : `${u.pathname}/`}` : null;
  } catch {
    return null;
  }
}

/** Unique event detail URLs linked from the overview page. */
export function parseIpaiOverview(html: string): string[] {
  const urls = new Set<string>();
  for (const m of html.matchAll(/href="([^"]*\/event\/[^"]+)"/g)) {
    const url = canonicalIpaiEventUrl(m[1]);
    if (url) urls.add(url);
  }
  return [...urls];
}

function keyfact(html: string, label: string): string | null {
  const m = new RegExp(`<b>\\s*${label}:?\\s*</b>([\\s\\S]*?)</li>`, "i").exec(html);
  return m ? oneLine(htmlToText(m[1])) || null : null;
}

export function parseIpaiDetail(html: string, url: string, fetchedAt: string): SourceRecord {
  const detailUrl = canonicalIpaiEventUrl(url);
  if (!detailUrl) throw new IpaiLayoutError(`Not an IPAI event URL: ${url}`);
  const evidence: FieldEvidence[] = [];
  const issues: Issue[] = [];
  const notes: string[] = [];

  const postId = /\bpost-(\d+)\s+event\s+type-event\b/.exec(html)?.[1];
  if (!postId) throw new IpaiLayoutError("Event post ID not found (layout change?)");
  evidence.push({ field: "externalId", value: postId, text: `post-${postId} event`, locator: "Elementor single-event container class", method: "explicit" });

  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  if (canonical && canonicalIpaiEventUrl(canonical) !== detailUrl)
    throw new IpaiLayoutError(`Canonical URL ${canonical} differs from requested event`);

  const hero = findElement(html, /<cruise-event-details-hero>/);
  const title = hero ? oneLine(htmlToText(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(hero)?.[1] ?? "")) : "";
  if (!title) throw new IpaiLayoutError("Event title missing");
  const category = hero ? oneLine(htmlToText(/class="bx-category">([\s\S]*?)<\/div>/.exec(hero)?.[1] ?? "")) || null : null;
  evidence.push({ field: "title", value: title, text: title, locator: "cruise-event-details-hero h1", method: "explicit" });
  evidence.push({ field: "category", value: category, text: category, locator: "cruise-event-details-hero .bx-category", method: category ? "explicit" : "absent" });

  // The information block is rendered twice (desktop + mobile). Use one, require the copies to agree.
  const blocks = [...html.matchAll(/<cruise-event-informations>([\s\S]*?)<\/cruise-event-informations>/g)].map(m => m[1]);
  if (!blocks.length) throw new IpaiLayoutError("Event information block missing");
  const read = (block: string) => ({
    location: oneLine(htmlToText(/class="bx-location">([\s\S]*?)<\/div>/.exec(block)?.[1] ?? "")),
    dateTime: oneLine(htmlToText(/class="bx-date-time-container">([\s\S]*?)<\/div>\s*<hr/.exec(block)?.[1] ?? "")),
    register: /<a href="([^"]+)"[^>]*>\s*Anmelden/.exec(block)?.[1] ?? null,
  });
  const info = read(blocks[0]);
  if (blocks.some(b => { const r = read(b); return r.location !== info.location || r.dateTime !== info.dateTime; }))
    throw new IpaiLayoutError("Repeated event information blocks disagree");
  if (blocks.length > 1) notes.push(`Event details are repeated ${blocks.length}× in the page layout; treated as one occurrence.`);

  const date = germanLongDateToIso(info.dateTime);
  const time = parseTimeRange(info.dateTime);
  if (!date) throw new IpaiLayoutError(`Event date not recognised in "${info.dateTime}"`);
  const sessions = [{ date, startTime: time.start, endTime: time.end, place: info.location || null }];
  evidence.push({ field: "sessions", value: sessions, text: info.dateTime, locator: "cruise-event-informations .bx-date-time-container", method: "explicit" });

  const content = findElement(html, /<div[^>]*data-widget_type="theme-post-content\.default"[^>]*>/) ?? "";
  const when = keyfact(content, "Wann");
  if (when) {
    const kfDate = germanLongDateToIso(when);
    const kfTime = parseTimeRange(when);
    if ((kfDate && kfDate !== date) || (kfTime.start && kfTime.start !== time.start))
      issues.push({ path: "startsAt", message: `Keyfacts "Wann: ${when}" disagrees with the event header "${info.dateTime}"` });
    evidence.push({ field: "keyfacts.when", value: when, text: when, locator: "post content › Keyfacts › Wann", method: "explicit" });
  }
  const where = keyfact(content, "Wo");
  const participation = keyfact(content, "Teilnahme");
  const audience = keyfact(content, "Zielgruppe");
  if (audience) evidence.push({ field: "audienceText", value: audience, text: audience, locator: "post content › Keyfacts › Zielgruppe", method: "explicit" });
  if (info.register) {
    const host = (() => { try { return new URL(info.register).hostname; } catch { return "?"; } })();
    if (!host.endsWith("ipai-foundation.ai")) notes.push(`Registration is handled on ${host}; that host is not crawled.`);
  }

  const description = htmlToText(content.replace(/<h2[^>]*>\s*<b>\s*Keyfacts[\s\S]*?<\/ul>/i, ""));
  const lead = description.split("\n").find(line => line.length > 40 && !/^(Agenda|Was erwartet)/i.test(line)) ?? null;
  const city = cityFromAddress(info.location);
  evidence.push({ field: "venue", value: { name: info.location, room: where }, text: info.location, locator: "cruise-event-informations .bx-location", method: city ? "explicit" : "absent" });

  const formatHint: Format = /workshop/i.test(category ?? "") ? "workshop" : "event";
  return {
    providerId: "ipai",
    externalId: postId,
    detailUrl,
    fetchedAt,
    adapterVersion: IPAI_ADAPTER_VERSION,
    title,
    lead,
    description,
    audienceText: audience,
    audienceLabels: audience ? [audience] : [],
    sessions,
    venueName: info.location ? info.location.replace(/,\s*[^,]*\d{5}.*$/, "").trim() || info.location : null,
    venueCity: city,
    costText: participation,
    statusText: null,
    evidence,
    extractionIssues: issues,
    adapterNotes: notes,
    formatHint,
  };
}

export const ipaiAdapter: ProviderAdapter = {
  providerId: "ipai",
  version: IPAI_ADAPTER_VERSION,
  async collect(ctx: AdapterContext) {
    const urls = new Set<string>();
    for (const seed of ctx.provider.scraping?.seedUrls ?? []) {
      try {
        const { html } = await ctx.fetch(seed.replace(/#.*$/, ""), "listing");
        const found = parseIpaiOverview(html);
        if (!found.length) { ctx.error(`No event links recognised on ${seed} (layout change or no events published)`); continue; }
        found.forEach(u => urls.add(u));
        ctx.listingOk(found.length);
      } catch (error) {
        if (error instanceof PageCapReached) throw error;
        ctx.error(`Overview ${seed}: ${(error as Error).message}`);
      }
    }
    for (const url of urls) {
      try {
        const { html, finalUrl } = await ctx.fetch(url, "detail");
        const record = parseIpaiDetail(html, finalUrl, new Date().toISOString());
        const start = Date.parse(`${record.sessions[0].date}T00:00:00Z`);
        if (start > ctx.horizon) { ctx.skip(record.externalId, record.title, `Starts ${record.sessions[0].date}, after the ${ctx.windowDays}-day window`, "outsideWindow"); continue; }
        ctx.emit(record);
      } catch (error) {
        recordFailure(ctx, url, error);
      }
    }
  },
};
