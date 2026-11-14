/**
 * U3: fixed-column UTF-8 CSV intake. Rows become Offer candidates through the same rules
 * (age wording, Berlin time, stable identity, shared validation) as scraped records.
 * Nothing is inferred: blank time = date-only, blank price = unknown, blank age = unknown.
 */
import type { Audience, Format, Issue, Offer } from "../../shared/contracts.ts";
import { AUDIENCES, FORMATS } from "../../shared/contracts.ts";
import { parseAge } from "../normalize/rules.ts";
import { offerId } from "../normalize/to-offer.ts";
import { berlinLocalToIso } from "../scraping/berlin-time.ts";

export const CSV_COLUMNS = [
  "externalId", "title", "titleEn", "description", "descriptionEn", "topics", "interests", "audience",
  "ageText", "date", "startTime", "endTime", "venue", "city", "priceEur", "format", "availability", "sourceUrl",
] as const;
export type CsvColumn = typeof CSV_COLUMNS[number];
export const MAX_UPLOAD_BYTES = 1_000_000;
export const MAX_ROWS = 100;

export const CSV_TEMPLATE = `${CSV_COLUMNS.join(",")}
DEMO-001,"Demo: Spiele bauen mit Scratch","Demo: Build games with Scratch","Beispielzeile – bitte ersetzen.","Example row – replace it.",coding;gaming,build-games,children,"8–11 Jahre",2026-12-12,10:00,12:00,"Beispielraum",Heilbronn,0,workshop,available,
`;

export class CsvError extends Error {}

/** RFC 4180 parser: quoted fields, escaped quotes, commas/newlines inside quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false, i = 0;
  const src = text.replace(/^﻿/, "");
  while (i < src.length) {
    const ch = src[i];
    if (quoted) {
      if (ch === "\"") {
        if (src[i + 1] === "\"") { field += "\""; i += 2; continue; }
        quoted = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === "\"" && field === "") { quoted = true; i++; continue; }
    if (ch === ",") { row.push(field); field = ""; i++; continue; }
    if (ch === "\r" && src[i + 1] === "\n") i++;
    if (ch === "\n" || ch === "\r") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += ch; i++;
  }
  if (quoted) throw new CsvError("Unterminated quoted field");
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => cell.trim() !== ""));
}

export interface CsvRowInput { line: number; values: Record<CsvColumn, string> }

/** Validate encoding/size/header/row limits, then return keyed rows. */
export function readCsvUpload(bytes: Uint8Array): CsvRowInput[] {
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new CsvError("Datei ist größer als 1 MB.");
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new CsvError("Datei ist nicht UTF-8-kodiert."); }
  const rows = parseCsv(text);
  if (!rows.length) throw new CsvError("Datei enthält keine Kopfzeile.");
  const header = rows[0].map(h => h.trim());
  const missing = CSV_COLUMNS.filter(c => !header.includes(c));
  const unknown = header.filter(h => !(CSV_COLUMNS as readonly string[]).includes(h));
  if (missing.length || unknown.length)
    throw new CsvError(`Spalten passen nicht zur Vorlage. Fehlend: ${missing.join(", ") || "–"}; unbekannt: ${unknown.join(", ") || "–"}.`);
  const body = rows.slice(1);
  if (body.length > MAX_ROWS) throw new CsvError(`Höchstens ${MAX_ROWS} Zeilen pro Upload.`);
  return body.map((cells, index) => ({
    line: index + 2,
    values: Object.fromEntries(CSV_COLUMNS.map(c => [c, (cells[header.indexOf(c)] ?? "").trim()])) as Record<CsvColumn, string>,
  }));
}

const list = (cell: string) => cell.split(";").map(s => s.trim()).filter(Boolean);

export interface CsvCandidate { rowKey: string; offer: Partial<Offer> & { id: string }; issues: Issue[]; notes: string[] }

