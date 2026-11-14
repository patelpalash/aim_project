import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Offer } from "../src/shared/contracts.ts";
import { buildParentHandoff, filterOffers, previewImport, validateOffer } from "../src/shared/catalog.ts";
import { getAgeSuitability } from "../src/shared/age.ts";
import { dateFilterInstant, getBerlinDate, getScheduleStatus, resolveBerlinLocalDateTime } from "../src/shared/schedule.ts";
import { DEFAULT_TAXONOMY, getActiveTopics, validateTaxonomy } from "../src/shared/taxonomy.ts";
import { validateCatalogResponse } from "../src/shared/api-contract.ts";
import { countReviewRows, validateReviewPatch, validateReviewSelection, validateReviewSession } from "../src/shared/review.ts";
import type { ReviewSession } from "../src/shared/review.ts";

const read = (name: string) => JSON.parse(readFileSync(new URL(`../examples/${name}.json`, import.meta.url), "utf8"));
const catalog = read("catalog-response");
const offer = () => structuredClone(catalog.offers[1]) as Offer;
const session = () => read("review-session") as ReviewSession;
const now = new Date("2026-11-14T10:00:00Z");

test("configured additional topics work without modifying a union or component", () => {
  const taxonomy = structuredClone(DEFAULT_TAXONOMY);
  taxonomy.version++;
  taxonomy.topics.push({ id: "robotics", label: { de: "Robotik", en: "Robotics" }, enabled: true });
  assert.equal(validateTaxonomy(taxonomy).ok, true);
  const extra = offer(); extra.topics = ["robotics"];
  assert.equal(validateOffer(extra).ok, false);
  assert.equal(validateOffer(extra, taxonomy).ok, true);
  assert.ok(getActiveTopics(taxonomy).some(topic => topic.id === "robotics"));
  assert.equal(filterOffers([extra], { topics: ["robotics"] }, now).length, 1);
});

test("taxonomy rejects duplicate IDs, missing labels and unknown mappings", () => {
  const duplicate = structuredClone(DEFAULT_TAXONOMY); duplicate.topics.push(duplicate.topics[0]);
  assert.equal(validateTaxonomy(duplicate).ok, false);
  const unknown = structuredClone(DEFAULT_TAXONOMY); unknown.interests[0].topicIds = ["missing"];
  assert.equal(validateTaxonomy(unknown).ok, false);
  const label = structuredClone(DEFAULT_TAXONOMY); label.topics[0].label.de = "";
  assert.equal(validateTaxonomy(label).ok, false);
});

test("published minimum-only age does not invent an upper age", () => {
  const value = offer();
  assert.equal(validateOffer(value).ok, true);
  assert.equal(getAgeSuitability(value, 9), "outside-range");
  assert.equal(getAgeSuitability(value, 12), "suitable");
  assert.equal(getAgeSuitability(value, 17), "suitable");
  assert.equal(value.maxAge, null);
  assert.equal(filterOffers([value], { age: 17 }, now).length, 1);
});

test("a legacy incomplete bound remains unknown without explicit evidence", () => {
  const value = offer(); delete value.ageEvidence;
  assert.equal(getAgeSuitability(value, 12), "unknown");
  assert.equal(filterOffers([value], { age: 12 }, now).length, 0);
});

test("all-ages and maximum-only evidence use only published bounds", () => {
  const value = offer(); value.minAge = null; value.maxAge = null; value.ageEvidence = { kind: "all-ages" };
  assert.equal(validateOffer(value).ok, true);
  assert.equal(getAgeSuitability(value, 6), "suitable");
  value.maxAge = 12; value.ageEvidence = { kind: "maximum-only" };
  assert.equal(getAgeSuitability(value, 13), "outside-range");
  assert.equal(getAgeSuitability(value, 8), "suitable");
});

test("age metadata cannot contradict the numeric bounds", () => {
  const value = offer(); value.maxAge = 14;
  assert.equal(validateOffer(value).ok, false);
  value.ageEvidence = { kind: "unknown" };
  assert.equal(validateOffer(value).ok, false);
});

