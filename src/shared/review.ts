import { AUDIENCES, FORMATS } from "./contracts.ts";
import type { Issue, LocalizedText, Offer, Taxonomy } from "./contracts.ts";
import { validateOffer } from "./catalog.ts";
import { DEFAULT_TAXONOMY } from "./taxonomy.ts";
import { isIsoTimestamp, isRecord, nonempty } from "./validation.ts";

export const REVIEW_ROW_STATES = ["ready-new", "ready-update", "needs-review", "blocked", "unchanged"] as const;
export type ReviewRowState = typeof REVIEW_ROW_STATES[number];
/** Partial/unvalidated input stays unknown; only candidate is a validated Offer. */
export type ReviewDraft = Record<string, unknown>;
export interface ReviewRow {
  rowId: string;
  state: ReviewRowState;
  candidate: Offer | null;
  issues: Issue[];
  changedFields: string[];
  draft?: ReviewDraft;
  before?: Offer | null;
}
export interface ReviewSession {
  importId: string;
  revision: number;
  catalogueVersion: number;
  providerId: string;
  mode: "source" | "demo";
  expiresAt: string;
  rows: ReviewRow[];
  counts: Record<ReviewRowState, number>;
}
export interface ReviewApprovalRequest { approve: true; rowIds: string[]; revision: number }
export type ReviewFieldPatch = Partial<Pick<Offer,
  "externalId" | "topics" | "interests" | "audiences" | "format" | "minAge" | "maxAge" | "ageEvidence" |
  "startsAt" | "endsAt" | "schedulePrecision" | "startDate" | "endDate" | "priceEur" | "availability"
>> & { title?: Partial<LocalizedText>; summary?: Partial<LocalizedText>; venue?: Partial<Offer["venue"]>; sourceUrl?: string | null };
export interface ReviewPatchRequest { revision: number; changes: ReviewFieldPatch }

export function countReviewRows(rows: readonly Pick<ReviewRow, "state">[]): Record<ReviewRowState, number> {
  const counts = Object.fromEntries(REVIEW_ROW_STATES.map(state => [state, 0])) as Record<ReviewRowState, number>;
  for (const row of rows) counts[row.state]++;
  return counts;
}

export function validateReviewSession(input: unknown, taxonomy: Taxonomy = DEFAULT_TAXONOMY):
  { ok: true; session: ReviewSession } | { ok: false; issues: Issue[] } {
  const issues: Issue[] = [];
  const issue = (path: string, message: string) => issues.push({ path, message });
  if (!isRecord(input)) return { ok: false, issues: [{ path: "$", message: "Expected review session" }] };
  for (const key of ["importId", "providerId"]) if (!nonempty(input[key])) issue(key, "Expected identifier");
  if (!Number.isSafeInteger(input.revision) || Number(input.revision) < 1) issue("revision", "Expected positive revision");
  if (!Number.isSafeInteger(input.catalogueVersion) || Number(input.catalogueVersion) < 0) issue("catalogueVersion", "Expected catalog version");
  if (input.mode !== "source" && input.mode !== "demo") issue("mode", "Expected source or demo");
  if (!isIsoTimestamp(input.expiresAt)) issue("expiresAt", "Expected expiry timestamp");
  if (!Array.isArray(input.rows) || input.rows.length > 100) issue("rows", "Expected at most 100 rows");
  else {
    const rowIds = new Set<string>();
    input.rows.forEach((row, index) => {
      const path = `rows[${index}]`;
      if (!isRecord(row)) { issue(path, "Expected row object"); return; }
      if (!nonempty(row.rowId) || rowIds.has(row.rowId)) issue(`${path}.rowId`, "Expected unique row ID");
      else rowIds.add(row.rowId);
      if (!(REVIEW_ROW_STATES as readonly unknown[]).includes(row.state)) issue(`${path}.state`, "Unknown row state");
      if (!Array.isArray(row.issues) || row.issues.some(value => !isRecord(value) || !nonempty(value.path) || !nonempty(value.message))) issue(`${path}.issues`, "Expected path/message issues");
      if (!Array.isArray(row.changedFields) || row.changedFields.some(value => typeof value !== "string")) issue(`${path}.changedFields`, "Expected field names");
      if (row.draft !== undefined && !isRecord(row.draft)) issue(`${path}.draft`, "Expected editable partial object");
      if (row.before !== undefined && row.before !== null && !validateOffer(row.before, taxonomy).ok)
        issue(`${path}.before`, "Expected a valid prior offer or null");
      if (row.candidate === null) {
        if (row.state !== "blocked") issue(`${path}.candidate`, "Only blocked rows can lack a valid candidate");
      } else {
        const candidate = validateOffer(row.candidate, taxonomy);
        if (!candidate.ok) issues.push(...candidate.issues.map(value => ({ path: `${path}.candidate.${value.path}`, message: value.message })));
        else {
          if (candidate.offer.providerId !== input.providerId) issue(`${path}.candidate.providerId`, "Candidate belongs to another provider");
          if ((input.mode === "demo") !== (candidate.offer.source.kind === "demo")) issue(`${path}.candidate.source`, "Source kind must agree with session mode");
          if (row.state !== "unchanged" && candidate.offer.reviewStatus !== "pending") issue(`${path}.candidate.reviewStatus`, "Draft candidates must remain pending");
        }
      }
      if (row.state === "blocked" && Array.isArray(row.issues) && !row.issues.length) issue(`${path}.issues`, "Blocked rows need an explanation");
    });
    if (!isRecord(input.counts)) issue("counts", "Expected row state counts");
    else for (const state of REVIEW_ROW_STATES) {
      const actual = input.rows.filter(row => isRecord(row) && row.state === state).length;
      if (input.counts[state] !== actual) issue(`counts.${state}`, "Count does not agree with rows");
    }
  }
  return issues.length ? { ok: false, issues } : { ok: true, session: input as unknown as ReviewSession };
}