/** Map one row to a draft Offer. Hard problems become issues; validation happens in the review service. */
export function csvRowToDraft(row: CsvRowInput, providerId: string, mode: "source" | "demo", fetchedAt: string): CsvCandidate {
  const v = row.values;
  const issues: Issue[] = [];
  const notes: string[] = [];
  const at = (col: CsvColumn) => `line ${row.line}.${col}`;
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(v.externalId)) issues.push({ path: "externalId", message: `${at("externalId")}: stable ID required (letters, digits, . _ -)` });
  if (!v.title) issues.push({ path: "title", message: `${at("title")}: title required` });

  const age = parseAge(v.ageText);
  if (v.ageText && age.kind === "unknown") notes.push(`Age wording "${v.ageText}" was not recognised; age stays unknown.`);

  let startsAt: string | null = null, endsAt: string | null = null;
  let precision: Offer["schedulePrecision"] = "unknown";
  if (!v.date) issues.push({ path: "startsAt", message: `${at("date")}: date required (YYYY-MM-DD)` });
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || !berlinLocalToIso(v.date, "12:00")) issues.push({ path: "startsAt", message: `${at("date")}: "${v.date}" is not a real YYYY-MM-DD date` });
  else if (v.startTime) {
    startsAt = berlinLocalToIso(v.date, v.startTime);
    endsAt = v.endTime ? berlinLocalToIso(v.date, v.endTime) : null;
    if (!startsAt) issues.push({ path: "startsAt", message: `${at("startTime")}: "${v.startTime}" is not HH:mm` });
    if (v.endTime && !endsAt) issues.push({ path: "endsAt", message: `${at("endTime")}: "${v.endTime}" is not HH:mm` });
    precision = startsAt ? "date-time" : "unknown";
  } else {
    precision = "date-only";
    if (v.endTime) notes.push("End time given without a start time was ignored.");
  }

  let priceEur: number | null = null;
  if (v.priceEur) {
    const n = Number(v.priceEur.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) issues.push({ path: "priceEur", message: `${at("priceEur")}: "${v.priceEur}" is not a price (blank = unknown, 0 = free)` });
    else priceEur = n;
  }
  const audiences = list(v.audience);
  const badAudience = audiences.filter(a => !(AUDIENCES as readonly string[]).includes(a));
  if (badAudience.length) issues.push({ path: "audiences", message: `${at("audience")}: unknown audience ${badAudience.join(", ")}` });
  const format = (v.format || "workshop") as Format;
  if (!(FORMATS as readonly string[]).includes(format)) issues.push({ path: "format", message: `${at("format")}: unknown format "${v.format}"` });
  const availability = (v.availability || "unknown") as Offer["availability"];
  if (!["available", "full", "cancelled", "unknown"].includes(availability)) issues.push({ path: "availability", message: `${at("availability")}: unknown availability "${v.availability}"` });

  if (!v.titleEn) notes.push("No English title supplied; German text is shown in both languages.");
  const summaryDe = (v.description || v.title).slice(0, 600);
  const offer: Partial<Offer> & { id: string } = {
    id: offerId(providerId, v.externalId || `line-${row.line}`),
    providerId,
    externalId: v.externalId,
    title: { de: v.title, en: v.titleEn || v.title },
    summary: { de: summaryDe, en: (v.descriptionEn || summaryDe).slice(0, 600) },
    topics: list(v.topics),
    interests: list(v.interests),
    audiences: audiences as Audience[],
    format,
    minAge: age.minAge,
    maxAge: age.maxAge,
    ageEvidence: age.kind === "unknown" ? { kind: "unknown" } : { kind: age.kind === "minimum" ? "minimum-only" : "range", text: v.ageText.slice(0, 500) },
    startsAt,
    endsAt,
    schedulePrecision: precision,
    ...(precision === "date-only" ? { startDate: v.date, endDate: v.date } : {}),
    timeZone: "Europe/Berlin",
    priceEur,
    venue: { name: v.venue, city: v.city, access: "unknown" },
    availability,
    reviewStatus: "pending",
    source: mode === "demo"
      ? { kind: "demo", url: null, fetchedAt: null, verifiedAt: null }
      : { kind: "verified", url: v.sourceUrl || null, fetchedAt, verifiedAt: null },
  };
  if (mode === "demo" && v.sourceUrl) notes.push("Demo rows never carry a source/registration link; sourceUrl was dropped.");
  return { rowKey: offer.id, offer, issues, notes };
}
