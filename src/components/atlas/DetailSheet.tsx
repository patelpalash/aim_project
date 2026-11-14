"use client";

import { useEffect, useRef } from "react";
import type { Offer } from "@/shared/contracts";
import { INTEREST_META } from "./interests";
import { formatAge, formatPrice, formatWhen, providerLabel } from "./format";

const AVAIL: Record<Offer["availability"], string> = { available: "Plätze frei", full: "Ausgebucht", cancelled: "Abgesagt", unknown: "Unbekannt" };
const ACCESS: Record<Offer["venue"]["access"], string> = { "step-free": "Stufenlos", "not-step-free": "Nicht stufenlos", unknown: "Unbekannt" };

/** Event details as a side sheet (bottom sheet on phones). Focus moves in, Esc/Back close, focus returns. */
export function DetailSheet({ offer, saved, onSave, onClose, onShowAdult }: {
  offer: Offer; saved: boolean; onSave: () => void; onClose: () => void; onShowAdult?: () => void;
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
      <div className="sheet m-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"
        style={{ ["--c" as string]: lead ? INTEREST_META[lead].color : "var(--blue)" }}>
        <div className="sheet__head">
          <button ref={closeRef} type="button" className="btn icon-btn" onClick={onClose} aria-label="Zurück zur Liste">←</button>
          {demo ? <span className="tag tag--demo">Demo-Angebot</span> : <span className="tag tag--verified">Geprüfte Quelle</span>}
        </div>
        <div className="sheet__body">
          <h2 id="sheet-title" style={{ fontSize: "var(--text-xl)" }}>{offer.title.de}</h2>
          <p>{offer.summary.de}</p>
          <dl className="facts">
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
          <button type="button" className="btn m-press" aria-pressed={saved} onClick={onSave}>{saved ? "♥ Gemerkt" : "♡ Merken"}</button>
          {onShowAdult ? <button type="button" className="btn btn--primary m-press" onClick={onShowAdult}>Erwachsenen zeigen</button> : null}
        </div>
      </div>
    </>
  );
}
