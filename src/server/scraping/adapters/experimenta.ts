/**
 * experimenta adapter (WordPress event calendar), U2.
 *
 * Listing https://www.experimenta.science/besuchen/veranstaltungen/ is server-rendered and contains one
 * card per occurrence:  <div class='search-filter-result-item veranstaltungen-card' data-event='<eventId>-<n>'
 *   data-groups='[...]'> … <h5>title</h5><p>teaser</p> <a href=".../veranstaltungskalender/<slug>/?termin=<unix>">
 * `termin` is the occurrence start instant; it becomes the occurrence identity.
 * Planetarium films ("science-dome-shows") and teacher training ("fortbildung") are skipped by their
 * published category without spending detail requests. One detail page per remaining event supplies
 * description, categories, price/registration sentence, venue sentence and schema.org Event JSON-LD.
 */
import { matchTopics } from "../../normalize/rules.ts";
import { decodeEntities, findElement, htmlToText, jsonLd, oneLine } from "../html.ts";
import { berlinLocalToIso, parseTimeRange } from "../berlin-time.ts";
import { PageCapReached } from "../fetcher.ts";
import { recordFailure, type AdapterContext, type ProviderAdapter } from "../runner.ts";
import type { FieldEvidence, SourceRecord } from "../types.ts";
import type { Format, Issue } from "../../../shared/contracts.ts";

export const EXPERIMENTA_ADAPTER_VERSION = "experimenta-html/1";
const ORIGIN = "https://www.experimenta.science";
const LISTING_PATH = "/besuchen/veranstaltungen/";
const SKIP_GROUPS: Record<string, string> = {
  "science-dome-shows": "Planetarium/dome show",
  fortbildung: "Teacher training (Fortbildung)",
};

export interface ExperimentaCard {
  eventId: string;
  termin: string;
  url: string;
  title: string;
  teaser: string;
  groups: string[];
  timeText: string;
}

export class ExperimentaLayoutError extends Error {}

/**
 * `?termin=` is the occurrence's Europe/Berlin wall-clock time encoded as if it were UTC
 * (verified 14 Nov 2026: termin=1796468400 = "11:00" on the card and 2026-12-05T11:00:00+01:00 in JSON-LD).
 */
export function terminToLocal(termin: string): { date: string; time: string } {
  const d = new Date(Number(termin) * 1000);
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
}

export function canonicalExperimentaUrl(href: string): { url: string; slug: string; termin: string } | null {
  try {
    const u = new URL(decodeEntities(href), ORIGIN);
    if (u.hostname !== "www.experimenta.science" && u.hostname !== "experimenta.science") return null;
    const m = /^\/besuchen\/veranstaltungskalender\/([a-z0-9-]+)\/$/.exec(u.pathname);
    const termin = u.searchParams.get("termin") ?? "";
    if (!m || !/^\d{9,11}$/.test(termin)) return null;
    return { url: `${ORIGIN}${u.pathname}?termin=${termin}`, slug: m[1], termin };
  } catch {
    return null;
  }
}

export function parseExperimentaListing(html: string): ExperimentaCard[] {
  const cards: ExperimentaCard[] = [];
  const seen = new Set<string>();
  const parts = html.split(/<div class='search-filter-result-item veranstaltungen-card'/).slice(1);
  for (const part of parts) {
    const card = part.slice(0, part.indexOf("Zur Veranstaltung") + 20);
    const eventId = /data-event='(\d+)-\d+'/.exec(card)?.[1];
    const link = /<a\s+href="([^"]+)"[^>]*>Zur Veranstaltung/.exec(card)?.[1];
    const target = link ? canonicalExperimentaUrl(link) : null;
    if (!eventId || !target || seen.has(`${eventId}-${target.termin}`)) continue;
    seen.add(`${eventId}-${target.termin}`);
    let groups: string[] = [];
    try { groups = JSON.parse(decodeEntities(/data-groups='([^']*)'/.exec(card)?.[1] ?? "[]")) as string[]; } catch { groups = []; }
    cards.push({
      eventId,
      termin: target.termin,
      url: target.url,
      title: oneLine(htmlToText(/<h5>([\s\S]*?)<\/h5>/.exec(card)?.[1] ?? "")),
      teaser: oneLine(htmlToText(/<\/h5>\s*<p>([\s\S]*?)<\/p>/.exec(card)?.[1] ?? "")),
      groups,
      timeText: oneLine(htmlToText(/class="start-monat-uhrzeit">([\s\S]*?)<\/div>/.exec(card)?.[1] ?? "")),
    });
  }
  return cards;
}

