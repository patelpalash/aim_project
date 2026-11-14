"use client";

import { useRef, type RefObject } from "react";
import type { Offer } from "@/shared/contracts";
import { pick } from "@/shared/i18n";
import { interestMeta, InterestIcon } from "./interests";
import { accessLabel, availabilityLabel, formatAge, formatPrice, formatStamp, formatWhen } from "./format";
import { useDialog } from "./use-dialog";
import { useLocale } from "../i18n";

/** Event details as a side sheet (bottom sheet on phones). Focus moves in and stays in, Esc/Back close, focus returns. */
export function DetailSheet({ offer, saved, onSave, onClose, onShowAdult, vtName, provider, focusFallback }: {
  offer: Offer; provider: string; saved: boolean; onSave: () => void; onClose: () => void; onShowAdult?: () => void;
  /** When set, the browser morphs the card into this sheet; the CSS slide-in fallback is skipped. */
  vtName?: string;
  /** Gets focus if the element that opened the sheet is gone by the time it closes. */
  focusFallback?: RefObject<HTMLElement | null>;
}) {
  const { locale, t } = useLocale();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, onClose, { initial: closeRef, fallback: focusFallback });
  const lead = offer.interests[0];
  const demo = offer.source.kind === "demo";
  return (
    <>
      <div className="sheet-scrim m-scrim" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} tabIndex={-1} className={vtName ? "sheet" : "sheet m-sheet"} role="dialog" aria-modal="true" aria-labelledby="sheet-title"
        style={{ ["--a" as string]: lead ? interestMeta(lead).a : "var(--accent-a)", ["--b" as string]: lead ? interestMeta(lead).b : "var(--accent-b)", viewTransitionName: vtName }}>
        <div className="sheet__head">
          <button ref={closeRef} type="button" className="btn icon-btn" onClick={onClose} aria-label={t("sheet.back")}>←</button>
          {demo ? <span className="tag tag--demo">{t("tag.demoOffer")}</span> : <span className="tag tag--verified">{t("tag.verifiedSource")}</span>}
          {lead ? <span className="sheet__icon" aria-hidden="true"><InterestIcon interest={lead} size={36} /></span> : null}
        </div>
        <div className="sheet__body m-cascade">
          <p className="event-card__when" style={{ ["--n" as string]: 0 }}>{formatWhen(offer, locale)}</p>
          <h2 id="sheet-title" style={{ fontSize: "var(--text-xl)", ["--n" as string]: 1 }}>{pick(offer.title, locale)}</h2>
          <p className="muted" style={{ ["--n" as string]: 2 }}>{pick(offer.summary, locale)}</p>
          <dl className="facts" style={{ ["--n" as string]: 3 }}>
            <dt>{t("facts.when")}</dt><dd>{formatWhen(offer, locale)}</dd>
            <dt>{t("facts.age")}</dt><dd>{formatAge(offer, locale)}</dd>
            <dt>{t("facts.cost")}</dt><dd>{formatPrice(offer, locale)}</dd>
            <dt>{t("facts.places")}</dt><dd>{availabilityLabel(offer.availability, locale)}</dd>
            <dt>{t("facts.venue")}</dt><dd>{offer.venue.name}, {offer.venue.city}</dd>
            <dt>{t("facts.access")}</dt><dd>{accessLabel(offer.venue.access, locale)}</dd>
            <dt>{t("facts.provider")}</dt><dd>{provider}</dd>
            <dt>{t("facts.source")}</dt>
            <dd>{demo ? t("source.demo") : offer.source.url
              ? <a href={offer.source.url} target="_blank" rel="noreferrer">{t("source.page")}</a> : t("source.none")}</dd>
            {!demo && offer.source.verifiedAt ? <><dt>{t("facts.reviewed")}</dt><dd>{formatStamp(offer.source.verifiedAt, locale)}</dd></> : null}
          </dl>
        </div>
        <div className="sheet__foot">
          <button type="button" className="btn" aria-pressed={saved} onClick={onSave}>{t(saved ? "sheet.saved" : "sheet.save")}</button>
          {onShowAdult ? <button type="button" className="btn btn--primary" onClick={onShowAdult}>{t("sheet.showAdult")}</button> : null}
        </div>
      </div>
    </>
  );
}
