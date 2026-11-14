"use client";

import { CatalogLoadError, loadCatalog, type CatalogBundle } from "../../shared/catalog-client.ts";

/** One public catalog boundary; mode/cache status come from the API. Preferences stay local. */
export type BundleState =
  | { phase: "loading" }
  | { phase: "ready"; bundle: CatalogBundle; note: string | null }
  | { phase: "error"; message: string };

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
