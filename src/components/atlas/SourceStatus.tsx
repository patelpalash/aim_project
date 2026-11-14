"use client";

import { useState } from "react";
import type { CatalogResponse, ProviderSummary, SourceStatus } from "@/shared/api-contract";
import { formatStamp, providerName } from "./format";

/**
 * Per-source honesty panel (I2 acceptance: "source status and loading/empty/error/cached states").
 * It reports what the backend says about each provider's last import — never a guess — and names
 * partial coverage explicitly, so a visitor can tell "nothing found" from "not fully imported yet".
 */
const LABEL: Record<SourceStatus["status"], string> = {
  "not-run": "Noch nicht abgerufen",
  running: "Läuft gerade",
  "demo-only": "Nur Demo-Daten",
  "review-needed": "Wird geprüft",
  reviewed: "Geprüft",
  empty: "Nichts gefunden",
  partial: "Teilweise übernommen",
  error: "Abruf fehlgeschlagen"
};
const TONE: Record<SourceStatus["status"], string> = {
  "not-run": "", running: "", "demo-only": "warn", "review-needed": "warn",
  reviewed: "ok", empty: "warn", partial: "warn", error: "bad"
};
const CACHE_LABEL: Record<string, string> = { fresh: "frisch geladen", cached: "aus dem Zwischenspeicher", stale: "veraltet" };

/** German sentence from the structured counts; the server's own message stays as secondary detail. */
function describe(s: SourceStatus): string {
  const found = s.extractedCount === 1 ? "1 Angebot gefunden" : `${s.extractedCount} Angebote gefunden`;
  const rejected = s.rejectedCount
    ? `, ${s.rejectedCount === 1 ? "1 Eintrag wird noch korrigiert" : `${s.rejectedCount} Einträge werden noch korrigiert`}`
    : "";
  switch (s.status) {
    case "error": return "Der letzte Abruf ist fehlgeschlagen. Angebote dieser Quelle können fehlen.";
    case "empty": return "Beim letzten Abruf gab es nichts Passendes.";
    case "not-run": return "Diese Quelle wurde noch nicht abgerufen.";
    case "running": return "Die Quelle wird gerade abgerufen.";
    case "demo-only": return "Hier stehen bisher nur erfundene Beispiele.";
    case "partial": return `${found}${rejected}. Es fehlen noch Angebote dieser Quelle.`;
    case "review-needed": return `${found}${rejected}. Sie werden noch geprüft und sind deshalb noch nicht alle sichtbar.`;
    default: return `${found}${rejected}.`;
  }
}

export function SourceStatusPanel({ statuses, cache, providers }: {
  statuses: readonly SourceStatus[];
  cache: CatalogResponse["cache"] | null;
  providers: readonly ProviderSummary[];
}) {
  const [open, setOpen] = useState(false);
  const worrying = statuses.filter(s => s.status === "error" || s.partialCoverage).length;
  return (
    <section className={`src panel${open ? " is-open" : ""}`} aria-labelledby="src-title">
      <button type="button" className="src__head" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span className="src__dot" data-tone={worrying ? "warn" : "ok"} aria-hidden="true" />
        <span id="src-title" className="src__title">
          Woher die Angebote kommen
          {worrying ? ` · ${worrying} ${worrying === 1 ? "Quelle ist" : "Quellen sind"} unvollständig` : " · alle Quellen vollständig"}
        </span>
        {cache ? <span className="src__cache">{CACHE_LABEL[cache.status] ?? cache.status}{cache.retrievedAt ? ` · ${formatStamp(cache.retrievedAt)}` : ""}</span> : null}
        <span className="src__chev" aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <ul className="src__list">
          {statuses.map(s => (
            <li key={s.providerId} className="src__row">
              <span className="src__name">{providerName(s.providerId, providers)}</span>
              <span className="status-line" data-tone={TONE[s.status] || undefined}>{LABEL[s.status]}</span>
              <span className="src__detail">
                {describe(s)}
                {s.lastSuccessfulImportAt ? ` Letzter Import: ${formatStamp(s.lastSuccessfulImportAt)}.` : ""}
                {s.message ? <span className="src__raw">{s.message}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
