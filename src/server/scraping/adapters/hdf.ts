/**
 * Haus der Familie Heilbronn adapter (Kufer course data behind a WordPress front end), U2.
 *
 * The seed pages render a "Kurse werden geladen…" placeholder and the page's own script then calls
 * the same-host JSON endpoint /kufer-api.php. This adapter replays exactly the queries the public
 * pages make (observed in a browser on 14 Nov 2026), built from configuration printed on the page:
 *   - course block config  <script id="kufer-kurse-block_*-data" type="application/json">
 *       -> ?keyword=…&keyword_relation=…&kategorie_id=…&page=N&limit=…&endpoint=/kurse/
 *   - search form defaults  <select name="fachb"> option selected  (Kinder & Jugendliche page)
 *       -> ?endpoint=kurse&fachb=3&limit=48&page=N
 * Records with explicit AI/coding/gaming wording are then verified on their public detail page
 * /kurs/<slug>-<knr>/ ("Kursdaten" table). Tutor names/e-mails in the JSON are never stored.
 */
import { matchTopics } from "../../normalize/rules.ts";
import { decodeEntities, htmlToText, oneLine } from "../html.ts";
import { germanLongDateToIso, parseTimeRange } from "../berlin-time.ts";
import { PageCapReached } from "../fetcher.ts";
import { recordFailure, type AdapterContext, type ProviderAdapter } from "../runner.ts";
import type { FieldEvidence, SourceRecord, SourceSession } from "../types.ts";
import type { Issue } from "../../../shared/contracts.ts";

export const HDF_ADAPTER_VERSION = "hdf-kufer-json+html/1";
const ORIGIN = "https://hdf-hn.de";
const MAX_API_PAGES = 4;

/** Only the fields this adapter reads; everything else (incl. `dozenten`) is discarded. */
export interface HdfApiCourse {
  knr: string;
  haupttitel: string;
  hauptuntertitel: string;
  inhalt: string;
  kurstyp: string;
  online_kurstyp: string;
  ortname: string;
  ortraumname: string;
  gebnorm: string;
  status: string;
  tnanmeldungen: string;
  tnmax: string;
  termine: { tag: string; zeitvon: string; zeitbis: string; termin_status: string }[];
}

export class HdfLayoutError extends Error {}

const str = (v: unknown) => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v));

/** Validate and reduce one API row. Returns null when the row is not a recognisable course. */
export function readApiCourse(raw: unknown): HdfApiCourse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!/^[A-Za-z0-9]{4,20}$/.test(str(r.knr)) || !str(r.haupttitel)) return null;
  const termine = Array.isArray(r.termine) ? r.termine.filter(t => t && typeof t === "object").map(t => {
    const x = t as Record<string, unknown>;
    return { tag: str(x.tag), zeitvon: str(x.zeitvon), zeitbis: str(x.zeitbis), termin_status: str(x.termin_status) };
  }) : [];
  return {
    knr: str(r.knr), haupttitel: str(r.haupttitel), hauptuntertitel: str(r.hauptuntertitel), inhalt: str(r.inhalt),
    kurstyp: str(r.kurstyp), online_kurstyp: str(r.online_kurstyp), ortname: str(r.ortname), ortraumname: str(r.ortraumname),
    gebnorm: str(r.gebnorm), status: str(r.status), tnanmeldungen: str(r.tnanmeldungen), tnmax: str(r.tnmax), termine,
  };
}

