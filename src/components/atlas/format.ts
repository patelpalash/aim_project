import type { Offer } from "@/shared/contracts";
import type { ProviderSummary } from "@/shared/api-contract";
import { getAgeEvidenceKind } from "@/shared/age";
import { getSchedulePrecision } from "@/shared/schedule";

const TZ = "Europe/Berlin";
const dateFmt = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const stampFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: TZ });

/** A YYYY-MM-DD local date rendered without shifting it through a time zone. */
function localDay(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y!, m! - 1, d!)));
}

/** Honest date label in Europe/Berlin. Unknown stays unknown; date-only records never get an invented time. */
export function formatWhen(offer: Offer): string {
  if (getSchedulePrecision(offer) === "date-only" && offer.startDate) {
    const end = offer.endDate && offer.endDate !== offer.startDate ? ` – ${localDay(offer.endDate)}` : "";
    return `${localDay(offer.startDate)}${end} · Uhrzeit offen`;
  }
  if (!offer.startsAt) return "Datum unbekannt";
  const start = new Date(offer.startsAt);
  const day = dateFmt.format(start), from = timeFmt.format(start);
  return offer.endsAt ? `${day} · ${from}–${timeFmt.format(new Date(offer.endsAt))} Uhr` : `${day} · ab ${from} Uhr`;
}

export function ageKnown(offer: Offer): boolean { return getAgeEvidenceKind(offer) !== "unknown"; }
export function formatAge(offer: Offer): string {
  switch (getAgeEvidenceKind(offer)) {
    case "range": return `${offer.minAge}–${offer.maxAge} Jahre`;
    case "minimum-only": return `ab ${offer.minAge} Jahren`;
    case "maximum-only": return `bis ${offer.maxAge} Jahre`;
    case "all-ages": return "Alle Altersgruppen";
    default: return "Alter unbekannt";
  }
}

export function formatPrice(offer: Pick<Offer, "priceEur">): string {
  if (offer.priceEur === null) return "Preis unbekannt";
  if (offer.priceEur === 0) return "kostenlos";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(offer.priceEur);
}

export function formatStamp(iso: string | null): string | null { return iso ? stampFmt.format(new Date(iso)) : null; }

export const AVAILABILITY_LABEL: Record<Offer["availability"], string> = { available: "Plätze frei", full: "Ausgebucht", cancelled: "Abgesagt", unknown: "Unbekannt" };
export const ACCESS_LABEL: Record<Offer["venue"]["access"], string> = { "step-free": "Stufenlos", "not-step-free": "Nicht stufenlos", unknown: "Unbekannt" };

export function providerName(id: string, providers: readonly ProviderSummary[]): string {
  return providers.find(p => p.id === id)?.name ?? id;
}
