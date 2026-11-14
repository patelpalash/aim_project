import type { Issue, Offer, SchedulePrecision, ScheduleStatus } from "./contracts.ts";
import { isIsoTimestamp, isLocalDate } from "./validation.ts";

type Schedule = Pick<Offer, "startsAt" | "endsAt" | "schedulePrecision" | "startDate" | "endDate">;
const formatter = new Intl.DateTimeFormat("en-GB-u-ca-iso8601-nu-latn", {
  timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
});
function parts(date: Date) {
  if (!Number.isFinite(date.getTime())) throw new RangeError("Invalid reference time");
  const values = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  return [values.year, values.month, values.day, values.hour, values.minute, values.second].map(Number);
}
function utc(values: number[]) {
  const date = new Date(0);
  date.setUTCFullYear(values[0], values[1] - 1, values[2]);
  date.setUTCHours(values[3] ?? 0, values[4] ?? 0, values[5] ?? 0, 0);
  return date.getTime();
}
export function getBerlinDate(date: Date): string {
  const [year, month, day] = parts(date);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type BerlinTimeResolution = { kind: "resolved"; timestamp: string } | { kind: "ambiguous"; candidates: string[] } | { kind: "invalid"; message: string };
function resolveWallTime(wanted: number[]): BerlinTimeResolution {
  const wallTime = utc(wanted);
  const offsets = new Set<number>();
  for (const hours of [-36, 0, 36]) {
    const probe = wallTime + hours * 3_600_000;
    offsets.add(utc(parts(new Date(probe))) - probe);
  }
  const candidates = [...offsets].map(offset => wallTime - offset).filter(candidate =>
    parts(new Date(candidate)).every((value, index) => value === wanted[index])
  ).sort((a, b) => a - b).map(value => new Date(value).toISOString());
  if (!candidates.length) return { kind: "invalid", message: "Local time does not exist in Europe/Berlin" };
  if (candidates.length > 1) return { kind: "ambiguous", candidates };
  return { kind: "resolved", timestamp: candidates[0] };
}

/** Missing/ambiguous DST times are explicit outcomes, never silently shifted. */
export function resolveBerlinLocalDateTime(date: string, time: string): BerlinTimeResolution {
  if (!isLocalDate(date) || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time))
    return { kind: "invalid", message: "Expected a real local date and time" };
  const wanted = [...date.split("-").map(Number), ...time.split(":").map(Number)];
  if (wanted.length === 5) wanted.push(0);
  return resolveWallTime(wanted);
}

export function getSchedulePrecision(offer: Schedule): SchedulePrecision {
  return offer.schedulePrecision ?? (offer.startsAt ? "date-time" : "unknown");
}
export function scheduleIssues(input: Record<string, unknown>): Issue[] {
  const issues: Issue[] = [];
  for (const key of ["startsAt", "endsAt"]) {
    if (input[key] !== null && !isIsoTimestamp(input[key])) issues.push({ path: key, message: "Expected a real ISO timestamp with timezone or null" });
  }
  if (input.startsAt === null && input.endsAt !== null) issues.push({ path: "endsAt", message: "An end needs a start" });
  if (isIsoTimestamp(input.startsAt) && isIsoTimestamp(input.endsAt) && Date.parse(input.endsAt) < Date.parse(input.startsAt))
    issues.push({ path: "endsAt", message: "End must not precede start" });
  const precision = input.schedulePrecision ?? (input.startsAt ? "date-time" : "unknown");
  if (!["date-time", "date-only", "unknown"].includes(String(precision))) issues.push({ path: "schedulePrecision", message: "Unknown schedule precision" });
  if (precision === "date-only") {
    if (input.startsAt !== null || input.endsAt !== null) issues.push({ path: "schedulePrecision", message: "Date-only records must not invent timestamps" });
    if (!isLocalDate(input.startDate)) issues.push({ path: "startDate", message: "Expected real YYYY-MM-DD local date" });
    if (input.endDate !== undefined && input.endDate !== null && !isLocalDate(input.endDate)) issues.push({ path: "endDate", message: "Invalid local end date" });
    if (isLocalDate(input.startDate) && isLocalDate(input.endDate) && input.endDate < input.startDate)
      issues.push({ path: "endDate", message: "End date must not precede start date" });
  } else {
    if (input.startDate != null || input.endDate != null) issues.push({ path: "startDate", message: "Local date fields require date-only precision" });
    if (precision === "date-time" && !isIsoTimestamp(input.startsAt)) issues.push({ path: "startsAt", message: "Date-time precision needs a timestamp" });
    if (precision === "unknown" && (input.startsAt !== null || input.endsAt !== null)) issues.push({ path: "schedulePrecision", message: "Unknown schedule cannot contain timestamps" });
  }
  return issues;
}

export function getLocalStartDate(offer: Schedule): string | null {
  return getSchedulePrecision(offer) === "date-only" ? offer.startDate ?? null : offer.startsAt ? getBerlinDate(new Date(offer.startsAt)) : null;
}
export function getScheduleStatus(offer: Schedule, now = new Date()): ScheduleStatus {
  const today = getBerlinDate(now);
  if (getSchedulePrecision(offer) === "date-only" && offer.startDate) {
    const end = offer.endDate ?? offer.startDate;
    return end < today ? "past" : offer.startDate > today ? "upcoming" : "today";
  }
  if (!offer.startsAt) return "undated";
  if (Date.parse(offer.startsAt) >= now.getTime()) return "upcoming";
  return offer.endsAt && Date.parse(offer.endsAt) >= now.getTime() ? "ongoing" : "past";
}

/** Convert a date filter boundary, including DST, without changing record precision. */
export function dateFilterInstant(value: string, endOfDay = false): number {
  if (isIsoTimestamp(value)) return Date.parse(value);
  if (!isLocalDate(value)) throw new RangeError("Date filters need YYYY-MM-DD or an ISO timestamp");
  let local = value.split("-").map(Number);
  if (endOfDay) {
    const next = new Date(utc(local) + 86_400_000);
    local = [next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()];
  }
  const resolved = resolveWallTime([...local, 0, 0, 0]);
  if (resolved.kind !== "resolved") throw new RangeError("Unresolvable local date boundary");
  return Date.parse(resolved.timestamp) - (endOfDay ? 1 : 0);
}

export function matchesDateBounds(offer: Schedule, from?: string, to?: string): boolean {
  for (const [bound, lower] of [[from, true], [to, false]] as const) {
    if (!bound) continue;
    if (isLocalDate(bound)) {
      const start = getLocalStartDate(offer);
      if (!start || (lower ? start < bound : start > bound)) return false;
    } else {
      // A date-only record cannot promise a specific time-of-day bound.
      if (!offer.startsAt || (lower ? Date.parse(offer.startsAt) < Date.parse(bound) : Date.parse(offer.startsAt) > Date.parse(bound))) return false;
    }
  }
  return true;
}
export function scheduleSortTime(offer: Schedule): number {
  if (offer.startsAt) return Date.parse(offer.startsAt);
  return offer.startDate ? dateFilterInstant(offer.startDate) : Infinity;
}
