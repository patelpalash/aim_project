export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
export const nonempty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
export const isId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-z][a-z0-9-]{0,63}$/.test(value);

declare const localDateBrand: unique symbol;
declare const timestampBrand: unique symbol;
export type LocalDateString = string & { readonly [localDateBrand]: true };
export type IsoTimestampString = string & { readonly [timestampBrand]: true };

export function isLocalDate(value: unknown): value is LocalDateString {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isIsoTimestamp(value: unknown): value is IsoTimestampString {
  if (typeof value !== "string") return false;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  return !!match && isLocalDate(match[1]) && Number(match[2]) < 24 && Number(match[3]) < 60 &&
    Number(match[4]) < 60 && Number.isFinite(Date.parse(value));
}

export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
}
