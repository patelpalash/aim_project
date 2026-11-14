/**
 * One normalization path from a provider-neutral SourceRecord to a pending Offer candidate.
 * Used by every scraping adapter; the CSV intake (U3) will map rows into the same SourceRecord shape.
 */
import { validateOffer } from "../../shared/catalog.ts";
import type { Format, Issue, Offer } from "../../shared/contracts.ts";
import { berlinDate, berlinLocalToIso } from "../scraping/berlin-time.ts";
import type { Candidate, FieldEvidence, SourceRecord, SourceSession, Timing } from "../scraping/types.ts";
import { deriveAudiences, isProfessionalOnly, matchInterests, matchTopics, parseAge, parseAvailability, parsePrice } from "./rules.ts";

const SUMMARY_MAX = 320;

/** Stable occurrence/record id: provider + provider record id. Never a hash of mutable title/date. */
export const offerId = (providerId: string, externalId: string) =>
  `${providerId}-${externalId}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");

function summarize(lead: string | null, description: string): string {
  const base = (lead && lead.length >= 20 ? lead : description).replace(/\s+/g, " ").trim();
  if (base.length <= SUMMARY_MAX) return base;
  const cut = base.slice(0, SUMMARY_MAX);
  const sentence = cut.lastIndexOf(". ");
  return sentence > 120 ? cut.slice(0, sentence + 1) : `${cut.slice(0, cut.lastIndexOf(" "))} …`;
}

function sessionBounds(sessions: SourceSession[]) {
  const timed = sessions.filter(s => s.startTime);
  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  const startsAt = first?.startTime ? berlinLocalToIso(first.date, first.startTime) : null;
  const endsAt = last?.endTime ? berlinLocalToIso(last.date, last.endTime) : null;
  return { startsAt, endsAt, allTimed: timed.length === sessions.length };
}

export function timingOf(sessions: SourceSession[], now: Date): Timing {
  if (!sessions.length) return "undated";
  const today = berlinDate(now);
  const lastDayEnd = (s: SourceSession) =>
    s.endTime ? Date.parse(berlinLocalToIso(s.date, s.endTime) ?? "") : NaN;
  const ended = (s: SourceSession) => {
    const end = lastDayEnd(s);
    return Number.isFinite(end) ? end <= now.getTime() : s.date < today;
  };
  const started = (s: SourceSession) => {
    const start = s.startTime ? Date.parse(berlinLocalToIso(s.date, s.startTime) ?? "") : NaN;
    return Number.isFinite(start) ? start <= now.getTime() : s.date <= today;
  };
  if (sessions.every(ended)) return "ended";
  return started(sessions[0]) ? "ongoing" : "upcoming";
}

export function normalizeRecord(record: SourceRecord, now: Date = new Date()): Candidate {
  const evidence: FieldEvidence[] = [...record.evidence];
  const notes: string[] = [...(record.adapterNotes ?? [])];
  const blocking: Issue[] = [...(record.extractionIssues ?? [])];
  const id = offerId(record.providerId, record.occurrenceKey ? `${record.externalId}-${record.occurrenceKey}` : record.externalId);
  const text = [record.title, record.lead ?? "", record.description].join("\n");

  // Age: prefer the title wording, cross-check against participation text.
  const titleAge = parseAge(record.title);
  const textAge = parseAge(record.audienceText);
  const age = titleAge.kind !== "unknown" ? titleAge : textAge;
  if (titleAge.kind !== "unknown" && textAge.kind !== "unknown" &&
      (titleAge.minAge !== textAge.minAge || titleAge.maxAge !== textAge.maxAge))
    blocking.push({ path: "minAge", message: `Conflicting age statements: "${titleAge.matched}" vs "${textAge.matched}"` });
  evidence.push({ field: "minAge/maxAge", value: { min: age.minAge, max: age.maxAge, kind: age.kind },
    text: age.matched, locator: age === titleAge ? "title" : "participation text",
    method: age.kind === "unknown" ? "absent" : "explicit",
    note: age.kind === "minimum" ? "Published minimum only; no maximum invented." : undefined });

  const price = parsePrice(record.costText);
  evidence.push({ field: "priceEur", value: price.value, text: record.costText, locator: "cost block",
    method: record.costText ? "explicit" : "absent" });

  const availability = parseAvailability(record.statusText);
  evidence.push({ field: "availability", value: availability.value, text: record.statusText, locator: "course status",
    method: record.statusText ? "explicit" : "absent" });

  const topics = matchTopics(text);
  const interests = matchInterests(text);
  evidence.push({ field: "topics", value: topics.map(t => t.value), text: topics.map(t => t.matched).join(" | ") || null,
    locator: "title + description", method: topics.length ? "rule" : "absent" });
  evidence.push({ field: "interests", value: interests.map(t => t.value), text: interests.map(t => t.matched).join(" | ") || null,
    locator: "title + description", method: interests.length ? "rule" : "absent" });

  const audiences = deriveAudiences(record.audienceLabels, age);
  evidence.push({ field: "audiences", value: [...new Set(audiences.map(a => a.value))],
    text: record.audienceLabels.join(", ") || null, locator: "provider audience labels + published age",
    method: audiences.length ? "rule" : "absent" });

  const { startsAt, endsAt, allTimed } = sessionBounds(record.sessions);
  const timing = timingOf(record.sessions, now);
  if (!record.sessions.length) blocking.push({ path: "startsAt", message: "No published session date" });
  else if (!allTimed) notes.push("Some sessions have no published time; times were not invented.");
  if (record.sessions.length > 1)
    notes.push(`Series of ${record.sessions.length} sessions; startsAt is the first session, endsAt the end of the last.`);

  const format: Format = record.formatHint ?? (record.sessions.length > 1 ? "course" : "workshop");
  notes.push("English title/summary copied from the German source text; translation pending review.");

  const outOfScope = isProfessionalOnly(record.audienceLabels);
  if (!topics.length) blocking.push({ path: "topics", message: "No explicit AI/coding/gaming wording found" });
  if (!interests.length) blocking.push({ path: "interests", message: "No discovery interest matched; reviewer must choose one" });
  if (!audiences.length) blocking.push({ path: "audiences", message: record.audienceText
    ? `Published target group "${record.audienceText.slice(0, 120)}" is not a child/teen/family/parent audience; a reviewer may assign one only with evidence`
    : "No published child/teen/family/parent audience" });
  if (!record.venueCity) blocking.push({ path: "venue.city", message: "Venue city not published on the record" });

  const summary = summarize(record.lead, record.description);
  const offer: Offer = {
    id,
    providerId: record.providerId,
    externalId: record.externalId,
    title: { de: record.title, en: record.title },
    summary: { de: summary, en: summary },
    topics: topics.map(t => t.value),
    interests: interests.map(t => t.value),
    audiences: [...new Set(audiences.map(a => a.value))],
    format,
    minAge: age.minAge,
    maxAge: age.maxAge,
    startsAt,
    endsAt,
    timeZone: "Europe/Berlin",
    priceEur: price.value,
    venue: { name: record.venueName ?? "", city: record.venueCity ?? "", access: "unknown" },
    availability: availability.value,
    reviewStatus: "pending",
    source: { kind: "verified", url: record.detailUrl, fetchedAt: record.fetchedAt, verifiedAt: null },
  };

  const validation = validateOffer(offer);
  const issues = [...blocking];
  if (!validation.ok)
    for (const issue of validation.issues)
      if (!issues.some(i => i.path === issue.path || issue.path.startsWith(`${i.path}.`) || i.path.startsWith(`${issue.path}.`)))
        issues.push(issue);

  return {
    rowId: id,
    state: outOfScope ? "out-of-scope" : issues.length ? "blocked" : "ready-for-review",
    timing,
    offer,
    issues,
    reviewNotes: notes,
    evidence,
    sessions: record.sessions,
  };
}