/** Pure precondition check; Umang still owns atomic persistence and authorization. */
export function validateReviewSelection(session: ReviewSession, request: unknown, context: {
  catalogueVersion: number; now?: Date; taxonomy?: Taxonomy;
}): { ok: true; rows: ReviewRow[] } | { ok: false; issues: Issue[] } {
  const parsed = validateReviewSession(session, context.taxonomy);
  if (!parsed.ok) return parsed;
  const issues: Issue[] = [];
  const now = context.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new RangeError("Invalid reference time");
  if (!isRecord(request) || request.approve !== true || !Array.isArray(request.rowIds) || !request.rowIds.length ||
      request.rowIds.length > 100 || request.rowIds.some(id => !nonempty(id)) || new Set(request.rowIds).size !== request.rowIds.length)
    return { ok: false, issues: [{ path: "$", message: "Explicit review confirmation and unique selected row IDs are required" }] };
  if (request.revision !== session.revision) issues.push({ path: "revision", message: "Review session changed; reload before approval" });
  if (context.catalogueVersion !== session.catalogueVersion) issues.push({ path: "catalogueVersion", message: "Catalog changed; create a fresh preview" });
  if (Date.parse(session.expiresAt) <= now.getTime()) issues.push({ path: "expiresAt", message: "Review session expired" });
  const rows: ReviewRow[] = [];
  for (const id of request.rowIds) {
    const row = session.rows.find(value => value.rowId === id);
    if (!row || row.state === "blocked" || row.state === "unchanged" || !row.candidate)
      issues.push({ path: "rowIds", message: `Row ${id} is not eligible for publication` });
    else rows.push(row);
  }
  return issues.length ? { ok: false, issues } : { ok: true, rows: structuredClone(rows) };
}

/** Structural patch guard. Normalize/revalidate the resulting draft on the server. */
export function validateReviewPatch(request: unknown): request is ReviewPatchRequest {
  if (!isRecord(request) || !Number.isSafeInteger(request.revision) || Number(request.revision) < 1 || !isRecord(request.changes)) return false;
  const allowed = new Set(["externalId", "title", "summary", "topics", "interests", "audiences", "format", "minAge", "maxAge", "ageEvidence",
    "startsAt", "endsAt", "schedulePrecision", "startDate", "endDate", "priceEur", "venue", "availability", "sourceUrl"]);
  const keys = Object.keys(request.changes);
  if (!keys.length || !keys.every(key => allowed.has(key))) return false;
  return Object.entries(request.changes).every(([key, value]) => {
    if (["title", "summary"].includes(key)) return isRecord(value) && Object.entries(value).every(([locale, text]) => ["de", "en"].includes(locale) && typeof text === "string");
    if (key === "venue") return isRecord(value) && Object.entries(value).every(([field, text]) =>
      ["name", "city"].includes(field) ? typeof text === "string" : field === "access" && ["step-free", "not-step-free", "unknown"].includes(String(text)));
    if (["topics", "interests", "audiences"].includes(key)) return Array.isArray(value) && value.every(id =>
      typeof id === "string" && (key !== "audiences" || (AUDIENCES as readonly string[]).includes(id)));
    if (["minAge", "maxAge", "priceEur"].includes(key)) return value === null || (typeof value === "number" && Number.isFinite(value));
    if (["startsAt", "endsAt", "startDate", "endDate", "sourceUrl"].includes(key)) return value === null || typeof value === "string";
    if (key === "ageEvidence") return isRecord(value) && ["range", "minimum-only", "maximum-only", "all-ages", "unknown"].includes(String(value.kind)) &&
      Object.keys(value).every(field => ["kind", "text"].includes(field)) && (value.text === undefined || typeof value.text === "string");
    if (key === "format") return (FORMATS as readonly unknown[]).includes(value);
    if (key === "availability") return ["available", "full", "cancelled", "unknown"].includes(String(value));
    if (key === "schedulePrecision") return ["date-time", "date-only", "unknown"].includes(String(value));
    return key === "externalId" && typeof value === "string";
  });
}
