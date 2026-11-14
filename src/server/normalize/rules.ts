/**
 * Explicit, reviewable text rules shared by the scraping adapters and (later) CSV intake.
 * Every rule returns the text it matched so the reviewer can see why a value was set.
 * Nothing here guesses: no match means unknown/null.
 */
import type { Audience, Interest, Topic } from "../../shared/contracts.ts";

export interface RuleHit<T> { value: T; matched: string }

/** Published age wording. "ab 16" is a minimum only; the maximum stays null (never invented). */
export interface AgeEvidence {
  minAge: number | null;
  maxAge: number | null;
  kind: "range" | "minimum" | "unknown";
  matched: string | null;
}

const AGE_PATTERNS: { re: RegExp; kind: "range" | "minimum" }[] = [
  { re: /(?:zwischen|von)\s+(\d{1,2})\s+(?:und|bis)\s+(\d{1,2})\s+Jahre?n?/i, kind: "range" },
  { re: /\bAlter\s+von\s+(\d{1,2})\s+bis\s+(\d{1,2})\s+Jahre?n?/i, kind: "range" },
  { re: /(\d{1,2})\s*[–—-]\s*(\d{1,2})\s+Jahre?n?/i, kind: "range" },
  { re: /\bab\s+(\d{1,2})\s*(?:Jahre?n?|J\.)/i, kind: "minimum" },
];

export function parseAge(text: string | null | undefined): AgeEvidence {
  if (!text) return { minAge: null, maxAge: null, kind: "unknown", matched: null };
  for (const { re, kind } of AGE_PATTERNS) {
    const m = re.exec(text);
    if (!m) continue;
    const min = Number(m[1]);
    const max = kind === "range" ? Number(m[2]) : null;
    if (min > 120 || (max !== null && (max > 120 || max < min))) continue;
    return { minAge: min, maxAge: max, kind, matched: m[0] };
  }
  return { minAge: null, maxAge: null, kind: "unknown", matched: null };
}

/** Cost text -> EUR. "keine"/"kostenfrei" is explicitly free (0); anything unclear stays null. */
export function parsePrice(text: string | null | undefined): RuleHit<number | null> {
  if (!text) return { value: null, matched: "" };
  const t = text.trim();
  if (/^(keine|kostenlos|kostenfrei|frei|gratis|0(,00)?\s*(€|EUR))\.?$/i.test(t) || /\b(kostenfrei|kostenlos)\b/i.test(t))
    return { value: 0, matched: t };
  const m = /(\d{1,4}(?:[.,]\d{2})?)\s*(?:€|EUR|Euro)/i.exec(t);
  if (m && !/ermäßigt|bis|ab\s/i.test(t)) return { value: Number(m[1].replace(",", ".")), matched: m[0] };
  return { value: null, matched: t };
}

/** Published availability wording. Registration closing alone does not prove a cancellation. */
export function parseAvailability(text: string | null | undefined): RuleHit<"available" | "full" | "cancelled" | "unknown"> {
  const t = (text ?? "").trim();
  if (/abgesagt|fällt aus|entfällt|storniert/i.test(t)) return { value: "cancelled", matched: t };
  if (/ausgebucht|warteliste|keine (freien )?plätze/i.test(t)) return { value: "full", matched: t };
  if (/^frei$|restpl[aä]tze|plätze frei|freie plätze/i.test(t)) return { value: "available", matched: t };
  return { value: "unknown", matched: t };
}

const TOPIC_RULES: { topic: Topic; re: RegExp }[] = [
  { topic: "ai", re: /\bKI\b|\bKI-|künstliche[nr]? Intelligenz|\bAI\b|Sprachmodell|machine learning/i },
  { topic: "coding", re: /programmier|\bcoding\b|\bcode\b|python|scratch|mikrocontroller|ESP32|calliope|arduino|web-app/i },
  { topic: "gaming", re: /videospiel|spieleentwicklung|spiele-engine|\bgames?\b|\bgaming\b|unity|minecraft/i },
];

const INTEREST_RULES: { interest: Interest; re: RegExp }[] = [
  { interest: "build-games", re: /spieleentwicklung|eigenes? (video)?spiel|spiele-engine|game design|\blevel/i },
  { interest: "robots", re: /robot|mikrocontroller|ESP32|sensor|calliope|arduino/i },
  { interest: "make-art", re: /\b(zeichnen|malen|musik|kunst)\b|klangdesign|bildgestaltung|digitale kunst/i },
  { interest: "solve-puzzles", re: /rätsel|knobel|problemlös|detektiv/i },
  { interest: "tell-stories", re: /geschichten|storytelling|hörspiel|charakter/i },
];

function collect<T>(text: string, rules: { re: RegExp }[], pick: (r: never) => T): RuleHit<T>[] {
  const hits: RuleHit<T>[] = [];
  for (const rule of rules) {
    const m = rule.re.exec(text);
    if (m) hits.push({ value: pick(rule as never), matched: m[0] });
  }
  return hits;
}

export const matchTopics = (text: string) => collect<Topic>(text, TOPIC_RULES, (r: { topic: Topic }) => r.topic);
export const matchInterests = (text: string) => collect<Interest>(text, INTEREST_RULES, (r: { interest: Interest }) => r.interest);

/**
 * Audience from provider labels and published age. Teacher/staff-only training is out of scope
 * for the family guide; parent-only stays parents (never becomes a child offer).
 */
export function deriveAudiences(labels: string[], age: AgeEvidence): RuleHit<Audience>[] {
  const hits: RuleHit<Audience>[] = [];
  const has = (re: RegExp) => labels.find(l => re.test(l));
  const pupil = has(/schüler|kinder|jugendliche/i);
  if (pupil) {
    if (age.minAge !== null && age.minAge < 13) hits.push({ value: "children", matched: `${pupil}; ${age.matched}` });
    if (age.minAge !== null && ((age.maxAge ?? age.minAge) >= 13)) hits.push({ value: "teens", matched: `${pupil}; ${age.matched}` });
  }
  const parents = has(/eltern/i);
  if (parents) hits.push({ value: "parents", matched: parents });
  const family = has(/famili/i);
  if (family) hits.push({ value: "families", matched: family });
  return hits;
}

/** Labels that indicate staff/teacher professional training rather than an activity for children or families. */
export const isProfessionalOnly = (labels: string[]) =>
  labels.length > 0 && labels.every(l => /lehrkr|schulleitung|fachkraft|kita|krippe|betreuende|sozialarbeit|leitungskraft|zusatzkraft|referendar|tagespflege/i.test(l));
