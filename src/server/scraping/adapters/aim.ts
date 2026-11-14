/**
 * aim-akademie.org adapter (Kufer course system), U1.
 *
 * Listing: /kurse?kathaupt=18&... cards with course number, status badge and audience labels.
 * Detail:  /kurse/kurs/<slug>/<Kursnummer>, parsed only inside anchored blocks:
 *   - <div class="course course_detail" id="course-<KNR>">  (identity check)
 *   - <table id="coursesDateTable">                          (this course's sessions only)
 *   - sidebar status after <strong class="kufer-content-kursdetails-knr">KNR</strong>
 *   - <h3>Kosten:</h3>
 * Traps handled: related-course dates/status ("Diese Angebote könnten Sie auch interessieren"),
 * the provider footer address (not the venue), cart links (?knradd=) which are never followed.
 */
import { germanDateToIso } from "../berlin-time.ts";
import { decodeEntities, elementAt, findElement, htmlToText, oneLine } from "../html.ts";
import type { FieldEvidence, SourceRecord, SourceSession } from "../types.ts";

export const AIM_ADAPTER_VERSION = "aim-html/1";
const ORIGIN = "https://www.aim-akademie.org";

export interface AimListingCard {
  externalId: string;
  detailUrl: string;
  title: string;
  statusText: string | null;
  audienceLabels: string[];
  firstDate: string | null;
}

/** Canonical detail URL: path only, no query (drops ?knradd= cart actions and tracking). */
export function canonicalAimDetailUrl(href: string): string | null {
  try {
    const u = new URL(decodeEntities(href), ORIGIN);
    if (u.hostname !== "www.aim-akademie.org" && u.hostname !== "aim-akademie.org") return null;
    if (!/^\/kurse\/kurs\/[^/]+\/[A-Za-z0-9]+$/.test(u.pathname)) return null;
    return `${ORIGIN}${u.pathname}`;
  } catch {
    return null;
  }
}

export function parseAimListing(html: string): AimListingCard[] {
  const cards: AimListingCard[] = [];
  const seen = new Set<string>();
  const re = /<div class="frame frame-ruler_dashed_below\s+kufer-content-kursliste-kurs kufer-content-kursliste-kurs-\d+">/g;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const card = elementAt(html, m.index);
    if (!card) continue;
    const link = /<h2[^>]*>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(card);
    const knr = /class="kufer-content-kursliste-knr">([^<]+)</.exec(card)?.[1]?.trim();
    const detailUrl = link ? canonicalAimDetailUrl(link[1]) : null;
    if (!link || !knr || !detailUrl || !detailUrl.endsWith(`/${knr}`) || seen.has(knr)) continue;
    seen.add(knr);
    const date = /<\/abbr>\s*(\d{2}\.\d{2}\.\d{4})/.exec(card)?.[1] ?? /(\d{2}\.\d{2}\.\d{4})/.exec(card)?.[1] ?? null;
    cards.push({
      externalId: knr,
      detailUrl,
      title: oneLine(htmlToText(link[2])),
      statusText: (/class="kw_ampel status\d">([^<]*)</.exec(card)?.[1] ?? null)?.trim() ?? null,
      audienceLabels: [...card.matchAll(/<span class="badge[^"]*">([^<]+)<\/span>/g)].map(b => oneLine(decodeEntities(b[1]))),
      firstDate: date ? germanDateToIso(date) : null,
    });
  }
  return cards;
}

export class AimLayoutError extends Error {}

function parseSessions(table: string): { sessions: SourceSession[]; rows: string[] } {
  const sessions: SourceSession[] = [];
  const rows: string[] = [];
  const body = /<tbody>([\s\S]*?)<\/tbody>/.exec(table)?.[1] ?? "";
  for (const row of body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => oneLine(htmlToText(c[1])));
    if (!cells.length) continue;
    rows.push(cells.join(" | "));
    const date = germanDateToIso(cells[0] ?? "");
    if (!date) throw new AimLayoutError(`Unparseable session date "${cells[0]}"`);
    const time = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*Uhr/.exec(cells[1] ?? "");
    const single = /^(\d{1,2}:\d{2})\s*Uhr$/.exec(cells[1] ?? "");
    sessions.push({
      date,
      startTime: time?.[1] ?? single?.[1] ?? null,
      endTime: time?.[2] ?? null,
      place: cells[2] || null,
    });
  }
  return { sessions, rows };
}

/** Paragraph following a bold heading such as "Teilnehmen" or "Adresse" in the description. */
function section(descriptionHtml: string, heading: string): string | null {
  const re = new RegExp(`<span[^>]*font-weight:bold;[^>]*>\\s*${heading}\\s*</span>([\\s\\S]*?)</p>(?:\\s*<p[^>]*>([\\s\\S]*?)</p>)?`, "i");
  const m = re.exec(descriptionHtml);
  if (!m) return null;
  const inline = oneLine(htmlToText(m[1]));
  return inline || (m[2] ? oneLine(htmlToText(m[2])) : null) || null;
}

/** "Max-Planck-Straße 39, 74081 Heilbronn" -> "Heilbronn". */
const cityFrom = (text: string | null) => (text ? /\b\d{5}\s+([A-ZÄÖÜ][\wäöüß-]+(?:\s(?:am|an der|im)\s[\wäöüß-]+)?)/.exec(text)?.[1] ?? null : null);

