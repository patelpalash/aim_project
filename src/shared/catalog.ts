import { AUDIENCES, FORMATS, INTERESTS, TOPICS } from "./contracts.ts";
import type { ImportPreview, Issue, Locale, Offer, Recommendation, SearchFilters, Validation } from "./contracts.ts";

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const nonempty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const nullableAge = (v: unknown) => v === null || (Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 120);
const isoDate = (v: unknown): v is string => {
  if (typeof v !== "string") return false;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(v);
  if (!match || !Number.isFinite(Date.parse(v))) return false;
  const [year, month, day] = match[1].split("-").map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  return calendar.getUTCFullYear() === year && calendar.getUTCMonth() === month - 1 &&
    calendar.getUTCDate() === day && Number(match[2]) < 24 && Number(match[3]) < 60 && Number(match[4]) < 60;
};
const httpsUrl = (v: unknown) => {
  if (typeof v !== "string") return false;
  try { const u = new URL(v); return u.protocol === "https:" && !u.username && !u.password; }
  catch { return false; }
};
const normalize = (text: string) => text.toLocaleLowerCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Validate untrusted imports. Unknown prices, ages and dates remain unknown. */
export function validateOffer(input: unknown): Validation {
  const issues: Issue[] = [];
  const issue = (path: string, message: string) => issues.push({ path, message });
  if (!isObject(input)) return { ok: false, issues: [{ path: "$", message: "Expected an offer object" }] };
  for (const key of ["id", "providerId", "externalId"])
    if (!nonempty(input[key]) || String(input[key]).length > 160) issue(key, "Expected a nonempty identifier up to 160 characters");
  for (const key of ["title", "summary"]) {
    const value = input[key];
    if (!isObject(value) || !nonempty(value.de) || !nonempty(value.en)) issue(key, "Both German and English text are required");
  }
  for (const [key, options] of [["topics", TOPICS], ["interests", INTERESTS], ["audiences", AUDIENCES]] as const) {
    const value = input[key];
    if (!Array.isArray(value) || value.length === 0 || value.some(v => !(options as readonly unknown[]).includes(v)))
      issue(key, "Expected a nonempty array of configured values");
  }
  if (!(FORMATS as readonly unknown[]).includes(input.format)) issue("format", "Unknown format");
  for (const key of ["minAge", "maxAge"])
    if (!nullableAge(input[key])) issue(key, "Expected a nonnegative integer age or null");
  if (typeof input.minAge === "number" && typeof input.maxAge === "number" && input.minAge > input.maxAge)
    issue("maxAge", "Maximum age must not precede minimum age");
  for (const key of ["startsAt", "endsAt"])
    if (input[key] !== null && !isoDate(input[key])) issue(key, "Expected a real ISO timestamp with timezone or null");
  if (input.startsAt === null && input.endsAt !== null) issue("endsAt", "An end needs a start");
  if (isoDate(input.startsAt) && isoDate(input.endsAt) && Date.parse(input.endsAt) < Date.parse(input.startsAt))
    issue("endsAt", "End must not precede start");
  if (input.timeZone !== "Europe/Berlin") issue("timeZone", "Prototype events use Europe/Berlin");
  if (input.priceEur !== null && (typeof input.priceEur !== "number" || !Number.isFinite(input.priceEur) || input.priceEur < 0))
    issue("priceEur", "Expected a nonnegative price or null");
  const venue = input.venue;
  if (!isObject(venue) || !nonempty(venue.name) || !nonempty(venue.city) ||
      !["step-free", "not-step-free", "unknown"].includes(String(venue.access))) issue("venue", "Invalid venue");
  if (!["available", "full", "cancelled", "unknown"].includes(String(input.availability))) issue("availability", "Invalid availability");
  if (!["pending", "approved"].includes(String(input.reviewStatus))) issue("reviewStatus", "Invalid review status");
  const source = input.source;
  if (!isObject(source)) issue("source", "Source metadata is required");
  else {
    if (!["demo", "verified"].includes(String(source.kind))) issue("source.kind", "Invalid source kind");
    for (const key of ["fetchedAt", "verifiedAt"])
      if (source[key] !== null && !isoDate(source[key])) issue(`source.${key}`, "Invalid timestamp");
    if (source.kind === "demo" && (source.url !== null || source.fetchedAt !== null || source.verifiedAt !== null))
      issue("source", "Demo data must not claim a real source or verification");
    if (source.kind === "verified" && (!httpsUrl(source.url) || !isoDate(source.fetchedAt)))
      issue("source", "Provider data needs an HTTPS record URL and retrieval time");
    if (source.kind === "verified" && input.reviewStatus === "approved" && !isoDate(source.verifiedAt))
      issue("source.verifiedAt", "Publishing provider data requires a recorded human review");
  }
  return issues.length ? { ok: false, issues } : { ok: true, offer: input as unknown as Offer };
}

