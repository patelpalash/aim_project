/**
 * U4: one review/publication service for CSV uploads and scraped source runs.
 *
 * - Sessions are stored server-side (data/review-sessions/, git-ignored) with revision,
 *   catalogue version and expiry; rows use main's shared `ReviewSession` contract.
 * - Inline edits (allowlisted, `validateReviewPatch`) update only the draft, revalidate and
 *   bump the revision. Stale revision/catalogue → 409 (ReviewConflict).
 * - Approval (`validateReviewSelection`) publishes only selected eligible rows, atomically,
 *   sets the human review time, bumps the catalogue version and is idempotent on repeat.
 * - Blocked rows can never publish; unchanged rows are skipped; nothing is deleted.
 */
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { validateOffer } from "../../shared/catalog.ts";
import type { Issue, Offer, Taxonomy } from "../../shared/contracts.ts";
import {
  countReviewRows, validateReviewPatch, validateReviewSelection,
  type ReviewRow, type ReviewRowState, type ReviewSession,
} from "../../shared/review.ts";
import { loadProviders, isAllowedUrl } from "../scraping/providers.ts";
import type { Candidate } from "../scraping/types.ts";
import { berlinLocalToIso, berlinParts } from "../scraping/berlin-time.ts";

export const SESSION_TTL_MS = 30 * 60_000;

export class ReviewError extends Error {
  readonly status: number; readonly code: string; readonly issues: Issue[];
  constructor(status: number, code: string, message: string, issues: Issue[] = []) {
    super(message); this.status = status; this.code = code; this.issues = issues;
  }
}

export interface Store { dataDir: string }
export const defaultStore = (): Store => ({ dataDir: join(/*turbopackIgnore: true*/ process.cwd(), "data") });
const paths = (s: Store) => ({
  published: join(s.dataDir, "catalog", "published-offers.json"),
  sessions: join(s.dataDir, "review-sessions"),
});