export function parseAimDetail(html: string, url: string, fetchedAt: string, listing?: AimListingCard): SourceRecord {
  const detailUrl = canonicalAimDetailUrl(url);
  if (!detailUrl) throw new AimLayoutError(`Not an aim course detail URL: ${url}`);
  const urlKnr = detailUrl.split("/").pop()!;
  const evidence: FieldEvidence[] = [];

  const course = findElement(html, /<div class="course course_detail" id="course-([A-Za-z0-9]+)">/);
  const courseKnr = /id="course-([A-Za-z0-9]+)"/.exec(course ?? "")?.[1];
  if (!course || courseKnr !== urlKnr) throw new AimLayoutError(`Course block missing or does not match ${urlKnr}`);
  evidence.push({ field: "externalId", value: urlKnr, text: `Kursnummer: ${urlKnr}`, locator: "div.course_detail#course-<KNR> + URL", method: "explicit" });

  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  if (canonical && canonicalAimDetailUrl(canonical) !== detailUrl)
    throw new AimLayoutError(`Canonical URL ${canonical} differs from requested record`);

  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(course);
  if (!h1) throw new AimLayoutError("Course title missing");
  const title = oneLine(htmlToText(h1[1]));
  evidence.push({ field: "title", value: title, text: title, locator: "div.course_detail h1", method: "explicit" });

  const frameInner = findElement(course, /<div class="frame-inner">/) ?? "";
  const afterTitle = frameInner.slice(frameInner.indexOf("</h1>") + 5);
  const firstPara = /<p[^>]*>([\s\S]*?)<\/p>/.exec(afterTitle);
  const lead = firstPara ? oneLine(htmlToText(firstPara[1])) || null : null;
  const stop = afterTitle.search(/font-weight:bold;[^>]*>\s*(Adresse|Allgemeine Hinweise)/);
  const description = htmlToText(stop > 0 ? afterTitle.slice(0, stop) : afterTitle);
  const audienceText = section(afterTitle, "Teilnehmen");
  const address = section(afterTitle, "Adresse");
  if (audienceText) evidence.push({ field: "audienceText", value: audienceText, text: audienceText, locator: "description › Teilnehmen", method: "explicit" });

  const tables = html.match(/<table id="coursesDateTable"/g) ?? [];
  if (tables.length !== 1) throw new AimLayoutError(`Expected one coursesDateTable, found ${tables.length}`);
  const table = findElement(course, /<table id="coursesDateTable"[^>]*>/);
  if (!table) throw new AimLayoutError("Date table is outside the course block");
  const { sessions, rows } = parseSessions(table);
  evidence.push({ field: "sessions", value: sessions, text: rows.join(" ; ") || null, locator: "table#coursesDateTable (Termine)", method: rows.length ? "explicit" : "absent" });

  // Status: the sidebar block that follows this course's own number, not related-course badges.
  const knrAnchor = html.indexOf(`<strong class="kufer-content-kursdetails-knr">${urlKnr}</strong>`);
  let statusText: string | null = null;
  if (knrAnchor >= 0) {
    const statusStart = html.indexOf('<div class="kufer-content-kursdetails-status">', knrAnchor);
    const status = statusStart >= 0 ? elementAt(html, statusStart) : null;
    if (status) statusText = oneLine(htmlToText(status)) || null;
  }
  evidence.push({ field: "statusText", value: statusText, text: statusText, locator: "sidebar div.kufer-content-kursdetails-status after Kursnummer", method: statusText ? "explicit" : "absent" });

  const costs = [...html.matchAll(/<h3>Kosten:<\/h3>([^<]*)/g)].map(m => oneLine(decodeEntities(m[1])));
  const costText = costs[0] || null;
  if (new Set(costs).size > 1) throw new AimLayoutError(`Conflicting cost blocks: ${costs.join(" / ")}`);

  // Venue: the session table place. City only from the record's own address or a printed address
  // line naming that venue; the provider footer address alone is not used.
  const places = [...new Set(sessions.map(s => s.place).filter((p): p is string => !!p))];
  const venueName = places.length === 1 ? places[0] : places.length ? places.join(" / ") : null;
  let venueCity = cityFrom(address);
  let cityLocator = "description › Adresse";
  if (!venueCity && venueName) {
    const escaped = venueName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const line = new RegExp(`${escaped}\\s+\\d+[a-z]?\\s+(\\d{5})\\s+([A-ZÄÖÜ][\\wäöüß-]+)`).exec(htmlToText(html).replace(/\n/g, " "));
    if (line) { venueCity = line[2]; cityLocator = `address line "${line[0]}" naming the venue`; }
  }
  evidence.push({ field: "venue", value: { name: venueName, city: venueCity }, text: address ?? venueName, locator: `table#coursesDateTable Ort; city: ${cityLocator}`,
    method: venueCity ? (cityLocator.startsWith("description") ? "explicit" : "derived") : "absent",
    note: venueCity && !cityLocator.startsWith("description") ? "City taken from a published street address for the same venue name; confirm in review." : undefined });

  return {
    providerId: "aim",
    externalId: urlKnr,
    detailUrl,
    fetchedAt,
    adapterVersion: AIM_ADAPTER_VERSION,
    title,
    lead,
    description,
    audienceText,
    audienceLabels: listing?.audienceLabels ?? [],
    sessions,
    venueName,
    venueCity,
    costText,
    statusText: statusText ?? listing?.statusText ?? null,
    evidence,
  };
}
