import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runProvider } from "../src/server/scraping/runner.ts";
import { normalizeRecord } from "../src/server/normalize/to-offer.ts";
import { validateOffer } from "../src/shared/catalog.ts";
import { ipaiAdapter, parseIpaiDetail, parseIpaiOverview } from "../src/server/scraping/adapters/ipai.ts";
import { apiUrl, buildHdfRecord, discoverHdfQueries, hdfAdapter, hdfDetailUrl, readApiCourse } from "../src/server/scraping/adapters/hdf.ts";
import { experimentaAdapter, parseExperimentaDetail, parseExperimentaListing, terminToLocal, buildExperimentaRecord } from "../src/server/scraping/adapters/experimenta.ts";

const fx = (path: string) => readFileSync(new URL(`./fixtures/${path}`, import.meta.url), "utf8");
const now = new Date("2026-11-14T14:00:00Z");
const fetchedAt = "2026-11-14T15:00:00.000Z";
const quiet = { minIntervalMs: 0, sleep: async () => {}, now };
/** Fake transport: serves fixtures by exact URL, 404 for anything else (and records requests). */
function fakeFetch(routes: Record<string, string>, requested: string[] = []) {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    requested.push(url);
    return url in routes ? new Response(routes[url], { status: 200 }) : new Response("not found", { status: 404 });
  }) as typeof fetch;
}

// ---------------------------------------------------------------- IPAI
test("IPAI overview yields the four event detail URLs and no external ticket links", () => {
  const urls = parseIpaiOverview(fx("ipai/overview.html"));
  assert.equal(urls.length, 4);
  assert.ok(urls.every(u => u.startsWith("https://ipai-foundation.ai/event/")));
});

test("IPAI detail: one occurrence despite duplicated layout blocks; adult audience is not a child offer", () => {
  const r = parseIpaiDetail(fx("ipai/event-10379.html"), "https://ipai-foundation.ai/event/ki-salon-workshop-vibe-coding-ki-agenten-von-der-idee-zur-anwendung/", fetchedAt);
  assert.equal(r.externalId, "10379");
  assert.equal(r.title, "KI SALON WORKSHOP: Vibe Coding & KI-Agenten: Von der Idee zur Anwendung");
  assert.deepEqual(r.sessions, [{ date: "2026-11-23", startTime: "15:00", endTime: "17:00", place: "IPAI Spaces, Im Zukunftspark 11/13, 74076 Heilbronn" }]);
  assert.equal(r.venueCity, "Heilbronn");
  assert.equal(r.costText, "kostenfrei");
  assert.deepEqual(r.extractionIssues, [], "Keyfacts 'Wann' agrees with the header");
  assert.ok(r.adapterNotes?.some(n => /repeated 2×/.test(n)));
  assert.ok(r.adapterNotes?.some(n => /www\.eventbrite\.de; that host is not crawled/.test(n)));
  const c = normalizeRecord(r, now);
  assert.equal(c.offer.priceEur, 0);
  assert.equal(c.offer.format, "workshop");
  assert.equal(c.offer.startsAt, "2026-11-23T15:00:00+01:00");
  assert.deepEqual(c.offer.audiences, []);
  assert.equal(c.state, "blocked");
  assert.ok(c.issues.some(i => i.path === "audiences" && /Alle interessierten KI-Nutzer/.test(i.message)));
});

test("IPAI full run through the shared runner (offline fixtures)", async () => {
  const routes: Record<string, string> = { "https://ipai-foundation.ai/": fx("ipai/overview.html") };
  routes["https://ipai-foundation.ai/event/ki-salon-workshop-vibe-coding-ki-agenten-von-der-idee-zur-anwendung/"] = fx("ipai/event-10379.html");
  routes["https://ipai-foundation.ai/event/ki-salon-community-event-21/"] = fx("ipai/event-9445.html");
  const result = await runProvider(ipaiAdapter, { ...quiet, fetchImpl: fakeFetch(routes) });
  assert.equal(result.counts.listed, 4);
  assert.equal(result.counts.failed, 2, "two detail pages are not in the fixture set and must count as failures");
  assert.equal(result.status, "partial");
  assert.deepEqual(result.candidates.map(c => c.offer.id), ["ipai-10379", "ipai-9445"]);
  assert.equal(result.candidates[1].offer.format, "event", "category 'Community' is not a workshop");
});

