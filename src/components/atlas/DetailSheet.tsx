"use client";

import { useEffect, useRef } from "react";
import type { Offer } from "@/shared/contracts";
import { INTEREST_META, InterestIcon } from "./interests";
import { formatAge, formatPrice, formatWhen, providerLabel } from "./format";

const AVAIL: Record<Offer["availability"], string> = { available: "Plätze frei", full: "Ausgebucht", cancelled: "Abgesagt", unknown: "Unbekannt" };
const ACCESS: Record<Offer["venue"]["access"], string> = { "step-free": "Stufenlos", "not-step-free": "Nicht stufenlos", unknown: "Unbekannt" };

/** Event details as a side sheet (bottom sheet on phones). Focus moves in, Esc/Back close, focus returns. */
export function DetailSheet({ offer, saved, onSave, onClose, onShowAdult, vtName }: {
  offer: Offer; saved: boolean; onSave: () => void; onClose: () => void; onShowAdult?: () => void;
  /** When set, the browser morphs the card into this sheet; the CSS slide-in fallback is skipped. */
  vtName?: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, []);
  const lead = offer.interests[0];
  const demo = offer.source.kind === "demo";
  return (
    <>
      <div className="sheet-scrim m-scrim" onClick={onClose} aria-hidden="true" />
      <div className={vtName ? "sheet" : "sheet m-sheet"} role="dialog" aria-modal="true" aria-labelledby="sheet-title"
        style={{ ["--a" as string]: lead ? INTEREST_META[lead].a : "var(--accent-a)", ["--b" as string]: lead ? INTEREST_META[lead].b : "var(--accent-b)", viewTransitionName: vtName }}>
        <div className="sheet__head">
          <button ref={closeRef} type="button" className="btn icon-btn" onClick={onClose} aria-label="Zurück zur Liste">←</button>
          {demo ? <span className="tag tag--demo">Demo-Angebot</span> : <span className="tag tag--verified">Geprüfte Quelle</span>}
          {lead ? <span className="sheet__icon" aria-hidden="true"><InterestIcon interest={lead} size={36} /></span> : null}
        </div>
        <div className="sheet__body m-cascade">
          <p className="event-card__when" style={{ ["--n" as string]: 0 }}>{formatWhen(offer)}</p>
          <h2 id="sheet-title" style={{ fontSize: "var(--text-xl)", ["--n" as string]: 1 }}>{offer.title.de}</h2>
          <p className="muted" style={{ ["--n" as string]: 2 }}>{offer.summary.de}</p>
          <dl className="facts" style={{ ["--n" as string]: 3 }}>
            <dt>Wann</dt><dd>{formatWhen(offer)}</dd>
            <dt>Alter</dt><dd>{formatAge(offer)}</dd>
            <dt>Kosten</dt><dd>{formatPrice(offer)}</dd>
            <dt>Plätze</dt><dd>{AVAIL[offer.availability]}</dd>
            <dt>Ort</dt><dd>{offer.venue.name}, {offer.venue.city}</dd>
            <dt>Zugang</dt><dd>{ACCESS[offer.venue.access]}</dd>
            <dt>Anbieter</dt><dd>{providerLabel(offer.providerId)}</dd>
            <dt>Quelle</dt>
            <dd>{demo ? "Erfundenes Beispiel, keine echte Veranstaltung" : offer.source.url
              ? <a href={offer.source.url} target="_blank" rel="noreferrer">Seite beim Anbieter</a> : "Keine Quellseite"}</dd>
          </dl>
        </div>
        <div className="sheet__foot">
          <button type="button" className="btn" aria-pressed={saved} onClick={onSave}>{saved ? "♥ Gemerkt" : "♡ Merken"}</button>
          {onShowAdult ? <button type="button" className="btn btn--primary" onClick={onShowAdult}>Erwachsenen zeigen</button> : null}
        </div>
      </div>
    </>
  );
}