function assertFilters(filters: SearchFilters) {
  if (filters.age !== undefined && (!Number.isInteger(filters.age) || filters.age < 0 || filters.age > 120))
    throw new RangeError("Invalid age filter");
  if (filters.maxPriceEur !== undefined && (!Number.isFinite(filters.maxPriceEur) || filters.maxPriceEur < 0))
    throw new RangeError("Invalid budget filter");
  for (const date of [filters.dateFrom, filters.dateTo])
    if (date !== undefined && !isoDate(date)) throw new RangeError("Date filters require ISO timestamps with timezone");
  if (filters.dateFrom && filters.dateTo && Date.parse(filters.dateFrom) > Date.parse(filters.dateTo))
    throw new RangeError("Date range is reversed");
}

/** Public catalogue: approved records only, with unknown values handled conservatively. */
export function filterOffers(offers: readonly Offer[], filters: SearchFilters = {}, now = new Date()): Offer[] {
  assertFilters(filters);
  if (!Number.isFinite(now.getTime())) throw new RangeError("Invalid reference time");
  const terms = normalize(filters.query?.trim() ?? "").split(/\s+/).filter(Boolean);
  return offers.filter(offer => {
    if (offer.reviewStatus !== "approved" || offer.availability === "cancelled") return false;
    const expiry = offer.endsAt ?? offer.startsAt;
    if (expiry && Date.parse(expiry) < now.getTime()) return false;
    const desired = filters.audience === "parent" ? ["parents", "families"] :
      filters.audience === "school" ? ["school-groups"] : ["children", "teens", "families"];
    if (!offer.audiences.some(a => desired.includes(a))) return false;
    if (filters.providerId && offer.providerId !== filters.providerId) return false;
    if (filters.format && offer.format !== filters.format) return false;
    if (filters.topics?.length && !filters.topics.some(t => offer.topics.includes(t))) return false;
    if (filters.interests?.length && !filters.interests.some(t => offer.interests.includes(t))) return false;
    if (filters.age !== undefined && (offer.minAge === null || offer.maxAge === null || filters.age < offer.minAge || filters.age > offer.maxAge)) return false;
    if (filters.maxPriceEur !== undefined && (offer.priceEur === null || offer.priceEur > filters.maxPriceEur)) return false;
    if (filters.stepFreeOnly && offer.venue.access !== "step-free") return false;
    if (filters.dateFrom && (!offer.startsAt || Date.parse(offer.startsAt) < Date.parse(filters.dateFrom))) return false;
    if (filters.dateTo && (!offer.startsAt || Date.parse(offer.startsAt) > Date.parse(filters.dateTo))) return false;
    const haystack = normalize([offer.title.de, offer.title.en, offer.summary.de, offer.summary.en,
      offer.providerId, offer.venue.name, ...offer.topics, ...offer.interests].join(" "));
    return terms.every(term => haystack.includes(term));
  });
}

/** Transparent heuristic ordering. Scores are internal points, not probability or learning impact. */
export function recommendOffers(offers: readonly Offer[], filters: SearchFilters = {}, now = new Date()): Recommendation[] {
  return filterOffers(offers, filters, now).filter(offer => offer.availability !== "full").map(offer => {
    const topics = [...new Set(filters.topics ?? [])].filter(t => offer.topics.includes(t));
    const interests = [...new Set(filters.interests ?? [])].filter(t => offer.interests.includes(t));
    const reasonKeys = [...topics.map(t => `topic.${t}`), ...interests.map(t => `interest.${t}`)];
    if (filters.age !== undefined) reasonKeys.push("age.suitable");
    if (filters.maxPriceEur !== undefined) reasonKeys.push("budget.within");
    if (!reasonKeys.length) reasonKeys.push("discovery.explore");
    return { offer, score: topics.length * 20 + interests.length * 15, reasonKeys };
  }).sort((a, b) => b.score - a.score ||
    (a.offer.startsAt ? Date.parse(a.offer.startsAt) : Infinity) - (b.offer.startsAt ? Date.parse(b.offer.startsAt) : Infinity) ||
    a.offer.id.localeCompare(b.offer.id));
}

