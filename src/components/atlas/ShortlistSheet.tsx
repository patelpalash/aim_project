"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Offer } from "@/shared/contracts";
import { buildParentHandoff } from "@/shared/catalog";
import type { ProviderSummary } from "@/shared/api-contract";
import { ACCESS_LABEL, AVAILABILITY_LABEL, formatAge, formatPrice, formatWhen, providerName } from "./format";
import { interestMeta, InterestIcon } from "./interests";

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
}

/**
 * The session shortlist as a side sheet, with a parent handoff tab (I3).
 * The parent tab renders the shared `buildParentHandoff` summaries side by side: same data,
 * adult emphasis — dates, price, venue, access, source — and the honest demo/check-provider note.
 */
export function ShortlistSheet({ offers, unavailableCount, providers, initialTab = "list", onOpenOffer, onRemove, onClose }: ShortlistSheetProps) {
  const [tab, setTab] = useState<"list" | "parent">(initialTab);
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
  const handoffs = useMemo(() => offers.map(o => ({ offer: o, handoff: buildParentHandoff(o, "de") })), [offers]);

  return (
    <>
      <div className="sheet-scrim m-scrim" onClick={onClose} aria-hidden="true" />
      <div className="sheet m-sheet sl" role="dialog" aria-modal="true" aria-labelledby="sl-title">
        <div className="sl__head">
          <button ref={closeRef} type="button" className="btn icon-btn" onClick={onClose} aria-label="Merkliste schließen">←</button>
          <h2 id="sl-title">Merkliste</h2>
          <div className="dz-view" role="group" aria-label="Darstellung">
            <button type="button" aria-pressed={tab === "list"} onClick={() => setTab("list")}>Für dich</button>
            <button type="button" aria-pressed={tab === "parent"} onClick={() => setTab("parent")}>Für Eltern</button>
          </div>
        </div>
        <div className="sheet__body">
          {unavailableCount ? (
            <p className="status-line" data-tone="warn">
              {unavailableCount === 1 ? "1 gemerktes Angebot ist nicht mehr verfügbar." : `${unavailableCount} gemerkte Angebote sind nicht mehr verfügbar.`}
            </p>
          ) : null}
          {!offers.length ? (
            <div className="stack">
              <h3>Noch nichts gemerkt.</h3>
              <p className="muted">Tippe auf das Herz einer Karte, dann taucht das Angebot hier auf — nur in diesem Tab, ohne Konto.</p>
            </div>
          ) : tab === "list" ? (
            <div className="sl__list m-cascade">
              {offers.map((o, n) => {
                const meta = interestMeta(o.interests[0] ?? "robots");
                return (
                  <div key={o.id} className="sl-row" style={{ "--n": n, "--a": meta.a, "--b": meta.b } as CSSProperties}>
                    <span className="map-row__orb" aria-hidden="true">{o.interests[0] ? <InterestIcon interest={o.interests[0]} size={24} /> : null}</span>
                    <button type="button" className="sl-row__open" onClick={() => onOpenOffer(o)}>
                      <span className="sl-row__title">{o.title.de}</span>
                      <span className="sl-row__meta">{providerName(o.providerId, providers)} · {formatWhen(o)} · {formatPrice(o)}</span>
                    </button>
                    <button type="button" className="btn icon-btn sl-row__remove" onClick={() => onRemove(o)} aria-label={`${o.title.de} von der Merkliste entfernen`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.3-9.2C1.3 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.9 3.5 4.5 7.3C19.5 16.4 12 21 12 21z" fill="#ff6b8a" stroke="#ff6b8a" strokeWidth="2" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="sl__parent m-cascade">
              <p className="muted" style={{ "--n": 0 } as CSSProperties}>
                Dieselben Angebote, als Überblick zum gemeinsamen Anschauen. Anmeldung läuft immer direkt beim Anbieter.
              </p>
              {handoffs.map(({ offer, handoff }, n) => (
                <article key={offer.id} className="sl-card panel" style={{ "--n": n + 1 } as CSSProperties}>
                  <h3>{handoff.title}</h3>
                  <p className="muted">{handoff.summary}</p>
                  <dl className="facts">
                    <dt>Wann</dt><dd>{formatWhen(offer)}</dd>
                    <dt>Alter</dt><dd>{formatAge(offer)}</dd>
                    <dt>Kosten</dt><dd>{formatPrice(offer)}</dd>
                    <dt>Ort</dt><dd>{handoff.venue.name}, {handoff.venue.city}</dd>
                    <dt>Zugang</dt><dd>{ACCESS_LABEL[handoff.venue.access]}</dd>
                    <dt>Plätze</dt><dd>{AVAILABILITY_LABEL[handoff.availability]}</dd>
                    <dt>Anbieter</dt><dd>{providerName(handoff.providerId, providers)}</dd>
                  </dl>
                  <p className={handoff.sourceKind === "demo" ? "tag tag--demo" : "tag tag--verified"}>
                    {handoff.sourceKind === "demo"
                      ? "Erfundenes Beispiel, keine echte Veranstaltung"
                      : "Details und Anmeldung bitte beim Anbieter prüfen"}
                  </p>
                  {handoff.providerDetailsUrl ? <a href={handoff.providerDetailsUrl} target="_blank" rel="noreferrer">Seite beim Anbieter öffnen</a> : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