test("date-only records remain valid without manufactured timestamps", () => {
  const value = offer();
  assert.equal(validateOffer(value).ok, true);
  assert.equal(value.startsAt, null);
  const handoff = buildParentHandoff(value);
  assert.equal(handoff.schedulePrecision, "date-only");
  assert.equal(handoff.startDate, "2026-11-28");
  assert.equal(handoff.startsAt, null);
  assert.equal(handoff.ageEvidenceKind, "minimum-only");
  assert.equal(handoff.providerDetailsUrl, null);
});

test("date-only validation rejects impossible dates, backwards ranges and mixed precision", () => {
  assert.equal(validateOffer({ ...offer(), startDate: "2026-02-30" }).ok, false);
  assert.equal(validateOffer({ ...offer(), endDate: "2026-11-27" }).ok, false);
  assert.equal(validateOffer({ ...offer(), startsAt: "2026-11-28T00:00:00+01:00" }).ok, false);
  assert.equal(validateOffer({ ...offer(), schedulePrecision: "unknown" }).ok, false);
});

test("local date filters match timed and date-only offers in Berlin", () => {
  assert.equal(filterOffers([offer()], { dateFrom: "2026-11-28", dateTo: "2026-11-28" }, now).length, 1);
  assert.equal(filterOffers([offer()], { dateFrom: "2026-11-29" }, now).length, 0);
  const timed = structuredClone(catalog.offers[0]);
  timed.startsAt = "2026-11-27T23:30:00Z"; timed.endsAt = "2026-11-28T01:00:00Z";
  assert.equal(filterOffers([timed], { dateFrom: "2026-11-28", dateTo: "2026-11-28" }, now).length, 1);
});

test("date-only records do not promise a precise time-of-day constraint", () => {
  assert.equal(filterOffers([offer()], { dateFrom: "2026-11-28T10:00:00+01:00" }, now).length, 0);
});

test("date-only today/past and explicit ongoing/undated states remain distinct", () => {
  const value = offer();
  const boundary = new Date("2026-11-27T23:30:00Z");
  assert.equal(getBerlinDate(boundary), "2026-11-28");
  assert.equal(getScheduleStatus(value, boundary), "today");
  assert.equal(filterOffers([value], { schedule: "upcoming" }, boundary).length, 1);
  assert.equal(filterOffers([value], {}, new Date("2026-11-29T12:00:00Z")).length, 0);
  const timed = structuredClone(catalog.offers[0]);
  timed.startsAt = "2026-11-14T09:00:00Z"; timed.endsAt = "2026-11-14T11:00:00Z";
  assert.equal(filterOffers([timed], { schedule: "ongoing" }, now).length, 1);
  assert.equal(filterOffers([timed], { schedule: "upcoming" }, now).length, 0);
  delete value.schedulePrecision; delete value.startDate; delete value.endDate;
  assert.equal(filterOffers([value], { schedule: "undated" }, now).length, 1);
});

test("Berlin local-time resolution handles normal winter and summer offsets", () => {
  assert.deepEqual(resolveBerlinLocalDateTime("2026-11-21", "10:00"), { kind: "resolved", timestamp: "2026-11-21T09:00:00.000Z" });
  assert.deepEqual(resolveBerlinLocalDateTime("2026-07-21", "10:00"), { kind: "resolved", timestamp: "2026-07-21T08:00:00.000Z" });
});

test("nonexistent spring time and repeated autumn time require explicit handling", () => {
  assert.equal(resolveBerlinLocalDateTime("2026-03-29", "02:30").kind, "invalid");
  assert.deepEqual(resolveBerlinLocalDateTime("2026-10-25", "02:30"), {
    kind: "ambiguous", candidates: ["2026-10-25T00:30:00.000Z", "2026-10-25T01:30:00.000Z"]
  });
});

test("date filters use 23-hour and 25-hour Berlin days at DST boundaries", () => {
  const duration = (date: string) => dateFilterInstant(date, true) - dateFilterInstant(date) + 1;
  assert.equal(duration("2026-03-29"), 23 * 3_600_000);
  assert.equal(duration("2026-10-25"), 25 * 3_600_000);
  assert.ok(Number.isFinite(dateFilterInstant("9999-12-31", true)));
});