/** Same-device parent summary. No child profile, messages, URL tracking or booking is created. */
export function buildParentHandoff(offer: Offer, locale: Locale = "de") {
  const verified = offer.reviewStatus === "approved" && offer.source.kind === "verified" &&
    isoDate(offer.source.verifiedAt) && httpsUrl(offer.source.url);
  return {
    offerId: offer.id,
    title: offer.title[locale],
    summary: offer.summary[locale],
    providerId: offer.providerId,
    startsAt: offer.startsAt,
    timeZone: offer.timeZone,
    priceEur: offer.priceEur,
    ageRange: { min: offer.minAge, max: offer.maxAge },
    venue: offer.venue,
    availability: offer.availability,
    sourceKind: offer.source.kind,
    registrationUrl: verified ? offer.source.url : null,
    noticeKey: offer.source.kind === "demo" ? "demo.not-a-real-listing" : "parent.check-provider-details"
  };
}

const comparableFields = ["providerId", "externalId", "title", "summary", "topics", "interests", "audiences", "format",
  "minAge", "maxAge", "startsAt", "endsAt", "timeZone", "priceEur", "venue", "availability", "source"] as const;
function stable(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.map(stable).sort());
  if (isObject(value)) return JSON.stringify(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return JSON.stringify(value);
}
function fieldValue(offer: Offer, field: typeof comparableFields[number]) {
  // A retrieval timestamp alone is not a content change; a source URL/kind change is.
  return field === "source" ? { kind: offer.source.kind, url: offer.source.url } : offer[field];
}

/** Preview only. Approval, provider allowlists, persistence and fetching belong to Umang's server. */
export function previewImport(current: readonly Offer[], candidates: readonly unknown[]): ImportPreview {
  const byId = new Map<string, Offer>();
  const occurrenceKey = (offer: Offer) => `${offer.providerId}\u0000${offer.externalId}\u0000${offer.startsAt ?? "undated"}`;
  const currentOccurrences = new Map<string, string>();
  for (const offer of current) {
    if (byId.has(offer.id) || currentOccurrences.has(occurrenceKey(offer))) throw new Error("Current catalogue has duplicate IDs or occurrences");
    byId.set(offer.id, offer);
    currentOccurrences.set(occurrenceKey(offer), offer.id);
  }
  const result: ImportPreview = { added: [], changed: [], unchanged: [], rejected: [], deletions: [] };
  const seenIds = new Set<string>();
  const seenOccurrences = new Set<string>();
  candidates.forEach((candidate, index) => {
    const parsed = validateOffer(candidate);
    if (!parsed.ok) { result.rejected.push({ index, issues: parsed.issues }); return; }
    const offer = parsed.offer;
    const occurrence = occurrenceKey(offer);
    const existingId = currentOccurrences.get(occurrence);
    if (seenIds.has(offer.id) || seenOccurrences.has(occurrence) || (existingId && existingId !== offer.id)) {
      result.rejected.push({ index, issues: [{ path: "id", message: "Duplicate offer or unstable occurrence ID" }] });
      return;
    }
    seenIds.add(offer.id);
    seenOccurrences.add(occurrence);
    const before = byId.get(offer.id);
    if (!before) { result.added.push(offer); return; }
    if (before.providerId !== offer.providerId || before.externalId !== offer.externalId) {
      result.rejected.push({ index, issues: [{ path: "id", message: "ID cannot change its provider or external course identity" }] });
      return;
    }
    const fields = comparableFields.filter(field => stable(fieldValue(before, field)) !== stable(fieldValue(offer, field)));
    if (fields.length) result.changed.push({ before, after: offer, fields });
    else result.unchanged.push(offer.id);
  });
  return result;
}
