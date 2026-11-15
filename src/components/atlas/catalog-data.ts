"use client";

import { CatalogLoadError, loadCatalog, type CatalogBundle } from "../../shared/catalog-client.ts";
import type { Offer } from "../../shared/contracts.ts";
import { STRINGS, type StringKey } from "../strings.ts";
import type { Locale } from "../../shared/contracts.ts";

/** Dictionary lookup outside React, so these helpers stay plain functions. */
function t(key: StringKey, locale: Locale, vars?: Record<string, string | number>): string {
  const template = STRINGS[key][locale] || STRINGS[key].de;
  return vars ? template.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all)) : template;
}

/** One public catalog boundary; mode/cache status come from the API. Preferences stay local. */
export type BundleState =
  | { phase: "loading" }
  | { phase: "ready"; bundle: CatalogBundle; note: string | null }
  | { phase: "error"; message: string };

/** Catalog mode is deliberately broad; describe the actual approved records in a mixed catalog. */
export function describeCatalog(offers: readonly Offer[], locale: Locale = "de"): { text: string; tone: "warn" | "ok" | "muted" } {
  const reviewed = offers.filter(o => o.reviewStatus === "approved" && o.source.kind === "verified" && o.source.verifiedAt !== null).length;
  const demo = offers.filter(o => o.source.kind === "demo").length;
  const parts: string[] = [];
  if (reviewed) parts.push(t(reviewed === 1 ? "catalog.reviewedOne" : "catalog.reviewedMany", locale, { n: reviewed }));
  if (demo) parts.push(t(demo === 1 ? "catalog.demoOne" : "catalog.demoMany", locale, { n: demo }));
  return { text: parts.join(" · ") || t("catalog.noneApproved", locale), tone: demo ? "warn" : reviewed ? "ok" : "muted" };
}

/** Demo mode is supplied by the API; failed requests never substitute fixtures. */
export async function loadBundle(signal?: AbortSignal, fetchImpl?: typeof fetch, locale: Locale = "de"): Promise<Exclude<BundleState, { phase: "loading" }>> {
  try {
    return { phase: "ready", bundle: await loadCatalog({ signal, fetchImpl }), note: null };
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    return { phase: "error", message: t(err instanceof CatalogLoadError && err.code === "timeout" ? "catalog.timeout" : "catalog.failed", locale) };
  }
}