// ---------------------------------------------------------------- Haus der Familie
test("HdF query discovery replays exactly what the public pages request", () => {
  const [block] = discoverHdfQueries(fx("hdf/seed-digitale-familienwerkstatt.html"));
  assert.equal(apiUrl(block), "https://hdf-hn.de/kufer-api.php?keyword=digitale+medien&keyword_relation=or&kategorie_id=0&page=1&limit=120&endpoint=%2Fkurse%2F");
  const [form] = discoverHdfQueries(fx("hdf/seed-kinder-jugendliche.html"));
  assert.equal(apiUrl(form), "https://hdf-hn.de/kufer-api.php?endpoint=kurse&fachb=3&limit=48&page=1");
});

test("HdF record: JSON sessions cross-checked with the public Kursdaten table; no tutor data kept", () => {
  const rows = JSON.parse(fx("hdf/api-fachb3-p1.json")) as unknown[];
  const course = rows.map(readApiCourse).find(c => c?.knr === "261H304002")!;
  assert.ok(course);
  assert.equal("dozenten" in course, false);
  assert.equal(hdfDetailUrl(course), "https://hdf-hn.de/kurs/programmieren-lernen-scratch-261H304002/");
  const r = buildHdfRecord(course, fx("hdf/kurs-261H304002.html"), hdfDetailUrl(course), fetchedAt);
  assert.deepEqual(r.extractionIssues, []);
  assert.equal(r.statusText, "Ausgebucht");
  const c = normalizeRecord(r, now);
  assert.equal(c.state, "ready-for-review");
  assert.equal(c.offer.id, "haus-der-familie-261h304002");
  assert.equal(c.offer.startsAt, "2026-11-28T12:30:00+01:00");
  assert.equal(c.offer.endsAt, "2026-11-28T15:30:00+01:00");
  assert.deepEqual([c.offer.minAge, c.offer.maxAge], [8, 12]);
  assert.equal(c.offer.priceEur, 30);
  assert.equal(c.offer.availability, "full");
  assert.deepEqual(c.offer.audiences, ["children"]);
  assert.equal(c.offer.venue.city, "Heilbronn");
  assert.equal(c.offer.source.url, "https://hdf-hn.de/kurs/programmieren-lernen-scratch-261H304002/");
  assert.equal(validateOffer(c.offer).ok, true);
  assert.doesNotMatch(JSON.stringify(c), /Kucharski|@gmail/i);
});

test("HdF fee disagreement between JSON and the detail page blocks the record", () => {
  const course = (JSON.parse(fx("hdf/api-fachb3-p1.json")) as unknown[]).map(readApiCourse).find(c => c?.knr === "261H304002")!;
  const r = buildHdfRecord({ ...course, gebnorm: "45.00" }, fx("hdf/kurs-261H304002.html"), hdfDetailUrl(course), fetchedAt);
  assert.ok(r.extractionIssues?.some(i => i.path === "priceEur"));
  assert.equal(normalizeRecord(r, now).state, "blocked");
});

test("HdF full run: placeholder pages are not empty results; out-of-topic courses are skipped with reasons", async () => {
  const requested: string[] = [];
  const course = "https://hdf-hn.de/kurs/programmieren-lernen-scratch-261H304002/";
  const routes: Record<string, string> = {
    "https://hdf-hn.de/angebote/digitale-familienwerkstatt/": fx("hdf/seed-digitale-familienwerkstatt.html"),
    "https://hdf-hn.de/kurse/": "<form class=\"kufer-search-form\"><select name=\"fachb\"><option value=\"\">Fachbereiche</option></select></form>",
    "https://hdf-hn.de/kinder-jugendliche/": fx("hdf/seed-kinder-jugendliche.html"),
    "https://hdf-hn.de/kufer-api.php?keyword=digitale+medien&keyword_relation=or&kategorie_id=0&page=1&limit=120&endpoint=%2Fkurse%2F": fx("hdf/api-digitale-medien.json"),
    "https://hdf-hn.de/kufer-api.php?endpoint=kurse&fachb=3&limit=48&page=1": fx("hdf/api-fachb3-p1.json"),
    "https://hdf-hn.de/kufer-api.php?endpoint=kurse&fachb=3&limit=48&page=2": fx("hdf/api-fachb3-p2.json"),
    [course]: fx("hdf/kurs-261H304002.html"),
  };
  const result = await runProvider(hdfAdapter, { ...quiet, fetchImpl: fakeFetch(routes, requested), pageCap: 40 });
  assert.equal(result.counts.listed, 12 + 57 - 1, "the Scratch course appears in both queries and is counted once");
  assert.ok(result.candidates.some(c => c.offer.id === "haus-der-familie-261h304002" && c.state === "ready-for-review"));
  assert.ok(result.skipped.some(s => s.reason === "No explicit AI/coding/gaming wording"));
  assert.match(result.message, /open course search without preset filters/);
  assert.ok(requested.every(u => u.startsWith("https://hdf-hn.de/")), "never leaves the allowed host");
  const placeholder = await runProvider(hdfAdapter, { ...quiet, fetchImpl: fakeFetch({}) });
  assert.equal(placeholder.status, "failed");
});