test("date-only rescheduling preserves the ID and previews the changed date", () => {
  const before = offer(), after = offer(); after.startDate = "2026-12-05";
  assert.deepEqual(previewImport([before], [after]).changed[0].fields, ["startDate"]);
  const duplicate = offer(); duplicate.id = "new-id-same-session";
  assert.equal(previewImport([before], [duplicate]).rejected.length, 1);
});

test("concrete catalog, taxonomy and review examples validate against shared contracts", () => {
  assert.equal(validateCatalogResponse(catalog).ok, true);
  assert.equal(validateTaxonomy(read("taxonomy-response")).ok, true);
  assert.equal(validateReviewSession(session()).ok, true);
});

test("approval selection is explicit, returns copies and does not publish drafts", () => {
  const value = session();
  const before = JSON.stringify(value);
  const selected = validateReviewSelection(value, { approve: true, rowIds: ["row-1"], revision: 1 }, { catalogueVersion: 0, now });
  assert.equal(selected.ok, true);
  if (selected.ok) { assert.equal(selected.rows[0].candidate?.reviewStatus, "pending"); selected.rows[0].candidate!.priceEur = 25; }
  assert.equal(JSON.stringify(value), before);
  assert.equal(validateReviewSelection(value, { rowIds: ["row-1"], revision: 1 }, { catalogueVersion: 0, now }).ok, false);
});

test("blocked and unknown rows cannot bypass selected approval", () => {
  for (const ids of [["row-2"], ["row-1", "row-2"], ["missing"], ["row-1", "row-1"]])
    assert.equal(validateReviewSelection(session(), { approve: true, rowIds: ids, revision: 1 }, { catalogueVersion: 0, now }).ok, false);
});

test("stale revisions, changed catalog and expired sessions reject approval", () => {
  const request = { approve: true, rowIds: ["row-1"], revision: 1 };
  assert.equal(validateReviewSelection(session(), { ...request, revision: 2 }, { catalogueVersion: 0, now }).ok, false);
  assert.equal(validateReviewSelection(session(), request, { catalogueVersion: 1, now }).ok, false);
  assert.equal(validateReviewSelection(session(), request, { catalogueVersion: 0, now: new Date("2026-11-14T10:30:00Z") }).ok, false);
});

test("review responses reject inconsistent counts, duplicate rows and source-mode mismatch", () => {
  const wrongCounts = session(); wrongCounts.counts.blocked = 0;
  assert.equal(validateReviewSession(wrongCounts).ok, false);
  const duplicate = session(); duplicate.rows.push(duplicate.rows[0]); duplicate.counts = countReviewRows(duplicate.rows);
  assert.equal(validateReviewSession(duplicate).ok, false);
  const wrongMode = session(); wrongMode.mode = "source";
  assert.equal(validateReviewSession(wrongMode).ok, false);
});

test("patch guard allows partial edits but rejects authority fields and wrong runtime types", () => {
  assert.equal(validateReviewPatch({ revision: 1, changes: { title: { de: "Neuer Titel" }, priceEur: 0 } }), true);
  for (const changes of [{ reviewStatus: "approved" }, { id: "replace" }, { providerId: "other" }, { source: { verifiedAt: now.toISOString() } },
    { priceEur: "free" }, { topics: [5] }, { title: { de: 5 } }, { title: { constructor: "bad" } }, {}])
    assert.equal(validateReviewPatch({ revision: 1, changes }), false);
  // Invalid semantic values can be edited, then become blocked after full revalidation.
  assert.equal(validateReviewPatch({ revision: 1, changes: { priceEur: -1 } }), true);
  assert.equal(validateOffer({ ...offer(), priceEur: -1 }).ok, false);
});

test("public catalog responses reject pending records and synthetic data mislabeled reviewed", () => {
  const pending = structuredClone(catalog); pending.offers[0].reviewStatus = "pending";
  assert.equal(validateCatalogResponse(pending).ok, false);
  assert.equal(validateCatalogResponse({ ...catalog, mode: "reviewed" }).ok, false);
  assert.equal(validateCatalogResponse({ ...catalog, schemaVersion: 2 }).ok, false);
  const duplicate = structuredClone(catalog); duplicate.offers.push(duplicate.offers[0]);
  assert.equal(validateCatalogResponse(duplicate).ok, false);
});
