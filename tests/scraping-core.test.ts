import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { berlinLocalToIso, germanDateToIso } from "../src/server/scraping/berlin-time.ts";
import { ProviderFetcher } from "../src/server/scraping/fetcher.ts";
import { isAllowedUrl, getProvider, type ProviderConfig } from "../src/server/scraping/providers.ts";
import { parseAge, parseAvailability, parsePrice, deriveAudiences, isProfessionalOnly } from "../src/server/normalize/rules.ts";
import { normalizeRecord, offerId } from "../src/server/normalize/to-offer.ts";
import { getOffers, getLatestSourceRun } from "../src/server/catalog/read.ts";
import { runAim } from "../src/server/scraping/runner.ts";
import type { SourceRecord } from "../src/server/scraping/types.ts";

const aim = getProvider("aim");

test("Berlin local times get the correct DST offset; impossible dates are rejected", () => {
  assert.equal(berlinLocalToIso("2027-03-10", "16:00"), "2027-03-10T16:00:00+01:00");
  assert.equal(berlinLocalToIso("2027-04-07", "15:00"), "2027-04-07T15:00:00+02:00");
  assert.equal(berlinLocalToIso("2026-10-25", "03:30"), "2026-10-25T03:30:00+01:00");
  assert.equal(berlinLocalToIso("2027-02-30", "10:00"), null);
  assert.equal(germanDateToIso("03.02.2027"), "2027-02-03");
  assert.equal(germanDateToIso("31.02.2027"), null);
});

test("age, price and availability rules keep unknowns unknown", () => {
  assert.deepEqual(parseAge("Robotik (7–10 Jahre)"), { minAge: 7, maxAge: 10, kind: "range", matched: "7–10 Jahre" });
  assert.equal(parseAge("Python lernen mit KI (ab 16 Jahren)").maxAge, null);
  assert.equal(parseAge("Future Skills (ab 14 J.)").minAge, 14);
  assert.equal(parseAge("Für alle Interessierten").kind, "unknown");
  assert.equal(parsePrice("keine").value, 0);
  assert.equal(parsePrice("Teilnahme: kostenfrei").value, 0);
  assert.equal(parsePrice("45,00 €").value, 45);
  assert.equal(parsePrice("auf Anfrage").value, null);
  assert.equal(parsePrice(null).value, null);
  assert.equal(parseAvailability("ausgebucht").value, "full");
  assert.equal(parseAvailability("frei").value, "available");
  assert.equal(parseAvailability("nur noch wenige Restplätze verfügbar").value, "available");
  assert.equal(parseAvailability("Anmeldung nicht mehr möglich").value, "unknown");
  assert.equal(parseAvailability("Kurs fällt aus").value, "cancelled");
});

test("audiences: parent-only stays parents, staff training is out of scope, no age means no child audience", () => {
  assert.deepEqual(deriveAudiences(["Eltern"], parseAge(null)).map(a => a.value), ["parents"]);
  assert.deepEqual(deriveAudiences(["Schüler/in"], parseAge(null)), []);
  assert.deepEqual(deriveAudiences(["Schüler/in"], parseAge("(8–11 Jahre)")).map(a => a.value), ["children"]);
  assert.deepEqual(deriveAudiences(["Schüler/in"], parseAge("(12–16 Jahre)")).map(a => a.value), ["children", "teens"]);
  assert.equal(isProfessionalOnly(["Lehrkraft", "Schulleitung"]), true);
  assert.equal(isProfessionalOnly(["pädagogische Fachkraft Krippe und Kita", "Kindertagespflegeperson"]), true);
  assert.equal(isProfessionalOnly(["Eltern", "Lehrkraft"]), false);
});

const baseRecord = (): SourceRecord => ({
  providerId: "aim", externalId: "TEST1", detailUrl: "https://www.aim-akademie.org/kurse/kurs/Test/TEST1",
  fetchedAt: "2026-11-14T12:00:00.000Z", adapterVersion: "test", title: "Programmieren mit Scratch (8–11 Jahre)",
  lead: null, description: "Du programmierst ein eigenes Spiel mit Level.", audienceText: null, audienceLabels: ["Schüler/in"],
  sessions: [{ date: "2027-01-10", startTime: null, endTime: null, place: "Bildungscampus" }],
  venueName: "Bildungscampus", venueCity: null, costText: null, statusText: null, evidence: [],
});