/** API queries the public seed page itself would make (page 1; the caller pages through). */
export function discoverHdfQueries(html: string): URLSearchParams[] {
  const queries: URLSearchParams[] = [];
  for (const m of html.matchAll(/<script id="kufer-kurse-block_[a-z0-9]+-data" type="application\/json">([\s\S]*?)<\/script>/g)) {
    let cfg: Record<string, unknown>;
    try { cfg = JSON.parse(m[1]) as Record<string, unknown>; } catch { continue; }
    const q = new URLSearchParams();
    for (const key of ["keyword", "keyword_relation", "ort_id", "beginndat", "fachb", "status", "kurs_nr", "firma_id"])
      if (str(cfg[key])) q.set(key, str(cfg[key]));
    const cats = Array.isArray(cfg.kategorie_id) ? cfg.kategorie_id.map(str).filter(Boolean) : [];
    if (cats.length) q.set("kategorie_id", cats.join(","));
    q.set("page", "1");
    q.set("limit", "120");
    q.set("endpoint", str(cfg.endpoint_path) || "/kurse/");
    queries.push(q);
  }
  const form = /<form[^>]*kufer-search-form[\s\S]*?<\/form>/.exec(html)?.[0];
  if (form) {
    const q = new URLSearchParams({ endpoint: "kurse" });
    for (const sel of form.matchAll(/<select[^>]*name="([a-z_]+)"[\s\S]*?<\/select>/g)) {
      const selected = /<option value="([^"]+)" selected/.exec(sel[0])?.[1];
      if (selected) q.set(sel[1], decodeEntities(selected));
    }
    if ([...q.keys()].length > 1) { q.set("limit", "48"); q.set("page", "1"); queries.push(q); }
  }
  return queries;
}

export const apiUrl = (q: URLSearchParams) => `${ORIGIN}/kufer-api.php?${q.toString()}`;