function writeAtomic(file: string, body: unknown) {
  mkdirSync(join(file, ".."), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(body, null, 2)}\n`, "utf8");
  renameSync(tmp, file);
}

export interface PublishedCatalog { catalogueVersion: number; publishedAt: string | null; offers: Offer[] }
export function readPublished(store: Store = defaultStore()): PublishedCatalog {
  const file = paths(store).published;
  return existsSync(/*turbopackIgnore: true*/ file) ? JSON.parse(readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as PublishedCatalog : { catalogueVersion: 0, publishedAt: null, offers: [] };
}

/** Stored session = shared contract + server-only evidence/notes and approval memo (for idempotency). */
interface StoredSession extends ReviewSession {
  createdAt: string;
  notes: Record<string, string[]>;
  evidence: Record<string, unknown>;
  approvals: { key: string; result: ApprovalResult }[];
}
export interface ApprovalResult { approved: true; publishedCount: number; blockedCount: number; unchangedCount: number; catalogueVersion: number }

const sessionFile = (s: Store, id: string) => {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new ReviewError(404, "NOT_FOUND", "Import not found or expired.");
  return join(paths(s).sessions, `${id}.json`);
};
function loadSession(store: Store, id: string, now: Date): StoredSession {
  const file = sessionFile(store, id);
  if (!existsSync(file)) throw new ReviewError(404, "NOT_FOUND", "Import not found or expired.");
  const session = JSON.parse(readFileSync(file, "utf8")) as StoredSession;
  if (Date.parse(session.expiresAt) <= now.getTime()) throw new ReviewError(404, "EXPIRED", "Review session expired; upload again.");
  return session;
}
const saveSession = (store: Store, s: StoredSession) => writeAtomic(sessionFile(store, s.importId), s);

/** Public view of a session: the shared ReviewSession shape plus reviewer notes. */
export function publicSession(s: StoredSession): ReviewSession & { notes: Record<string, string[]> } {
  const { importId, revision, catalogueVersion, providerId, mode, expiresAt, rows, counts, notes } = s;
  return { importId, revision, catalogueVersion, providerId, mode, expiresAt, rows, counts, notes };
}

const COMPARABLE = ["externalId", "title", "summary", "topics", "interests", "audiences", "format", "minAge", "maxAge", "ageEvidence",
  "startsAt", "endsAt", "schedulePrecision", "startDate", "endDate", "priceEur", "venue", "availability"] as const;
const canon = (v: unknown): string => Array.isArray(v) ? JSON.stringify(v.map(canon).sort())
  : v && typeof v === "object" ? JSON.stringify(Object.keys(v).sort().map(k => [k, canon((v as Record<string, unknown>)[k])])) : JSON.stringify(v ?? null);
function changedFields(before: Offer, after: Offer): string[] {
  const fields: string[] = COMPARABLE.filter(f => canon(before[f]) !== canon(after[f]));
  if (before.source.url !== after.source.url || before.source.kind !== after.source.kind) fields.push("source");
  return fields;
}

interface Context { taxonomy: Taxonomy; providerId: string; mode: "source" | "demo"; published: Map<string, Offer> }

/** Classify one draft: hard failures → blocked (candidate null); otherwise new/update/unchanged/needs-review. */
function classify(rowId: string, draft: Record<string, unknown>, hardIssues: Issue[], notes: string[], ctx: Context): ReviewRow {
  const issues = [...hardIssues];
  const provider = loadProviders().find(p => p.id === ctx.providerId);
  if (draft.providerId !== ctx.providerId) issues.push({ path: "providerId", message: "Row belongs to another provider" });
  const source = draft.source as Offer["source"] | undefined;
  if (ctx.mode === "source") {
    if (!source?.url) issues.push({ path: "sourceUrl", message: "Real records need the exact source record URL" });
    else if (!provider || !isAllowedUrl(provider, source.url)) issues.push({ path: "sourceUrl", message: `Source URL is not on ${ctx.providerId}'s allowed hosts` });
  }
  if ((draft.schedulePrecision ?? "unknown") === "unknown") {
    if (!issues.some(i => i.path === "startsAt")) issues.push({ path: "startsAt", message: "A date is required before publication" });
  }
  const validation = validateOffer(draft, ctx.taxonomy);
  if (!validation.ok)
    for (const i of validation.issues) if (!issues.some(x => x.path === i.path)) issues.push(i);
  const before = ctx.published.get(rowId) ?? null;
  if (before && before.providerId !== ctx.providerId) issues.push({ path: "id", message: "This ID already belongs to another provider" });
  if (issues.length) return { rowId, state: "blocked", candidate: null, issues, changedFields: [], draft, before };
  const candidate = validation.ok ? validation.offer : null!;
  if (before) {
    const fields = changedFields(before, candidate);
    if (!fields.length) return { rowId, state: "unchanged", candidate, issues: [], changedFields: [], draft, before };
    return { rowId, state: notes.length ? "needs-review" : "ready-update", candidate, issues: [], changedFields: fields, draft, before };
  }
  return { rowId, state: notes.length ? "needs-review" : "ready-new", candidate, issues: [], changedFields: [...COMPARABLE].filter(f => draft[f] !== undefined), draft, before: null };
}

export interface DraftInput { rowId: string; draft: Record<string, unknown>; issues: Issue[]; notes: string[]; evidence?: unknown }

export function createSession(input: {
  providerId: string; mode: "source" | "demo"; drafts: DraftInput[]; taxonomy: Taxonomy; now?: Date; store?: Store;
}): ReturnType<typeof publicSession> {
  const store = input.store ?? defaultStore();
  const now = input.now ?? new Date();
  const provider = loadProviders().find(p => p.id === input.providerId && p.enabled);
  if (!provider) throw new ReviewError(400, "UNKNOWN_PROVIDER", `Unknown or disabled provider "${input.providerId}".`);
  if (input.drafts.length > 100) throw new ReviewError(413, "TOO_MANY_ROWS", "At most 100 rows per import.");
  const published = readPublished(store);
  const ctx: Context = { taxonomy: input.taxonomy, providerId: input.providerId, mode: input.mode, published: new Map(published.offers.map(o => [o.id, o])) };
  const seen = new Set<string>();
  const rows: ReviewRow[] = [];
  const notes: Record<string, string[]> = {};
  const evidence: Record<string, unknown> = {};
  input.drafts.forEach((d, index) => {
    let rowId = d.rowId;
    const extra: Issue[] = [];
    if (seen.has(rowId)) { extra.push({ path: "externalId", message: "Duplicate identity in this upload; only the first row can publish" }); rowId = `${rowId}~dup${index}`; }
    seen.add(rowId);
    notes[rowId] = d.notes;
    if (d.evidence !== undefined) evidence[rowId] = d.evidence;
    rows.push(classify(rowId, d.draft, [...d.issues, ...extra], d.notes, ctx));
  });
  const session: StoredSession = {
    importId: randomUUID(), revision: 1, catalogueVersion: published.catalogueVersion, providerId: input.providerId,
    mode: input.mode, expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(), rows, counts: countReviewRows(rows),
    createdAt: now.toISOString(), notes, evidence, approvals: [],
  };
  saveSession(store, session);
  return publicSession(session);
}