test("normalization blocks rather than invents: no time, no city, no price", () => {
  const c = normalizeRecord(baseRecord(), new Date("2026-11-14T12:00:00Z"));
  assert.equal(c.state, "blocked");
  assert.equal(c.offer.startsAt, null, "date-only session does not become midnight");
  assert.equal(c.offer.priceEur, null);
  assert.equal(c.timing, "upcoming");
  assert.ok(c.issues.some(i => i.path === "venue.city"));
  assert.ok(c.reviewNotes.some(n => /no published time/.test(n)));
  assert.equal(offerId("aim", "271420SG"), "aim-271420sg");
  const renamed = normalizeRecord({ ...baseRecord(), title: "Neuer Titel (8–11 Jahre)" });
  assert.equal(renamed.offer.id, c.offer.id, "identity is stable across title changes");
});

test("conflicting age statements are flagged for review", () => {
  const c = normalizeRecord({ ...baseRecord(), audienceText: "für Kinder zwischen 9 und 12 Jahren", venueCity: "Heilbronn" });
  assert.ok(c.issues.some(i => i.path === "minAge" && /Conflicting/.test(i.message)));
});

test("host allowlist blocks other hosts, http, credentials and off-list redirects", async () => {
  assert.equal(isAllowedUrl(aim, "https://www.aim-akademie.org/kurse"), true);
  assert.equal(isAllowedUrl(aim, "http://www.aim-akademie.org/kurse"), false);
  assert.equal(isAllowedUrl(aim, "https://user:pw@www.aim-akademie.org/"), false);
  assert.equal(isAllowedUrl(aim, "https://www.aim-akademie.org.evil.example/"), false);
  const fetchImpl = (async () => new Response(null, { status: 302, headers: { location: "https://tickets.example/x" } })) as typeof fetch;
  const f = new ProviderFetcher(aim, { fetchImpl, minIntervalMs: 0, sleep: async () => {} });
  await assert.rejects(f.get("https://www.aim-akademie.org/kurse", "listing"), /outside the allowlist/);
  await assert.rejects(f.get("https://example.org/", "listing"), /Refusing URL/);
});

test("a failed source run reports failed, stages nothing and is not an empty result", async () => {
  const fetchImpl = (async () => new Response("down", { status: 503 })) as typeof fetch;
  const result = await runAim({ fetchImpl, minIntervalMs: 0, sleep: async () => {}, now: new Date("2026-11-14T12:00:00Z") });
  assert.equal(result.status, "failed");
  assert.equal(result.candidates.length, 0);
  assert.match(result.message, /last published catalogue is kept/);
});

test("a loading placeholder instead of course cards is a layout failure, not 'no events'", async () => {
  const fetchImpl = (async () => new Response("<div>Kurse werden geladen…</div>", { status: 200 })) as typeof fetch;
  const result = await runAim({ fetchImpl, minIntervalMs: 0, sleep: async () => {} });
  assert.equal(result.status, "failed");
  assert.match(result.message, /No course cards recognised/);
});

test("public read serves approved demo data only; staged scraped candidates stay off it", () => {
  const dir = mkdtempSync(join(tmpdir(), "atlas-"));
  mkdirSync(join(dir, "runs"));
  const files = {
    demo: new URL("../data/demo-offers.json", import.meta.url),
    published: pathToFileURL(join(dir, "missing.json")),
    runs: pathToFileURL(join(dir, "runs") + "/"),
  };
  const res = getOffers(undefined, new Date("2026-11-14T10:00:00Z"), files);
  assert.equal(res.status, 200);
  return res.json().then((body: { mode: string; offers: { reviewStatus: string; source: { kind: string } }[]; schemaVersion: number }) => {
    assert.equal(body.schemaVersion, 1);
    assert.equal(body.mode, "demo");
    assert.ok(body.offers.length > 0);
    assert.ok(body.offers.every(o => o.reviewStatus === "approved"));
    delete process.env.INTEREST_ATLAS_LOCAL_DESK;
    assert.equal(getLatestSourceRun("aim", files).status, 404, "desk read is local-only");
    process.env.INTEREST_ATLAS_LOCAL_DESK = "1";
    writeFileSync(join(dir, "runs", "aim-latest.json"), JSON.stringify({ runId: "r", providerId: "aim", adapterVersion: "t", status: "needs-review",
      message: "m", startedAt: "", finishedAt: "", windowDays: 90, pageCap: 20, partialCoverage: false, pages: [], counts: {}, candidates: [] }));
    assert.equal(getLatestSourceRun("aim", files).status, 200);
    assert.equal(getLatestSourceRun("../etc", files).status, 404);
    delete process.env.INTEREST_ATLAS_LOCAL_DESK;
  });
});

test("provider config exposes exactly the four permitted institutions", () => {
  const ids = ["aim", "experimenta", "haus-der-familie", "ipai"].map(id => getProvider(id).id);
  assert.equal(ids.length, 4);
  const p: ProviderConfig = { ...aim, enabled: false };
  assert.throws(() => getProvider("aim", [p]), /disabled/);
});