/** Public detail URL as linked by the site's own course list: /kurs/<slug(haupttitel)>-<knr>/. */
export function hdfDetailUrl(course: Pick<HdfApiCourse, "knr" | "haupttitel">): string {
  const slug = course.haupttitel.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${ORIGIN}/kurs/${slug}-${course.knr}/`;
}

/** Rows of the "Kursdaten" table on the detail page, keyed by row class suffix (status, termine, kosten, ort…). */
export function parseKursdaten(html: string): Record<string, string> {
  const table = /<div class="kurs__data-table[^"]*">([\s\S]*?)<\/article>/.exec(html)?.[1];
  if (!table) throw new HdfLayoutError("Kursdaten table not found on detail page");
  const rows: Record<string, string> = {};
  for (const m of table.matchAll(/kurs-data-table__row-([a-z]+)">[\s\S]*?kurs-data-table__value">([\s\S]*?)<\/div>\s*<\/div>/g))
    if (m[1] !== "leitung") rows[m[1]] = oneLine(htmlToText(m[2]));
  return rows;
}

function audienceLabels(course: HdfApiCourse): string[] {
  const labels: string[] = [];
  if (/eltern-kind/i.test(course.kurstyp)) labels.push("Familien", "Kinder (mit Begleitperson)");
  else if (/kinder|jugend/i.test(course.kurstyp)) labels.push("Kinder");
  if (/\bfür eltern\b|\beltern\b(?!-kind)/i.test(course.hauptuntertitel)) labels.push("Eltern");
  if (/jugendliche/i.test(course.hauptuntertitel)) labels.push("Jugendliche");
  if (!labels.length && /kinder/i.test(course.hauptuntertitel)) labels.push("Kinder");
  return [...new Set(labels)];
}

const hm = (t: string) => (/^(\d{2}):(\d{2})/.exec(t) ? t.slice(0, 5) : null);

export function buildHdfRecord(course: HdfApiCourse, detailHtml: string, detailUrl: string, fetchedAt: string): SourceRecord {
  const evidence: FieldEvidence[] = [];
  const issues: Issue[] = [];
  const notes: string[] = [];

  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(detailHtml)?.[1];
  const sourceUrl = canonical && canonical.startsWith(`${ORIGIN}/kurs/`) ? canonical : detailUrl;
  const h1 = oneLine(htmlToText(/<h1 class="hl-1 kurs__title">([\s\S]*?)<\/h1>/.exec(detailHtml)?.[1] ?? ""));
  const subtitle = oneLine(htmlToText(/<h2 class="hl-3 kurs__subtitle">([\s\S]*?)<\/h2>/.exec(detailHtml)?.[1] ?? ""));
  if (!h1) throw new HdfLayoutError("Course title missing on detail page");
  const rows = parseKursdaten(detailHtml);
  if (rows.kursnummer !== course.knr) throw new HdfLayoutError(`Detail page Kursnummer "${rows.kursnummer}" does not match ${course.knr}`);
  if (oneLine(course.haupttitel) !== h1) issues.push({ path: "title", message: `API title "${course.haupttitel}" differs from detail page "${h1}"` });
  evidence.push({ field: "externalId", value: course.knr, text: `Kursnummer ${rows.kursnummer}`, locator: "detail › Kursdaten › Kursnummer", method: "explicit" });
  evidence.push({ field: "title", value: h1, text: subtitle ? `${h1} — ${subtitle}` : h1, locator: "detail h1.kurs__title + h2.kurs__subtitle", method: "explicit" });

  const sessions: SourceSession[] = [];
  const cancelled: string[] = [];
  for (const t of course.termine) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.tag)) continue;
    if (/ausfall|fällt|abgesagt|storn/i.test(t.termin_status)) { cancelled.push(t.tag); continue; }
    sessions.push({ date: t.tag, startTime: hm(t.zeitvon), endTime: hm(t.zeitbis), place: course.ortraumname || null });
  }
  sessions.sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  if (cancelled.length) notes.push(`Sessions marked cancelled by the provider were left out: ${cancelled.join(", ")}.`);
  const termin = rows.termine ?? rows.termin ?? "";
  const firstDetailDate = germanLongDateToIso(termin);
  const firstDetailTime = parseTimeRange(termin);
  if (sessions[0] && firstDetailDate && (firstDetailDate !== sessions[0].date || (firstDetailTime.start && firstDetailTime.start !== sessions[0].startTime)))
    issues.push({ path: "startsAt", message: `Detail page "${termin}" disagrees with structured sessions (${sessions[0].date} ${sessions[0].startTime})` });
  evidence.push({ field: "sessions", value: sessions, text: termin || null, locator: "kufer-api termine[] cross-checked with detail › Kursdaten › Termin", method: sessions.length ? "explicit" : "absent" });

  const online = /online/i.test(course.online_kurstyp) || /live online/i.test(h1);
  if (online) notes.push("Online event (LIVE ONLINE); there is no physical venue or city to show.");
  const venueName = online ? "Online" : (rows.ort || course.ortraumname || null);
  const venueCity = online ? null : (course.ortname || null);
  evidence.push({ field: "venue", value: { name: venueName, city: venueCity }, text: rows.ort ?? course.ortraumname, locator: "detail › Kursdaten › Ort; city: kufer-api ortname", method: venueCity ? "explicit" : "absent" });

  const costText = rows.kosten ?? null;
  const apiPrice = Number(course.gebnorm);
  if (costText && Number.isFinite(apiPrice) && !costText.replace(/\./g, "").includes(apiPrice.toFixed(2).replace(".", ",")) && !(apiPrice === 0 && /kostenfrei|kostenlos|0,00/.test(costText)))
    issues.push({ path: "priceEur", message: `Detail fee "${costText}" disagrees with structured fee ${course.gebnorm}` });
  const statusText = rows.status ?? null;
  evidence.push({ field: "capacity", value: { registered: course.tnanmeldungen, max: course.tnmax, apiStatus: course.status }, text: statusText,
    locator: "detail › Kursdaten › Status (kufer-api tnanmeldungen/tnmax for cross-check)", method: statusText ? "explicit" : "absent" });

  const description = htmlToText(course.inhalt);
  return {
    providerId: "haus-der-familie",
    externalId: course.knr,
    detailUrl: sourceUrl,
    fetchedAt,
    adapterVersion: HDF_ADAPTER_VERSION,
    title: subtitle ? `${h1} – ${subtitle}` : h1,
    lead: subtitle || null,
    description,
    audienceText: subtitle || null,
    audienceLabels: audienceLabels(course),
    sessions,
    venueName,
    venueCity,
    costText: costText ?? (Number.isFinite(apiPrice) ? `${course.gebnorm} €` : null),
    statusText,
    evidence,
    extractionIssues: issues,
    adapterNotes: notes,
    formatHint: /vortrag/i.test(subtitle) ? "event" : sessions.length > 1 ? "course" : "workshop",
  };
}

export const hdfAdapter: ProviderAdapter = {
  providerId: "haus-der-familie",
  version: HDF_ADAPTER_VERSION,
  async collect(ctx: AdapterContext) {
    const courses = new Map<string, HdfApiCourse>();
    for (const seed of ctx.provider.scraping?.seedUrls ?? []) {
      let queries: URLSearchParams[];
      let html = "";
      try {
        ({ html } = await ctx.fetch(seed, "listing"));
        queries = discoverHdfQueries(html);
      } catch (error) {
        if (error instanceof PageCapReached) throw error;
        ctx.error(`Seed ${seed}: ${(error as Error).message}`);
        continue;
      }
      if (!queries.length) {
        if (/kufer-search-form/.test(html)) ctx.note(`${seed} is the open course search without preset filters; not queried (it would list every course).`);
        else ctx.error(`No course list configuration found on ${seed} (layout change?)`);
        continue;
      }
      for (const q of queries) {
        const limit = Number(q.get("limit"));
        for (let page = 1; page <= MAX_API_PAGES; page++) {
          q.set("page", String(page));
          let rows: unknown;
          try {
            const { html } = await ctx.fetch(apiUrl(q), "listing");
            rows = JSON.parse(html);
          } catch (error) {
            if (error instanceof PageCapReached) throw error;
            ctx.error(`Course data ${apiUrl(q)}: ${(error as Error).message}`);
            break;
          }
          if (!Array.isArray(rows)) { ctx.error(`Course data ${apiUrl(q)} is not a list (format change)`); break; }
          const parsed = rows.map(readApiCourse).filter((c): c is HdfApiCourse => c !== null);
          if (rows.length && !parsed.length) { ctx.error(`Course data ${apiUrl(q)} has no recognisable courses (format change)`); break; }
          let added = 0;
          for (const c of parsed) if (!courses.has(c.knr)) { courses.set(c.knr, c); added++; }
          ctx.listingOk(added);
          if (rows.length < limit) break;
          if (page === MAX_API_PAGES) ctx.error(`Stopped after ${MAX_API_PAGES} pages of ${seed}; more courses may exist.`);
        }
      }
    }

    for (const course of courses.values()) {
      const title = `${course.haupttitel} – ${course.hauptuntertitel}`;
      const topics = matchTopics([course.haupttitel, course.hauptuntertitel, htmlToText(course.inhalt)].join("\n"));
      if (!topics.length) { ctx.skip(course.knr, title, "No explicit AI/coding/gaming wording", "outOfScope"); continue; }
      const dates = course.termine.map(t => t.tag).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
      const today = ctx.now.toISOString().slice(0, 10);
      if (dates.length && dates[dates.length - 1] < today) { ctx.skip(course.knr, title, "All sessions already past", "ended"); continue; }
      if (dates.length && Date.parse(`${dates[0]}T00:00:00Z`) > ctx.horizon) { ctx.skip(course.knr, title, `Starts ${dates[0]}, after the ${ctx.windowDays}-day window`, "outsideWindow"); continue; }
      try {
        const { html, finalUrl } = await ctx.fetch(hdfDetailUrl(course), "detail");
        ctx.emit(buildHdfRecord(course, html, finalUrl, new Date().toISOString()));
      } catch (error) {
        recordFailure(ctx, course.knr, error);
      }
    }
  },
};
