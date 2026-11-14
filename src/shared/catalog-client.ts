"use client";

import type { Offer, Taxonomy } from "./contracts.ts";
import type { CatalogResponse, ProviderSummary } from "./api-contract.ts";
import { validateCatalogResponse, validateProvidersResponse } from "./api-contract.ts";
import { DEFAULT_TAXONOMY, validateTaxonomy } from "./taxonomy.ts";

export interface CatalogBundle { catalog: CatalogResponse; taxonomy: Taxonomy; providers: ProviderSummary[] }
export class CatalogLoadError extends Error {
  readonly code: "http" | "network" | "invalid-catalog" | "invalid-taxonomy" | "invalid-providers" | "timeout";
  readonly status?: number;
  constructor(code: CatalogLoadError["code"], message: string, status?: number) {
    super(message); this.name = "CatalogLoadError"; this.code = code; this.status = status;
  }
}

/** Reads only public catalog/config; no query, age, quiz or preference payload is sent. */
export async function loadCatalog(options: { fetchImpl?: typeof fetch; signal?: AbortSignal; timeoutMs?: number } = {}): Promise<CatalogBundle> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError("Invalid catalog timeout");
  if (options.signal?.aborted) throw new DOMException("Catalog load cancelled", "AbortError");
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const request = async (url: string): Promise<unknown> => {
      const response = await fetchImpl(url, { method: "GET", headers: { Accept: "application/json" }, credentials: "same-origin", signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new CatalogLoadError("http", "Catalog service is not available", response.status);
      try { return await response.json(); }
      catch { throw new CatalogLoadError(url === "/api/taxonomy" ? "invalid-taxonomy" : url === "/api/providers" ? "invalid-providers" : "invalid-catalog", "Catalog response is not JSON"); }
    };
    const [catalogInput, taxonomyInput, providersInput] = await Promise.all([request("/api/offers"), request("/api/taxonomy"), request("/api/providers")]);
    if (controller.signal.aborted) throw new DOMException("Catalog load cancelled", "AbortError");
    const taxonomy = validateTaxonomy(taxonomyInput);
    if (!taxonomy.ok) throw new CatalogLoadError("invalid-taxonomy", "Catalog configuration is invalid");
    const catalog = validateCatalogResponse(catalogInput, taxonomy.taxonomy);
    if (!catalog.ok) throw new CatalogLoadError("invalid-catalog", "Catalog response is invalid");
    const providers = validateProvidersResponse(providersInput);
    if (!providers.ok) throw new CatalogLoadError("invalid-providers", "Provider response is invalid");
    if (catalog.catalog.offers.some(offer => !providers.providers.some(provider => provider.id === offer.providerId)))
      throw new CatalogLoadError("invalid-catalog", "Catalog refers to an unknown provider");
    return { catalog: catalog.catalog, taxonomy: taxonomy.taxonomy, providers: providers.providers };
  } catch (error) {
    if (timedOut) throw new CatalogLoadError("timeout", "Catalog request timed out");
    if (options.signal?.aborted) throw new DOMException("Catalog load cancelled", "AbortError");
    if (error instanceof CatalogLoadError) throw error;
    throw new CatalogLoadError("network", "Catalog could not be loaded");
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
    controller.abort();
  }
}

/** Explicit fixture mode only; a failed real service never silently becomes demo data. */
export function createDemoCatalogBundle(offers: readonly Offer[], now = new Date(), taxonomy: Taxonomy = DEFAULT_TAXONOMY, providers: readonly ProviderSummary[] = []): CatalogBundle {
  if (!Number.isFinite(now.getTime()) || offers.some(offer => offer.source.kind !== "demo")) throw new RangeError("Expected synthetic fixture data and a valid clock");
  const catalog: CatalogResponse = { schemaVersion: 1, mode: "demo", catalogueVersion: 0, generatedAt: now.toISOString(), offers: structuredClone([...offers]) };
  const valid = validateCatalogResponse(catalog, taxonomy);
  if (!valid.ok) throw new Error("Invalid demo catalog");
  if (!validateProvidersResponse({ schemaVersion: 1, providers }).ok) throw new Error("Invalid demo provider metadata");
  return { catalog, taxonomy: structuredClone(taxonomy), providers: structuredClone([...providers]) };
}
