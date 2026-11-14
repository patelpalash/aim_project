/** Date ranges for the Today / Weekend / Soon shortcuts, computed in Europe/Berlin. */
const TZ = "Europe/Berlin";

function berlinParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")), wd: get("weekday") };
}
function offsetFor(y: number, m: number, d: number): string {
  const probe = new Date(Date.UTC(y, m - 1, d, 12));
  const name = new Intl.DateTimeFormat("en", { timeZone: TZ, timeZoneName: "longOffset" }).formatToParts(probe).find(p => p.type === "timeZoneName")?.value ?? "GMT+01:00";
  return name === "GMT" ? "+00:00" : name.replace("GMT", "");
}
function iso(y: number, m: number, d: number, end: boolean): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}T${end ? "23:59:59" : "00:00:00"}${offsetFor(y, m, d)}`;
}
function addDays(y: number, m: number, d: number, n: number) {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export type When = "all" | "today" | "weekend" | "soon";
export const WHEN_LABEL: Record<When, string> = { all: "Alle Termine", today: "Heute", weekend: "Dieses Wochenende", soon: "Nächste 30 Tage" };

export function rangeFor(when: When, now = new Date()): { dateFrom?: string; dateTo?: string } {
  if (when === "all") return {};
  const t = berlinParts(now);
  if (when === "today") return { dateFrom: iso(t.y, t.m, t.d, false), dateTo: iso(t.y, t.m, t.d, true) };
  if (when === "soon") { const e = addDays(t.y, t.m, t.d, 30); return { dateFrom: iso(t.y, t.m, t.d, false), dateTo: iso(e.y, e.m, e.d, true) }; }
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(t.wd);
  const toSat = dow === 0 ? -1 : 6 - dow;
  const sat = addDays(t.y, t.m, t.d, toSat);
  const sun = addDays(sat.y, sat.m, sat.d, 1);
  const start = dow === 0 ? t : dow === 6 ? t : sat;
  return { dateFrom: iso(start.y, start.m, start.d, false), dateTo: iso(sun.y, sun.m, sun.d, true) };
}
