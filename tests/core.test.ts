import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildParentHandoff, filterOffers, previewImport, recommendOffers, validateOffer } from "../src/shared/catalog.ts";
import type { Offer } from "../src/shared/contracts.ts";

const offers: Offer[] = JSON.parse(readFileSync(new URL("../data/demo-offers.json", import.meta.url), "utf8"));
const now = new Date("2026-11-14T10:00:00Z");
const copy = (index = 0) => structuredClone(offers[index]);
const verified = () => {
  const offer = copy();
  offer.source = { kind: "verified", url: "https://www.aim-akademie.org/example-only", fetchedAt: now.toISOString(), verifiedAt: now.toISOString() };
  return offer;
};

test("all eight synthetic fixtures validate and cover the four required providers", () => {
  assert.equal(offers.length, 8);
  for (const offer of offers) assert.equal(validateOffer(offer).ok, true, offer.id);
  assert.equal(new Set(offers.map(o => o.providerId)).size, 4);
  assert.ok(offers.every(o => o.source.kind === "demo" && o.source.url === null));
});

test("age, budget and interest constraints combine without treating unknowns as free or suitable", () => {
  const found = filterOffers(offers, { age: 12, maxPriceEur: 0, interests: ["build-games"] }, now);
  assert.deepEqual(found.map(o => o.id), ["demo-aim-game-1"]);
  assert.ok(!filterOffers(offers, { age: 12 }, now).some(o => o.minAge === null || o.maxAge === null));
  assert.ok(!filterOffers(offers, { maxPriceEur: 0 }, now).some(o => o.priceEur === null));
});

test("family results exclude parent-only and school-only offers", () => {
  const found = filterOffers(offers, {}, now);
  assert.ok(!found.some(o => o.id.includes("school") || o.id.includes("parent")));
  assert.deepEqual(filterOffers(offers, { audience: "school" }, now).map(o => o.id), ["demo-experimenta-school-1"]);
  assert.ok(filterOffers(offers, { audience: "parent" }, now).some(o => o.id === "demo-hdf-parent-1"));
});

test("pending, cancelled and past offers never enter public discovery", () => {
  const pending = copy(); pending.reviewStatus = "pending";
  const cancelled = copy(); cancelled.availability = "cancelled";
  assert.equal(filterOffers([pending, cancelled], {}, now).length, 0);
  assert.equal(filterOffers([copy()], {}, new Date("2026-12-01T00:00:00Z")).length, 0);
});

test("date boundaries are inclusive and unknown dates fail a date constraint", () => {
  const start = offers[0].startsAt!;
  const found = filterOffers(offers, { dateFrom: start, dateTo: start }, now);
  assert.deepEqual(found.map(o => o.id), ["demo-aim-game-1"]);
});

test("search handles German case and accents and ANDs query terms", () => {
  const offer = copy(); offer.title.de = "Rätsel für Anfänger";
  assert.equal(filterOffers([offer], { query: "RATSEL anfanger" }, now).length, 1);
  assert.equal(filterOffers([offer], { query: "ratsel fehlt" }, now).length, 0);
});

test("full offers remain visibly searchable but are not recommended as bookable choices", () => {
  assert.ok(filterOffers(offers, { interests: ["robots"] }, now).some(o => o.availability === "full"));
  assert.ok(recommendOffers(offers, { interests: ["robots"] }, now).every(r => r.offer.availability !== "full"));
});

test("recommendations explain matches and have deterministic order without duplicate-preference inflation", () => {
  const filters = { topics: ["coding" as const], interests: ["build-games" as const], age: 12, maxPriceEur: 10 };
  const ranked = recommendOffers(offers, filters, now);
  assert.equal(ranked[0].offer.id, "demo-aim-game-1");
  assert.equal(ranked[0].score, 35);
  assert.ok(ranked[0].reasonKeys.includes("age.suitable"));
  const duplicated = recommendOffers(offers, { ...filters, topics: ["coding", "coding"] }, now);
  assert.equal(duplicated[0].score, ranked[0].score);
  assert.deepEqual(recommendOffers([...offers].reverse(), filters, now).map(r => r.offer.id), ranked.map(r => r.offer.id));
});

test("unknown accessibility never becomes a step-free claim", () => {
  assert.equal(filterOffers(offers, { stepFreeOnly: true }, now).length, 0);
  const accessible = copy(); accessible.venue.access = "step-free";
  assert.equal(filterOffers([accessible], { stepFreeOnly: true }, now).length, 1);
});

