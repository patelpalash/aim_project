"use client";

import { useState } from "react";
import type { CatalogResponse, ProviderSummary, SourceStatus } from "@/shared/api-contract";
import { formatStamp, providerName } from "./format";
import { useLocale, type Translate } from "../i18n";

/**
 * Per-source honesty panel (I2 acceptance: "source status and loading/empty/error/cached states").
 * It reports what the backend says about each provider's last import — never a guess — and names
 * partial coverage explicitly, so a visitor can tell "nothing found" from "not fully imported yet".
 */
const TONE: Record<SourceStatus["status"], string> = {
  "not-run": "", running: "", "demo-only": "warn", "review-needed": "warn",
  reviewed: "ok", empty: "warn", partial: "warn", error: "bad"
};
const CACHE_KEY: Record<string, "cache.fresh" | "cache.cached" | "cache.stale"> = {
  fresh: "cache.fresh", cached: "cache.cached", stale: "cache.stale"
};

/** Sentence built from the structured counts; the server's own message stays as secondary detail. */
function describe(s: SourceStatus, t: Translate): string {
  const found = s.extractedCount === 1 ? t("srcSay.foundOne") : t("srcSay.foundMany", { n: s.extractedCount });
  const rejected = s.rejectedCount
    ? (s.rejectedCount === 1 ? t("srcSay.rejectedOne") : t("srcSay.rejectedMany", { n: s.rejectedCount }))
    : "";
  switch (s.status) {
    case "error": return t("srcSay.error");
    case "empty": return t("srcSay.empty");
    case "not-run": return t("srcSay.notRun");
    case "running": return t("srcSay.running");
    case "demo-only": return t("srcSay.demoOnly");
    case "partial": return t("srcSay.partial", { found, rejected });
    case "review-needed": return t("srcSay.reviewNeeded", { found, rejected });
    default: return t("srcSay.plain", { found, rejected });
  }
}

export function SourceStatusPanel({ statuses, cache, providers }: {
  statuses: readonly SourceStatus[];
  cache: CatalogResponse["cache"] | null;
  providers: readonly ProviderSummary[];
}) {
  const { locale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const worrying = statuses.filter(s => s.status === "error" || s.partialCoverage).length;
  return (
    <section className={`src panel${open ? " is-open" : ""}`} aria-labelledby="src-title">
      <button type="button" className="src__head" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span className="src__dot" data-tone={worrying ? "warn" : "ok"} aria-hidden="true" />
        <span id="src-title" className="src__title">
          {t("src.title")}
          {worrying ? t(worrying === 1 ? "src.incompleteOne" : "src.incompleteMany", { n: worrying }) : t("src.allComplete")}
        </span>
        {cache ? <span className="src__cache">{CACHE_KEY[cache.status] ? t(CACHE_KEY[cache.status]!) : cache.status}{cache.retrievedAt ? ` · ${formatStamp(cache.retrievedAt, locale)}` : ""}</span> : null}
        <span className="src__chev" aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <ul className="src__list">
          {statuses.map(s => (
            <li key={s.providerId} className="src__row">
              <span className="src__name">{providerName(s.providerId, providers)}</span>
              <span className="status-line" data-tone={TONE[s.status] || undefined}>{t(`srcState.${s.status}`)}</span>
              <span className="src__detail">
                {describe(s, t)}
                {s.lastSuccessfulImportAt ? t("src.lastImport", { stamp: formatStamp(s.lastSuccessfulImportAt, locale) ?? "" }) : ""}
                {s.message ? <span className="src__raw">{s.message}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
