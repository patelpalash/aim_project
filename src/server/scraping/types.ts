/**
 * Server-only scraping types (Umang, U1). Raw evidence stays here and never
 * passes through the public `Offer` read API.
 */
import type { Issue, Offer } from "../../shared/contracts.ts";

/** How a field value was obtained. "absent" means the source did not state it. */
export type EvidenceMethod = "explicit" | "derived" | "rule" | "absent";

export interface FieldEvidence {
  field: string;
  value: unknown;
  /** Short source text the value came from (no raw HTML, no staff contacts). */
  text: string | null;
  /** Where on the page the text was found, e.g. "#coursesDateTable row 1". */
  locator: string;
  method: EvidenceMethod;
  note?: string;
}

/** One dated session exactly as published, in Europe/Berlin local time. */
export interface SourceSession {
  /** Local date YYYY-MM-DD. */
  date: string;
  /** Local HH:MM or null when the source gives no time. */
  startTime: string | null;
  endTime: string | null;
  place: string | null;
}

/** Provider-neutral extraction result before normalization into an Offer candidate. */
export interface SourceRecord {
  providerId: string;
  /** Provider course/event identity (aim: Kursnummer). */
  externalId: string;
  /** Exact canonical HTTPS detail URL on an allowed provider host. */
  detailUrl: string;
  fetchedAt: string;
  adapterVersion: string;
  title: string;
  lead: string | null;
  description: string;
  /** Participation / target-group text as published. */
  audienceText: string | null;
  /** Provider audience labels (aim listing badges such as "Schüler/in"). */
  audienceLabels: string[];
  sessions: SourceSession[];
  venueName: string | null;
  venueCity: string | null;
  costText: string | null;
  statusText: string | null;
  evidence: FieldEvidence[];
}

export type Timing = "upcoming" | "ongoing" | "ended" | "undated";

/** Row state shared with the planned CSV/review service. */
export type CandidateState = "ready-for-review" | "blocked" | "out-of-scope";

export interface Candidate {
  /** Stable row identity = offer id (provider + provider record id). */
  rowId: string;
  state: CandidateState;
  timing: Timing;
  offer: Offer;
  issues: Issue[];
  /** Field notes a reviewer must see (translation pending, derived city, ...). */
  reviewNotes: string[];
  evidence: FieldEvidence[];
  sessions: SourceSession[];
}

export type ProviderRunStatus = "not-run" | "running" | "needs-review" | "reviewed" | "empty" | "partial" | "failed";

export interface PageLog {
  url: string;
  finalUrl: string | null;
  status: number | null;
  bytes: number;
  kind: "listing" | "detail";
  error?: string;
}

export interface ProviderRunResult {
  runId: string;
  providerId: string;
  adapterVersion: string;
  startedAt: string;
  finishedAt: string;
  status: ProviderRunStatus;
  message: string;
  windowDays: number;
  pageCap: number;
  partialCoverage: boolean;
  pages: PageLog[];
  counts: { listed: number; outOfScope: number; outsideWindow: number; extracted: number; ready: number; blocked: number; failed: number };
  candidates: Candidate[];
}
