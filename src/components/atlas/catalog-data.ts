"use client";

import type { Offer } from "@/shared/contracts";
import { CatalogLoadError, createDemoCatalogBundle, loadCatalog, type CatalogBundle } from "@/shared/catalog-client";

/**
 * UI-side wrapper around the shared catalog client (docs/CONTRACT.md: one fetch wrapper for the
 * public UI). It loads the real bundle via `loadCatalog` and, while Umang's /api routes do not
 * exist yet (404), falls back EXPLICITLY to the bundled demo fixtures via `createDemoCatalogBundle`
 * — never silently: the UI always shows the demo banner in that mode. No query, age or preference
 * data is ever sent.
 */
export type BundleState =
  | { phase: "loading" }
  | { phase: "ready"; bundle: CatalogBundle; note: string | null }
  | { phase: "error"; message: string };

async function demoBundle(note: string | null): Promise<Exclude<BundleState, { phase: "loading" }>> {
  try {
    const [offers, providers] = await Promise.all([
      import("../../../data/demo-offers.json").then(m => (m.default ?? m) as unknown as Offer[]),
      import("../../../data/providers.json").then(m => ((m.default ?? m) as { id: string; name: string; discoveryUrl: string }[])
        .map(p => ({ id: p.id, name: p.name, discoveryUrl: p.discoveryUrl })))
    ]);
    return { phase: "ready", bundle: createDemoCatalogBundle(offers, new Date(), undefined, providers), note };
  } catch {
    return { phase: "error", message: "Der Katalog konnte nicht geladen werden." };
  }
}

export async function loadBundle(signal?: AbortSignal): Promise<Exclude<BundleState, { phase: "loading" }>> {
  try {
    return { phase: "ready", bundle: await loadCatalog({ signal }), note: null };
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    // 404 means the catalog API is not built yet; that is the one case that may use fixtures quietly.
    if (err instanceof CatalogLoadError && err.code === "http" && err.status === 404) return demoBundle(null);
    if (err instanceof CatalogLoadError && (err.code === "network" || err.code === "timeout" || err.code === "http")) {
      return demoBundle("Katalog-Server nicht erreichbar. Es werden Demo-Daten gezeigt.");
    }
    return { phase: "error", message: "Der Katalog konnte nicht geladen werden." };
  }
}
