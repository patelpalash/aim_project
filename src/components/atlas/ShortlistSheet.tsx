"use client";

import { useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import type { Offer } from "@/shared/contracts";
import { buildParentHandoff } from "@/shared/catalog";
import type { ProviderSummary } from "@/shared/api-contract";
import { pick } from "@/shared/i18n";
import { accessLabel, availabilityLabel, formatAge, formatPrice, formatWhen, providerName } from "./format";
import { interestMeta, InterestIcon } from "./interests";
import { useDialog } from "./use-dialog";
import { LanguageSwitch, useLocale } from "../i18n";
import { useSheetMotion } from "./motion";

export interface ShortlistSheetProps {
  offers: Offer[];
  /** Saved IDs that are no longer in the catalog (cancelled/past/removed). */
  unavailableCount: number;
  providers: readonly ProviderSummary[];
  /** Start on the parent tab (e.g. "Erwachsenen zeigen" from the detail sheet). */
  initialTab?: "list" | "parent";
  onOpenOffer: (offer: Offer) => void;
  onRemove: (offer: Offer) => void;
  onClose: () => void;
  /** Gets focus if the control that opened the sheet is gone by the time it closes. */
  focusFallback?: RefObject<HTMLElement | null>;
}

/**
 * The session shortlist as a side sheet, with a parent handoff tab (I3).
 * The parent tab renders the shared `buildParentHandoff` summaries side by side: same data,
 * adult emphasis — dates, price, venue, access, source — and the honest demo/check-provider note.
 */
export function ShortlistSheet({ offers, unavailableCount, providers, initialTab = "list", onOpenOffer, onRemove, onClose, focusFallback }: ShortlistSheetProps) {
  const { locale, t } = useLocale();
  const [tab, setTab] = useState<"list" | "parent">(initialTab);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const sheetMotion = useSheetMotion(onClose);
  useDialog(dialogRef, sheetMotion.close, { initial: closeRef, fallback: focusFallback });
  const handoffs = useMemo(() => offers.map(o => ({ offer: o, handoff: buildParentHandoff(o, locale) })), [offers, locale]);

  return (
    <>
      <div className={`sheet-scrim m-scrim${sheetMotion.closing ? " is-closing" : ""}`} onClick={sheetMotion.close} aria-hidden="true" />
      <div ref={dialogRef} tabIndex={-1} className={`sheet m-sheet sl${sheetMotion.closing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="sl-title">
        <div className="sl__head">
          <button ref={closeRef} type="button" className="btn icon-btn" onClick={sheetMotion.close} aria-label={t("sl.close")}>←</button>
          <h2 id="sl-title">{t("sl.title")}</h2>
          <LanguageSwitch />
          <div className="dz-view" role="group" aria-label={t("dz.presentation")}>
            <button type="button" aria-pressed={tab === "list"} onClick={() => setTab("list")}>{t("sl.tabYou")}</button>
            <button type="button" aria-pressed={tab === "parent"} onClick={() => setTab("parent")}>{t("sl.tabParent")}</button>
          </div>
        </div>
        <div className="sheet__body">
          {unavailableCount ? (
            <p className="status-line" data-tone="warn">
              {unavailableCount === 1 ? t("sl.unavailableOne") : t("sl.unavailableMany", { n: unavailableCount })}
            </p>
          ) : null}
          {!offers.length ? (
            <div className="stack">
              <h3>{t("sl.emptyTitle")}</h3>
              <p className="muted">{t("sl.emptyBody")}</p>
            </div>
          ) : tab === "list" ? (
            <div className="sl__list m-cascade">
              {offers.map((o, n) => {
                const meta = interestMeta(o.interests[0] ?? "robots");
                return (
                  <div key={o.id} className="sl-row" style={{ "--n": n, "--a": meta.a, "--b": meta.b } as CSSProperties}>
                    <span className="map-row__orb" aria-hidden="true">{o.interests[0] ? <InterestIcon interest={o.interests[0]} size={24} /> : null}</span>
                    <button type="button" className="sl-row__open" onClick={() => onOpenOffer(o)}>
                      <span className="sl-row__title">{pick(o.title, locale)}</span>
                      <span className="sl-row__meta">{providerName(o.providerId, providers)} · {formatWhen(o, locale)} · {formatPrice(o, locale)}</span>
                    </button>
                    <button type="button" className="btn icon-btn sl-row__remove" onClick={() => onRemove(o)} aria-label={t("card.unsave", { title: pick(o.title, locale) })}>
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.3-9.2C1.3 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.9 3.5 4.5 7.3C19.5 16.4 12 21 12 21z" fill="#ff6b8a" stroke="#ff6b8a" strokeWidth="2" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="sl__parent m-cascade">
              <p className="muted" style={{ "--n": 0 } as CSSProperties}>
                {t("sl.parentIntro")}
              </p>
              {handoffs.map(({ offer, handoff }, n) => (
                <article key={offer.id} className="sl-card panel" style={{ "--n": n + 1 } as CSSProperties}>
                  <h3>{handoff.title}</h3>
                  <p className="muted">{handoff.summary}</p>
                  <dl className="facts">
                    <dt>{t("facts.when")}</dt><dd>{formatWhen(offer, locale)}</dd>
                    <dt>{t("facts.age")}</dt><dd>{formatAge(offer, locale)}</dd>
                    <dt>{t("facts.cost")}</dt><dd>{formatPrice(offer, locale)}</dd>
                    <dt>{t("facts.venue")}</dt><dd>{handoff.venue.name}, {handoff.venue.city}</dd>
                    <dt>{t("facts.access")}</dt><dd>{accessLabel(handoff.venue.access, locale)}</dd>
                    <dt>{t("facts.places")}</dt><dd>{availabilityLabel(handoff.availability, locale)}</dd>
                    <dt>{t("facts.provider")}</dt><dd>{providerName(handoff.providerId, providers)}</dd>
                  </dl>
                  <p className={handoff.sourceKind === "demo" ? "tag tag--demo" : "tag tag--verified"}>
                    {t(handoff.sourceKind === "demo" ? "source.demo" : "sl.checkProvider")}
                  </p>
                  {handoff.providerDetailsUrl ? <a href={handoff.providerDetailsUrl} target="_blank" rel="noreferrer">{t("sl.openProvider")}</a> : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