// ---------------------------------------------------------------- experimenta
test("experimenta listing: termin is local wall-clock time; dome shows and teacher training are recognised", () => {
  const cards = parseExperimentaListing(fx("experimenta/listing-trimmed.html"));
  assert.equal(cards.length, 6);
  const fll = cards.find(c => c.eventId === "15158")!;
  assert.equal(fll.termin, "1796468400");
  assert.deepEqual(terminToLocal(fll.termin), { date: "2026-12-05", time: "11:00" });
  assert.match(fll.timeText, /11:00 bis 17:00/);
  assert.ok(cards.find(c => c.eventId === "3895")?.groups.includes("science-dome-shows"));
  assert.ok(cards.find(c => c.eventId === "78555")?.groups.includes("fortbildung"));
});

test("experimenta record: occurrence identity, JSON-LD agreement, explicit free entry, age minimum", () => {
  const card = parseExperimentaListing(fx("experimenta/listing-trimmed.html")).find(c => c.eventId === "28151")!;
  const detail = parseExperimentaDetail(fx("experimenta/detail-maker-faire.html"));
  assert.equal(detail.city, "Heilbronn");
  const r = buildExperimentaRecord(card, detail, fetchedAt);
  assert.deepEqual(r.extractionIssues, []);
  const c = normalizeRecord(r, now);
  assert.equal(c.offer.id, "experimenta-28151-1801908000");
  assert.equal(c.offer.startsAt, "2027-02-06T10:00:00+01:00");
  assert.equal(c.offer.endsAt, "2027-02-06T18:00:00+01:00");
  assert.equal(c.offer.priceEur, 0, "'Die Teilnahme ist kostenfrei.'");
  assert.deepEqual([c.offer.minAge, c.offer.maxAge], [14, null]);
  assert.equal(c.offer.source.url, "https://www.experimenta.science/besuchen/veranstaltungskalender/maker-faire/?termin=1801908000");
  assert.equal(c.offer.topics.length, 0, "'Community' must not trigger the Unity/gaming rule");
});

test("experimenta FLL Challenge: time agrees with JSON-LD after termin fix", () => {
  const card = parseExperimentaListing(fx("experimenta/listing-trimmed.html")).find(c => c.eventId === "15158")!;
  const r = buildExperimentaRecord(card, parseExperimentaDetail(fx("experimenta/detail-fll-challenge.html")), fetchedAt);
  assert.deepEqual(r.extractionIssues, []);
  assert.equal(normalizeRecord(r, now).offer.startsAt, "2026-12-05T11:00:00+01:00");
});

test("experimenta full run: dome shows and teacher training skipped without detail requests", async () => {
  const requested: string[] = [];
  const routes: Record<string, string> = {
    "https://www.experimenta.science/besuchen/veranstaltungen/": fx("experimenta/listing-trimmed.html"),
    "https://www.experimenta.science/besuchen/veranstaltungskalender/first-lego-league-regionalwettbewerb-heilbronn/?termin=1796468400": fx("experimenta/detail-fll-challenge.html"),
    "https://www.experimenta.science/besuchen/veranstaltungskalender/maker-faire/?termin=1801908000": fx("experimenta/detail-maker-faire.html"),
  };
  const result = await runProvider(experimentaAdapter, { ...quiet, windowDays: 120, fetchImpl: fakeFetch(routes, requested) });
  assert.ok(!requested.some(u => /blitzgescheit|fortbildung/.test(u)));
  assert.ok(result.skipped.some(s => s.reason === "Planetarium/dome show"));
  assert.ok(result.skipped.some(s => s.reason === "Teacher training (Fortbildung)"));
  assert.ok(result.skipped.some(s => s.title.startsWith("Maker Faire") && s.reason === "No explicit AI/coding/gaming wording"));
  assert.equal(result.counts.failed, 1, "FLL Explore detail is missing from fixtures and is reported, not dropped");
});
