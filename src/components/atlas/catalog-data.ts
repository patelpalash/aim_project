"use client";

import { CatalogLoadError, loadCatalog, type CatalogBundle } from "../../shared/catalog-client.ts";
import type { Offer } from "../../shared/contracts.ts";

/** One public catalog boundary; mode/cache status come from the API. Preferences stay local. */
export type BundleState =
  | { phase: "loading" }
  | { phase: "ready"; bundle: CatalogBundle; note: string | null }
  | { phase: "error"; message: string };

/** Catalog mode is deliberately broad; describe the actual approved records in a mixed catalog. */
export function describeCatalog(offers: readonly Offer[]): { text: string; tone: "warn" | "ok" | "muted" } {
  const reviewed = offers.filter(o => o.reviewStatus === "approved" && o.source.kind === "verified" && o.source.verifiedAt !== null).length;
  const demo = offers.filter(o => o.source.kind === "demo").length;
  const parts: string[] = [];
  if (reviewed) parts.push(`${reviewed} ${reviewed === 1 ? "geprüftes Angebot" : "geprüfte Angebote"}`);
  if (demo) parts.push(`${demo} ${demo === 1 ? "Demo-Beispiel" : "Demo-Beispiele"} (erfunden)`);
  return { text: parts.join(" · ") || "Noch keine freigegebenen Angebote", tone: demo ? "warn" : reviewed ? "ok" : "muted" };
}

/** Demo mode is supplied by the API; failed requests never substitute fixtures. */
export async function loadBundle(signal?: AbortSignal, fetchImpl?: typeof fetch): Promise<Exclude<BundleState, { phase: "loading" }>> {
  try {
    return { phase: "ready", bundle: await loadCatalog({ signal, fetchImpl }), note: null };
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    return { phase: "error", message: err instanceof CatalogLoadError && err.code === "timeout"
      ? "Der Katalog antwortet gerade nicht. Bitte versuche es erneut."
      : "Der Katalog konnte nicht geladen werden. Bitte versuche es erneut." };
  }
}
