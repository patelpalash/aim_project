/** Contract v1. Palash owns shared changes; Ishan and Umang consume these types. */
export const TOPICS = ["ai", "coding", "gaming"] as const;
export const INTERESTS = ["build-games", "robots", "make-art", "solve-puzzles", "tell-stories"] as const;
export const AUDIENCES = ["children", "teens", "families", "parents", "school-groups"] as const;
export const FORMATS = ["workshop", "course", "event", "drop-in"] as const;
export type Topic = typeof TOPICS[number];
export type Interest = typeof INTERESTS[number];
export type Audience = typeof AUDIENCES[number];
export type Format = typeof FORMATS[number];
export type Locale = "de" | "en";
export type LocalizedText = Record<Locale, string>;

export interface Offer {
  /** Stable occurrence ID, not a random ID generated on each import. */
  id: string;
  /** Configured provider ID; new providers do not require a TypeScript union edit. */
  providerId: string;
  externalId: string;
  title: LocalizedText;
  summary: LocalizedText;
  topics: Topic[];
  interests: Interest[];
  audiences: Audience[];
  format: Format;
  /** null means the provider has not supplied the information. */
  minAge: number | null;
  maxAge: number | null;
  /** ISO 8601 with explicit UTC offset. Unknown dates are null. */
  startsAt: string | null;
  endsAt: string | null;
  timeZone: "Europe/Berlin";
  priceEur: number | null;
  venue: {
    name: string;
    city: string;
    access: "step-free" | "not-step-free" | "unknown";
  };
  availability: "available" | "full" | "cancelled" | "unknown";
  reviewStatus: "pending" | "approved";
  source: {
    kind: "demo" | "verified";
    /** Exact record URL for verified data. Demo records always use null. */
    url: string | null;
    fetchedAt: string | null;
    /** Set by a reviewer, not by a scraper. */
    verifiedAt: string | null;
  };
}

export interface SearchFilters {
  query?: string;
  topics?: Topic[];
  interests?: Interest[];
  /** Optional age used in memory for suitability; never a birth date. */
  age?: number;
  dateFrom?: string;
  dateTo?: string;
  maxPriceEur?: number;
  format?: Format;
  providerId?: string;
  audience?: "family" | "parent" | "school";
  stepFreeOnly?: boolean;
}

export interface Issue { path: string; message: string }
export type Validation = { ok: true; offer: Offer } | { ok: false; issues: Issue[] };
export interface Recommendation { offer: Offer; score: number; reasonKeys: string[] }
export interface ImportPreview {
  added: Offer[];
  changed: { before: Offer; after: Offer; fields: string[] }[];
  unchanged: string[];
  rejected: { index: number; issues: Issue[] }[];
  /** Missing records are deliberately not interpreted as deletions. */
  deletions: never[];
}