const label = (slug: string) => slug.replace(/-/g, " ").replace(/^ab (\d+) jahren$/, "ab $1 Jahren");

export interface ExperimentaDetail {
  title: string;
  description: string;
  categories: string[];
  audienceText: string | null;
  priceText: string | null;
  registrationText: string | null;
  venueText: string | null;
  city: string | null;
  cancelled: boolean;
  /** schema.org Event startDate values on the page (may describe only the first occurrence). */
  jsonLdStarts: string[];
}

export function parseExperimentaDetail(html: string): ExperimentaDetail {
  const title = oneLine(htmlToText(/<h1[^>]*class="entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? ""));
  if (!title) throw new ExperimentaLayoutError("Event title (h1.entry-title) missing");
  const contentEl = findElement(html, /<div class="et_pb_module et_pb_post_content [^"]*">/);
  if (!contentEl) throw new ExperimentaLayoutError("Event content block missing");
  const lines = htmlToText(contentEl).split("\n").filter(l => l && l !== " ");
  const categoriesEl = /<div class="et_pb_code_inner">((?:<a href="[^"]*_sft_veranstaltungen_category=[^"]*">[^<]*<\/a>)+)<\/div>/.exec(html)?.[1] ?? "";
  const categories = [...categoriesEl.matchAll(/>([^<]+)<\/a>/g)].map(m => oneLine(decodeEntities(m[1])));
  const find = (re: RegExp) => lines.find(l => re.test(l)) ?? null;
  const venueIdx = lines.findIndex(l => /^Veranstaltungsort:?$/i.test(l));
  const venueInline = find(/^Veranstaltungsort:\s*\S/i);
  const event = jsonLd(html).find(x => x["@type"] === "Event");
  const location = (event?.location ?? null) as { address?: { addressLocality?: string } } | null;
  return {
    title,
    description: lines.join("\n"),
    categories,
    audienceText: find(/^Zielgruppe/i),
    priceText: find(/kostenfrei|kostenlos|Eintritt|€|Euro|Ticket|Gebühr|Preis/i),
    registrationText: find(/Anmeldung/i),
    venueText: venueInline?.replace(/^Veranstaltungsort:\s*/i, "") ?? (venueIdx >= 0 ? lines[venueIdx + 1] ?? null : null),
    city: location?.address?.addressLocality ?? null,
    cancelled: /EventCancelled/.test(String(event?.eventStatus ?? "")),
    jsonLdStarts: jsonLd(html).filter(x => x["@type"] === "Event").map(x => String(x.startDate ?? "")).filter(Boolean),
  };
}

export function buildExperimentaRecord(card: ExperimentaCard, detail: ExperimentaDetail, fetchedAt: string): SourceRecord {
  const issues: Issue[] = [];
  const notes: string[] = [];
  const evidence: FieldEvidence[] = [];
  const start = terminToLocal(card.termin);
  const range = parseTimeRange(card.timeText);
  if (range.start && range.start !== start.time)
    issues.push({ path: "startsAt", message: `Card time "${card.timeText}" disagrees with occurrence start ${start.date} ${start.time}` });
  const iso = berlinLocalToIso(start.date, start.time);
  const sameDayLd = detail.jsonLdStarts.find(d => d.startsWith(start.date));
  if (sameDayLd && iso && Date.parse(sameDayLd) !== Date.parse(iso))
    issues.push({ path: "startsAt", message: `schema.org startDate ${sameDayLd} disagrees with occurrence ${iso}` });
  const sessions = [{ date: start.date, startTime: start.time, endTime: range.end, place: detail.venueText }];
  evidence.push({ field: "externalId", value: `${card.eventId} / termin ${card.termin}`, text: card.url, locator: "listing card data-event + link ?termin=", method: "explicit" });
  evidence.push({ field: "sessions", value: sessions, text: `termin=${card.termin} (${start.date} ${start.time} Europe/Berlin); card: "${card.timeText}"`, locator: "listing card link + .start-monat-uhrzeit", method: "explicit" });
  evidence.push({ field: "categories", value: detail.categories, text: detail.categories.join(", ") || card.groups.join(", "), locator: "detail .post-kategorien (listing data-groups)", method: "explicit" });
  if (detail.priceText) evidence.push({ field: "costText", value: detail.priceText, text: detail.priceText, locator: "detail content sentence", method: "explicit" });
  if (detail.registrationText) notes.push(`Registration note on the page: "${detail.registrationText}"`);
  evidence.push({ field: "venue", value: { name: detail.venueText, city: detail.city }, text: detail.venueText,
    locator: "detail content 'Veranstaltungsort'; city: schema.org Event location.address.addressLocality", method: detail.city ? "explicit" : "absent" });
  if (detail.title !== card.title) notes.push(`Listing title "${card.title}" differs from detail title "${detail.title}".`);

  const labels = (detail.categories.length ? detail.categories : card.groups.map(label));
  const ageLabel = labels.find(l => /ab \d+ Jahren/i.test(l)) ?? null;
  const groups = new Set(card.groups);
  const formatHint: Format = groups.has("workshop") ? "workshop" : /keine Anmeldung/i.test(detail.registrationText ?? "") ? "drop-in" : "event";
  return {
    providerId: "experimenta",
    externalId: card.eventId,
    occurrenceKey: card.termin,
    detailUrl: card.url,
    fetchedAt,
    adapterVersion: EXPERIMENTA_ADAPTER_VERSION,
    title: detail.title,
    lead: card.teaser || null,
    description: detail.description,
    audienceText: detail.audienceText ?? ageLabel,
    audienceLabels: labels,
    sessions,
    venueName: detail.venueText ? `experimenta – ${detail.venueText}` : "experimenta",
    venueCity: detail.city,
    costText: detail.priceText,
    statusText: detail.cancelled ? "abgesagt" : detail.registrationText,
    evidence,
    extractionIssues: issues,
    adapterNotes: notes,
    formatHint,
  };
}

export const experimentaAdapter: ProviderAdapter = {
  providerId: "experimenta",
  version: EXPERIMENTA_ADAPTER_VERSION,
  async collect(ctx: AdapterContext) {
    const listing = (ctx.provider.scraping?.seedUrls ?? []).find(u => new URL(u).pathname === LISTING_PATH) ?? `${ORIGIN}${LISTING_PATH}`;
    let cards: ExperimentaCard[];
    try {
      const { html } = await ctx.fetch(listing, "listing");
      cards = parseExperimentaListing(html);
    } catch (error) {
      if (error instanceof PageCapReached) throw error;
      ctx.error(`Listing ${listing}: ${(error as Error).message}`);
      return;
    }
    if (!cards.length) { ctx.error(`No event cards recognised on ${listing} (layout change or empty calendar)`); return; }
    ctx.listingOk(cards.length);

    const byEvent = new Map<string, ExperimentaCard[]>();
    for (const card of cards) {
      const local = terminToLocal(card.termin);
      const start = Date.parse(berlinLocalToIso(local.date, local.time) ?? "");
      if (start < ctx.now.getTime() - 86_400_000) continue; // already over
      const skipGroup = card.groups.find(g => g in SKIP_GROUPS);
      if (skipGroup) { ctx.skip(`${card.eventId}-${card.termin}`, card.title, SKIP_GROUPS[skipGroup], "outOfScope"); continue; }
      if (start > ctx.horizon) { ctx.skip(`${card.eventId}-${card.termin}`, card.title, `After the ${ctx.windowDays}-day window`, "outsideWindow"); continue; }
      byEvent.set(card.eventId, [...(byEvent.get(card.eventId) ?? []), card]);
    }

    for (const [eventId, occurrences] of byEvent) {
      const first = occurrences[0];
      try {
        const { html } = await ctx.fetch(first.url, "detail");
        const detail = parseExperimentaDetail(html);
        const topics = matchTopics([detail.title, first.teaser, detail.description].join("\n"));
        if (!topics.length) {
          for (const o of occurrences) ctx.skip(`${eventId}-${o.termin}`, o.title, "No explicit AI/coding/gaming wording", "outOfScope");
          continue;
        }
        const fetchedAt = new Date().toISOString();
        for (const o of occurrences) ctx.emit(buildExperimentaRecord(o, detail, fetchedAt));
      } catch (error) {
        recordFailure(ctx, `${eventId} (${first.title})`, error);
      }
    }
  },
};