test("synthetic parent handoff never offers real registration or includes child profile data", () => {
  const handoff = buildParentHandoff(offers[0], "en");
  assert.equal(handoff.title, offers[0].title.en);
  assert.equal(handoff.registrationUrl, null);
  assert.equal(handoff.noticeKey, "demo.not-a-real-listing");
  assert.ok(!("age" in handoff) && !("query" in handoff) && !("childName" in handoff));
});

test("provider handoff requires reviewed HTTPS data", () => {
  const offer = verified();
  assert.equal(buildParentHandoff(offer).registrationUrl, offer.source.url);
  offer.reviewStatus = "pending";
  assert.equal(buildParentHandoff(offer).registrationUrl, null);
  offer.reviewStatus = "approved"; offer.source.url = "javascript:alert(1)";
  assert.equal(buildParentHandoff(offer).registrationUrl, null);
});

test("validator rejects malformed dates, negative prices and false verification", () => {
  for (const change of [
    { startsAt: "2026-02-30T10:00:00Z" }, { startsAt: "2026-11-21T24:00:00Z" },
    { startsAt: "2026-11-21T10:00:00" }, { endsAt: "2026-11-20T10:00:00Z" },
    { priceEur: -1 }, { priceEur: Number.NaN }, { minAge: 16, maxAge: 8 },
    { source: { kind: "demo", url: "https://example.org", fetchedAt: null, verifiedAt: null } }
  ]) assert.equal(validateOffer({ ...copy(), ...change }).ok, false);
  const offer = verified(); offer.source.verifiedAt = null;
  assert.equal(validateOffer(offer).ok, false);
});

test("invalid filters fail explicitly instead of silently broadening the search", () => {
  assert.throws(() => filterOffers(offers, { age: Number.NaN }, now), RangeError);
  assert.throws(() => filterOffers(offers, { maxPriceEur: -1 }, now), RangeError);
  assert.throws(() => filterOffers(offers, { dateFrom: "tomorrow" }, now), RangeError);
  assert.throws(() => filterOffers(offers, { dateFrom: "2026-12-01T00:00:00Z", dateTo: "2026-11-01T00:00:00Z" }, now), RangeError);
});

test("import preview reports changes and additions without modifying or deleting current data", () => {
  const original = JSON.stringify(offers);
  const changed = copy(); changed.priceEur = 4; changed.reviewStatus = "pending";
  const added = copy(); added.id = "demo-new"; added.externalId = "demo-new";
  const result = previewImport(offers, [changed, added, copy(2), { title: "bad" }]);
  assert.equal(result.added.length, 1);
  assert.deepEqual(result.changed[0].fields, ["priceEur"]);
  assert.deepEqual(result.unchanged, [offers[2].id]);
  assert.equal(result.rejected.length, 1);
  assert.deepEqual(result.deletions, []);
  assert.equal(JSON.stringify(offers), original);
});

test("import rejects duplicate records and unstable IDs but keeps separate sessions", () => {
  const a = copy();
  const unstable = copy(); unstable.id = "changed-id-same-occurrence";
  const later = copy(); later.id = "demo-aim-game-2"; later.startsAt = "2026-11-28T10:00:00+01:00"; later.endsAt = "2026-11-28T12:00:00+01:00";
  const result = previewImport(offers, [a, a, unstable, later]);
  assert.equal(result.rejected.length, 2);
  assert.equal(result.added.length, 1);
  assert.equal(result.added[0].id, later.id);
});

test("import ignores fetch-only changes and unordered tag changes but flags changed source URLs", () => {
  const before = verified();
  const after = structuredClone(before); after.source.fetchedAt = "2026-11-14T11:00:00Z";
  after.topics.reverse(); after.reviewStatus = "pending";
  assert.deepEqual(previewImport([before], [after]).unchanged, [before.id]);
  after.source.url = "https://www.aim-akademie.org/other-example-only";
  assert.deepEqual(previewImport([before], [after]).changed[0].fields, ["source"]);
});

test("an import cannot reuse an existing ID for a different provider", () => {
  const offer = copy(); offer.providerId = "ipai";
  assert.equal(previewImport(offers, [offer]).rejected.length, 1);
});

test("the actual demo upload previews exactly the price change and new session described in the plan", () => {
  const upload: unknown[] = JSON.parse(readFileSync(new URL("../data/demo-import.json", import.meta.url), "utf8"));
  const result = previewImport(offers, upload);
  assert.equal(result.changed.length, 1);
  assert.equal(result.changed[0].before.priceEur, 0);
  assert.equal(result.changed[0].after.priceEur, 4);
  assert.equal(result.added.length, 1);
  assert.equal(result.added[0].id, "demo-ipai-art-2");
  assert.equal(result.rejected.length, 0);
  assert.equal(result.deletions.length, 0);
});
