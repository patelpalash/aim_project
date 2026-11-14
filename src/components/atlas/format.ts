import type { Offer } from "@/shared/contracts";

const dateFmt = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Berlin" });
const timeFmt = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

/** Honest date label in Europe/Berlin. Unknown stays unknown. */
export function formatWhen(offer: Pick<Offer, "startsAt" | "endsAt">): string {
  if (!offer.startsAt) return "Datum unbekannt";
  const start = new Date(offer.startsAt);
  const day = dateFmt.format(start);
  const from = timeFmt.format(start);
  return offer.endsAt ? `${day} · ${from}–${timeFmt.format(new Date(offer.endsAt))} Uhr` : `${day} · ab ${from} Uhr`;
}

export function formatAge(offer: Pick<Offer, "minAge" | "maxAge">): string {
  if (offer.minAge === null && offer.maxAge === null) return "Alter unbekannt";
  if (offer.maxAge === null) return `ab ${offer.minAge} Jahren`;
  if (offer.minAge === null) return `bis ${offer.maxAge} Jahre`;
  return `${offer.minAge}–${offer.maxAge} Jahre`;
}

export function formatPrice(offer: Pick<Offer, "priceEur">): string {
  if (offer.priceEur === null) return "Preis unbekannt";
  if (offer.priceEur === 0) return "kostenlos";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(offer.priceEur);
}

export const PROVIDER_LABEL: Record<string, string> = {
  aim: "aim", experimenta: "experimenta", "haus-der-familie": "Haus der Familie", ipai: "IPAI"
};
export function providerLabel(id: string): string { return PROVIDER_LABEL[id] ?? id; }