export function getSession(importId: string, opts: { now?: Date; store?: Store } = {}) {
  return publicSession(loadSession(opts.store ?? defaultStore(), importId, opts.now ?? new Date()));
}

/** Apply an allowlisted correction to one row's draft and revalidate. Public catalogue is untouched. */
export function patchRow(importId: string, rowId: string, request: unknown, opts: { taxonomy: Taxonomy; now?: Date; store?: Store }) {
  const store = opts.store ?? defaultStore();
  const now = opts.now ?? new Date();
  const session = loadSession(store, importId, now);
  if (!validateReviewPatch(request)) throw new ReviewError(400, "INVALID_PATCH", "Only allowlisted fields with valid value types can be changed.");
  if (request.revision !== session.revision) throw new ReviewError(409, "STALE_REVISION", "The review session changed; reload before editing.");
  const index = session.rows.findIndex(r => r.rowId === rowId);
  if (index < 0) throw new ReviewError(404, "NOT_FOUND", "Row not found.");
  const row = session.rows[index];
  const draft = structuredClone(row.draft ?? row.candidate ?? {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(request.changes)) {
    if (key === "title" || key === "summary" || key === "venue") draft[key] = { ...(draft[key] as object ?? {}), ...(value as object) };
    else if (key === "sourceUrl") draft.source = { ...(draft.source as object), url: value };
    else draft[key] = value;
  }
  const changes = request.changes as Record<string, unknown>;
  // Date edit from a simple date field: keep the published times on a timed record (move the session),
  // otherwise the record becomes date-only. Never invent a time.
  if ("startDate" in changes && !("schedulePrecision" in changes) && !("startsAt" in changes)) {
    const day = changes.startDate as string | null;
    const prevStart = typeof row.draft?.startsAt === "string" ? row.draft.startsAt : row.candidate?.startsAt ?? null;
    const prevEnd = typeof row.draft?.endsAt === "string" ? row.draft.endsAt : row.candidate?.endsAt ?? null;
    if (day && prevStart) {
      const start = berlinLocalToIso(day, berlinParts(new Date(prevStart)).time);
      const sameDayEnd = prevEnd && berlinParts(new Date(prevEnd)).date === berlinParts(new Date(prevStart)).date;
      draft.startsAt = start;
      draft.endsAt = prevEnd && sameDayEnd ? berlinLocalToIso(day, berlinParts(new Date(prevEnd)).time) : null;
      draft.schedulePrecision = start ? "date-time" : "unknown";
      delete draft.startDate; delete draft.endDate;
    } else if (day) {
      draft.schedulePrecision = "date-only";
      draft.startsAt = null; draft.endsAt = null;
      if (!("endDate" in changes) || !draft.endDate || (draft.endDate as string) < day) draft.endDate = day;
    } else {
      draft.schedulePrecision = "unknown";
      draft.startsAt = null; draft.endsAt = null; delete draft.startDate; delete draft.endDate;
    }
  }
  // Age edit without explicit evidence: the evidence kind follows the edited published bounds.
  if (("minAge" in changes || "maxAge" in changes) && !("ageEvidence" in changes)) {
    const min = draft.minAge as number | null, max = draft.maxAge as number | null;
    const kind = min !== null && max !== null ? "range" : min !== null ? "minimum-only" : max !== null ? "maximum-only" : "unknown";
    draft.ageEvidence = { kind };
  }
  draft.reviewStatus = "pending";
  const published = readPublished(store);
  const ctx: Context = { taxonomy: opts.taxonomy, providerId: session.providerId, mode: session.mode, published: new Map(published.offers.map(o => [o.id, o])) };
  const editNote = `Edited by organizer: ${Object.keys(request.changes).join(", ")}.`;
  session.notes[rowId] = [...(session.notes[rowId] ?? []).filter(n => !n.startsWith("Edited by organizer")), editNote];
  // Hard issues from the original input are re-derived from the draft, so a fixed field clears its issue.
  session.rows[index] = classify(rowId, draft, [], (session.notes[rowId] ?? []).filter(n => !n.startsWith("Edited by organizer")), ctx);
  session.revision++;
  session.counts = countReviewRows(session.rows);
  saveSession(store, session);
  return publicSession(session);
}

/** Publish selected eligible rows atomically; repeat of an identical request returns the prior result. */
export function approve(importId: string, request: unknown, opts: { taxonomy: Taxonomy; now?: Date; store?: Store }): ApprovalResult {
  const store = opts.store ?? defaultStore();
  const now = opts.now ?? new Date();
  const session = loadSession(store, importId, now);
  const key = JSON.stringify(request && typeof request === "object" ? { ids: [...((request as { rowIds?: string[] }).rowIds ?? [])].sort(), rev: (request as { revision?: number }).revision } : null);
  const prior = session.approvals.find(a => a.key === key);
  if (prior) return prior.result;
  const published = readPublished(store);
  const selection = validateReviewSelection(session, request, { catalogueVersion: published.catalogueVersion, now, taxonomy: opts.taxonomy });
  if (!selection.ok) {
    const stale = selection.issues.some(i => i.path === "revision" || i.path === "catalogueVersion");
    throw new ReviewError(stale ? 409 : 400, stale ? "STALE_REVIEW" : "NOT_ELIGIBLE", stale ? "The session or catalogue changed; reload before approving." : "Some selected rows cannot be published.", selection.issues);
  }
  const reviewedAt = now.toISOString();
  const byId = new Map(published.offers.map(o => [o.id, o]));
  for (const row of selection.rows) {
    const offer = structuredClone(row.candidate!) as Offer;
    offer.reviewStatus = "approved";
    if (offer.source.kind === "verified") offer.source.verifiedAt = reviewedAt;
    const valid = validateOffer(offer, opts.taxonomy);
    if (!valid.ok) throw new ReviewError(400, "NOT_ELIGIBLE", `Row ${row.rowId} failed final validation.`, valid.issues);
    byId.set(offer.id, offer);
  }
  const next: PublishedCatalog = { catalogueVersion: published.catalogueVersion + 1, publishedAt: reviewedAt, offers: [...byId.values()] };
  writeAtomic(paths(store).published, next);
  const selected = new Set(selection.rows.map(r => r.rowId));
  const counts = countReviewRows(session.rows);
  const result: ApprovalResult = {
    approved: true, publishedCount: selection.rows.length, blockedCount: counts.blocked, unchangedCount: counts.unchanged, catalogueVersion: next.catalogueVersion,
  };
  // Published rows become "unchanged" in this session; the session now matches the new catalogue.
  session.rows = session.rows.map(r => selected.has(r.rowId) ? { ...r, state: "unchanged" as ReviewRowState, before: byId.get(r.rowId) ?? null, changedFields: [] } : r);
  session.counts = countReviewRows(session.rows);
  session.catalogueVersion = next.catalogueVersion;
  session.approvals.push({ key, result });
  saveSession(store, session);
  return result;
}

/** Turn staged scraped candidates into review drafts for the same service. */
export function draftsFromCandidates(candidates: Candidate[]): DraftInput[] {
  return candidates.map(c => ({
    rowId: c.rowId,
    draft: c.offer as unknown as Record<string, unknown>,
    issues: c.issues,
    notes: c.reviewNotes,
    evidence: c.evidence,
  }));
}

/** Repeatable demo reset: remove published reviewed records and stored sessions. */
export function resetDemo(store: Store = defaultStore()): { reset: true; catalogueVersion: number } {
  const p = paths(store);
  const version = readPublished(store).catalogueVersion;
  if (existsSync(/*turbopackIgnore: true*/ p.sessions)) for (const f of readdirSync(/*turbopackIgnore: true*/ p.sessions)) if (f.endsWith(".json")) rmSync(join(/*turbopackIgnore: true*/ p.sessions, f));
  writeAtomic(p.published, { catalogueVersion: version + 1, publishedAt: null, offers: [] });
  return { reset: true, catalogueVersion: version + 1 };
}
