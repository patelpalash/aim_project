/** Europe/Berlin local date/time to ISO 8601 with the correct offset (DST aware, no dependencies). */

const offsetFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", timeZoneName: "longOffset" });

function berlinOffsetMinutes(instantMs: number): number {
  const name = offsetFormatter.formatToParts(new Date(instantMs)).find(p => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "2027-03-10" + "16:00" -> "2027-03-10T16:00:00+01:00".
 * Returns null for impossible dates/times. Never invents a time: callers pass null
 * dates/times through as unknown instead of calling this.
 */
export function berlinLocalToIso(date: string, time: string): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [y, mo, da, h, mi] = [Number(d[1]), Number(d[2]), Number(d[3]), Number(t[1]), Number(t[2])];
  if (h > 23 || mi > 59) return null;
  const asUtc = Date.UTC(y, mo - 1, da, h, mi);
  const check = new Date(asUtc);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== da) return null;
  // Two passes resolve the offset around DST transitions.
  let offset = berlinOffsetMinutes(asUtc);
  offset = berlinOffsetMinutes(asUtc - offset * 60_000);
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  return `${date}T${pad(h)}:${pad(mi)}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** "10.03.2027" -> "2027-03-10" or null. */
export function germanDateToIso(text: string): string | null {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const iso = `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
  const check = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(check.getTime()) && check.toISOString().startsWith(iso) ? iso : null;
}

/** Local calendar date in Europe/Berlin for an instant. */
export function berlinDate(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

const MONTHS = ["januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];

/** "23. November 2026" / "Sa., 28. November 2026" -> "2026-11-23"; null when no full date is present. */
export function germanLongDateToIso(text: string): string | null {
  const m = /(\d{1,2})\.\s*(Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(\d{4})/i.exec(text);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase().replace("maerz", "märz")) + 1;
  return germanDateToIso(`${m[1]}.${month}.${m[3]}`);
}

/** Local Europe/Berlin date and HH:MM for an absolute instant. */
export function berlinParts(instant: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instant);
  return { date: berlinDate(instant), time: parts };
}

/** "15:00 – 17:00", "17:30 - 20:30 Uhr", "10:00 bis 18:00 Uhr" -> start/end; a lone time gives only a start. */
export function parseTimeRange(text: string): { start: string | null; end: string | null } {
  const range = /(\d{1,2}:\d{2})\s*(?:-|–|—|bis)\s*(\d{1,2}:\d{2})/.exec(text);
  if (range) return { start: range[1].padStart(5, "0"), end: range[2].padStart(5, "0") };
  const single = /(\d{1,2}:\d{2})/.exec(text);
  return { start: single ? single[1].padStart(5, "0") : null, end: null };
}
