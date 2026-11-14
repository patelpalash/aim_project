import type { Locale, Offer } from "@/shared/contracts";
import type { ProviderSummary } from "@/shared/api-contract";
import { getAgeEvidenceKind } from "@/shared/age";
import { getSchedulePrecision } from "@/shared/schedule";
import { STRINGS, type StringKey } from "../strings.ts";

const TZ = "Europe/Berlin";
const TAG: Record<Locale, string> = { de: "de-DE", en: "en-GB" };

/** Reads a translation outside React, for the pure formatting helpers below. */
function t(key: StringKey, locale: Locale, vars?: Record<string, string | number>): string {
  const template = STRINGS[key][locale] || STRINGS[key].de;
  return vars ? template.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all)) : template;
}

const dateFmt = (locale: Locale) => new Intl.DateTimeFormat(TAG[locale], { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
const timeFmt = (locale: Locale) => new Intl.DateTimeFormat(TAG[locale], { hour: "2-digit", minute: "2-digit", timeZone: TZ, hourCycle: "h23" });
const stampFmt = (locale: Locale) => new Intl.DateTimeFormat(TAG[locale], { dateStyle: "medium", timeStyle: "short", timeZone: TZ });

/** A YYYY-MM-DD local date rendered without shifting it through a time zone. */
function localDay(value: string, locale: Locale): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(TAG[locale], { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y!, m! - 1, d!)));
}

/** Honest date label in Europe/Berlin. Unknown stays unknown; date-only records never get an invented time. */
export function formatWhen(offer: Offer, locale: Locale = "de"): string {
  if (getSchedulePrecision(offer) === "date-only" && offer.startDate) {
    const end = offer.endDate && offer.endDate !== offer.startDate ? ` – ${localDay(offer.endDate, locale)}` : "";
    return `${localDay(offer.startDate, locale)}${end}${t("fmt.timeOpen", locale)}`;
  }
  if (!offer.startsAt) return t("fmt.dateUnknown", locale);
  const start = new Date(offer.startsAt);
  const day = dateFmt(locale).format(start), from = timeFmt(locale).format(start);
  return offer.endsAt
    ? t("fmt.range", locale, { day, from, to: timeFmt(locale).format(new Date(offer.endsAt)) })
    : t("fmt.fromTime", locale, { day, from });
}

export function ageKnown(offer: Offer): boolean { return getAgeEvidenceKind(offer) !== "unknown"; }
export function formatAge(offer: Offer, locale: Locale = "de"): string {
  switch (getAgeEvidenceKind(offer)) {
    case "range": return t("fmt.ageRange", locale, { min: offer.minAge!, max: offer.maxAge! });
    case "minimum-only": return t("fmt.ageMin", locale, { min: offer.minAge! });
    case "maximum-only": return t("fmt.ageMax", locale, { max: offer.maxAge! });
    case "all-ages": return t("fmt.allAges", locale);
    default: return t("fmt.ageUnknown", locale);
  }
}

export function formatPrice(offer: Pick<Offer, "priceEur">, locale: Locale = "de"): string {
  if (offer.priceEur === null) return t("fmt.priceUnknown", locale);
  if (offer.priceEur === 0) return t("fmt.free", locale);
  return new Intl.NumberFormat(TAG[locale], { style: "currency", currency: "EUR" }).format(offer.priceEur);
}

export function formatStamp(iso: string | null, locale: Locale = "de"): string | null {
  return iso ? stampFmt(locale).format(new Date(iso)) : null;
}

export function availabilityLabel(value: Offer["availability"], locale: Locale = "de"): string {
  return t(`avail.${value}` as StringKey, locale);
}
export function accessLabel(value: Offer["venue"]["access"], locale: Locale = "de"): string {
  return t(`access.${value}` as StringKey, locale);
}

export function providerName(id: string, providers: readonly ProviderSummary[]): string {
  return providers.find(p => p.id === id)?.name ?? id;
}
