import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalAimDetailUrl, parseAimDetail, parseAimListing, AimLayoutError } from "../src/server/scraping/adapters/aim.ts";
import { normalizeRecord } from "../src/server/normalize/to-offer.ts";
import { validateOffer } from "../src/shared/catalog.ts";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/aim/${name}`, import.meta.url), "utf8");
const now = new Date("2026-11-14T14:00:00Z");
const fetchedAt = "2026-11-14T14:49:09.000Z";
const cards = parseAimListing(fixture("listing-digital.html"));
const card = (knr: string) => {
  const c = cards.find(x => x.externalId === knr);
  assert.ok(c, `listing card ${knr}`);
  return c;
};
const record = (knr: string) => parseAimDetail(fixture(`detail-${knr}.html`), card(knr).detailUrl, fetchedAt, card(knr));

test("listing yields unique course cards with canonical detail URLs and never cart links", () => {
  assert.equal(cards.length, 35);
  assert.equal(new Set(cards.map(c => c.externalId)).size, cards.length);
  for (const c of cards) {
    assert.match(c.detailUrl, /^https:\/\/www\.aim-akademie\.org\/kurse\/kurs\/[^?]+\/[A-Za-z0-9]+$/);
    assert.ok(c.detailUrl.endsWith(`/${c.externalId}`));
  }
  assert.deepEqual(card("271420SG").audienceLabels, ["Schüler/in"]);
  assert.equal(card("271420SG").statusText, "frei");
  assert.equal(canonicalAimDetailUrl("/kurse/kurs/X/271430UN?knradd=271430UN"), "https://www.aim-akademie.org/kurse/kurs/X/271430UN");
  assert.equal(canonicalAimDetailUrl("https://evil.example/kurse/kurs/X/1"), null);
});

test("first genuine record: Talking Plants 271420SG normalizes with exact source evidence", () => {
  const c = normalizeRecord(record("271420SG"), now);
  assert.equal(c.state, "ready-for-review");
  assert.equal(c.timing, "upcoming");
  assert.deepEqual(c.issues, []);
  const o = c.offer;
  assert.equal(o.id, "aim-271420sg");
  assert.equal(o.externalId, "271420SG");
  assert.equal(o.title.de, "Talking Plants – Programmiere deine Pflanze, bis sie spricht (12–16 Jahre)");
  assert.equal(o.startsAt, "2027-03-10T16:00:00+01:00");
  assert.equal(o.endsAt, "2027-03-10T19:15:00+01:00");
  assert.deepEqual([o.minAge, o.maxAge], [12, 16]);
  assert.equal(o.priceEur, 0, "\"Kosten: keine\" is explicitly free");
  assert.equal(o.availability, "available");
  assert.deepEqual(o.topics.sort(), ["ai", "coding"]);
  assert.deepEqual(o.audiences.sort(), ["children", "teens"]);
  assert.equal(o.venue.name, "Bildungscampus");
  assert.equal(o.venue.access, "unknown", "access is never inferred");
  assert.equal(o.reviewStatus, "pending", "scraper never approves");
  assert.deepEqual(o.source, {
    kind: "verified",
    url: "https://www.aim-akademie.org/kurse/kurs/Talking-Plants-Programmiere-deine-Pflanze-bis-sie-spricht-1216-Jahre/271420SG",
    fetchedAt, verifiedAt: null,
  });
  assert.equal(validateOffer(o).ok, true);
  const sessions = c.evidence.find(e => e.field === "sessions");
  assert.equal(sessions?.text, "10.03.2027 | 16:00 - 19:15 Uhr | Bildungscampus");
  assert.equal(c.evidence.find(e => e.field === "statusText")?.text, "frei");
  const venue = c.evidence.find(e => e.field === "venue");
  assert.equal(venue?.method, "derived", "city comes from a printed address naming the venue and is flagged for review");
});

test("only the course's own date table is used, not related-course dates (262410KIDT trap)", () => {
  const r = record("262410KIDT");
  assert.deepEqual(r.sessions, [{ date: "2026-11-14", startTime: "10:30", endTime: "16:00", place: "Bildungscampus" }]);
  assert.match(fixture("detail-262410KIDT.html"), /2027/, "fixture really contains other dates");
  assert.equal(r.statusText, "Anmeldung nicht mehr möglich", "sidebar status, not related-course badges");
  const c = normalizeRecord(r, now);
  assert.equal(c.offer.availability, "unknown", "closed registration is not 'cancelled' or 'full'");
  assert.equal(c.timing, "ongoing");
  assert.equal(normalizeRecord(r, new Date("2026-11-14T15:30:00Z")).timing, "ended");
});

test("'ab 10 Jahren' stays a minimum age; no upper bound is invented", () => {
  const c = normalizeRecord(record("262410KIDT"), now);
  assert.equal(c.offer.minAge, 10);
  assert.equal(c.offer.maxAge, null);
  assert.equal(c.evidence.find(e => e.field === "minAge/maxAge")?.note, "Published minimum only; no maximum invented.");
});

test("full course with its own address: Unity 271430UN", () => {
  const c = normalizeRecord(record("271430UN"), now);
  assert.equal(c.offer.availability, "full");
  assert.equal(c.offer.venue.name, "Hochschule Heilbronn, TechCampus");
  assert.equal(c.offer.venue.city, "Heilbronn");
  assert.equal(c.evidence.find(e => e.field === "venue")?.method, "explicit");
  assert.deepEqual(c.offer.topics, ["gaming"]);
  assert.ok(c.offer.interests.includes("build-games"));
});

test("detail parser refuses a page whose course block does not match the requested record", () => {
  const wrongUrl = card("271420SG").detailUrl.replace("271420SG", "271430UN");
  assert.throws(() => parseAimDetail(fixture("detail-271420SG.html"), wrongUrl, fetchedAt), AimLayoutError);
  assert.throws(() => parseAimDetail("<html>Kurse werden geladen…</html>", card("271420SG").detailUrl, fetchedAt), AimLayoutError);
});
