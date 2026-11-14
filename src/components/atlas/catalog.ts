import type { Offer } from "@/shared/contracts";

/**
 * The one catalog loader for the public UI (docs/CONTRACT.md: "Load the fixture behind a temporary
 * catalog loader. Add one fetch wrapper"). It reads GET /api/offers when Umang's route exists and
 * falls back to the bundled demo fixtures otherwise. No search text or preferences are sent.
 */
export type CatalogState =
  | { phase: "loading" }
  | { phase: "ready"; offers: Offer[]; origin: "api" | "fixtures"; mode: "demo" | "reviewed"; generatedAt: string | null; note: string | null }
  | { phase: "error"; message: string };

interface OffersResponse { schemaVersion: number; mode: "demo" | "reviewed"; offers: Offer[]; generatedAt: string }

async function loadFixtures(): Promise<Offer[]> {
  const mod = await import("../../../data/demo-offers.json");
  return (mod.default ?? mod) as unknown as Offer[];
}

export async function loadCatalog(signal?: AbortSignal): Promise<Exclude<CatalogState, { phase: "loading" }>> {
  try {
    const res = await fetch("/api/offers", { signal, headers: { accept: "application/json" } });
    if (res.ok) {
      const body = (await res.json()) as OffersResponse;
      if (body && Array.isArray(body.offers)) {
        return { phase: "ready", offers: body.offers, origin: "api", mode: body.mode, generatedAt: body.generatedAt ?? null, note: null };
      }
    }
    // 404 means the API is not built yet; any other failure falls back too, but says so.
    const offers = await loadFixtures();
    const note = res.status === 404 ? null : `Katalog-Server antwortet nicht (${res.status}). Es werden Demo-Daten gezeigt.`;
    return { phase: "ready", offers, origin: "fixtures", mode: "demo", generatedAt: null, note };
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    try {
      const offers = await loadFixtures();
      return { phase: "ready", offers, origin: "fixtures", mode: "demo", generatedAt: null, note: "Katalog-Server nicht erreichbar. Es werden Demo-Daten gezeigt." };
    } catch {
      return { phase: "error", message: "Der Katalog konnte nicht geladen werden." };
    }
  }
}
