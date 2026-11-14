"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Offer } from "@/shared/contracts";
import { interestMeta, InterestIcon } from "./interests";
import { formatWhen } from "./format";

/**
 * City map view (clean studio revision). The catalog has venue names but no coordinates, so the
 * map is deliberately SCHEMATIC: one anchor per provider, pins fanned out around it, and a visible
 * "not to scale" note. Nothing geographic is invented — the pin says "this provider", not an address.
 */
const ANCHOR: Record<string, { x: number; y: number }> = {
  aim: { x: 30, y: 34 },
  experimenta: { x: 58, y: 48 },
  "haus-der-familie": { x: 36, y: 72 },
  ipai: { x: 76, y: 22 }
};
const FALLBACK = { x: 85, y: 80 };
/** Fan offsets so several events of one provider stay distinguishable. */
const FAN = [[0, 0], [7, -5], [-7, 6], [8, 7], [-8, -6], [0, 11], [13, 1], [-13, -1]] as const;

export interface MapViewProps {
  offers: Offer[];
  providerNameOf: (id: string) => string;
  onOpen: (offer: Offer) => void;
}

export function MapView({ offers, providerNameOf, onOpen }: MapViewProps) {
  const [hot, setHot] = useState<string | null>(null);
  const pins = useMemo(() => {
    const perProvider = new Map<string, number>();
    return offers.map(offer => {
      const n = perProvider.get(offer.providerId) ?? 0;
      perProvider.set(offer.providerId, n + 1);
      const anchor = ANCHOR[offer.providerId] ?? FALLBACK;
      const [dx, dy] = FAN[n % FAN.length]!;
      const spread = 1 + Math.floor(n / FAN.length) * 0.6;
      return { offer, x: anchor.x + dx * spread, y: anchor.y + dy * spread };
    });
  }, [offers]);
  const hotPin = hot ? pins.find(p => p.offer.id === hot) ?? null : null;

  return (
    <div className="map">
      <div className="map__side">
        <h3>{offers.length === 1 ? "1 Angebot auf der Karte" : `${offers.length} Angebote auf der Karte`}</h3>
        <p className="map__note">Schematische Karte: Die Position zeigt den Anbieter, nicht die genaue Adresse.</p>
        {pins.map(({ offer }, i) => {
          const meta = interestMeta(offer.interests[0] ?? "robots");
          return (
            <button key={offer.id} type="button" className={`map-row${hot === offer.id ? " is-hot" : ""}`}
              style={{ "--i": Math.min(i, 8), "--a": meta.a, "--b": meta.b } as CSSProperties}
              onMouseEnter={() => setHot(offer.id)} onMouseLeave={() => setHot(h => (h === offer.id ? null : h))}
              onFocus={() => setHot(offer.id)} onClick={() => onOpen(offer)}>
              <span className="map-row__orb" aria-hidden="true">{offer.interests[0] ? <InterestIcon interest={offer.interests[0]} size={24} /> : null}</span>
              <span>
                <h4>{offer.title.de}</h4>
                <p>{providerNameOf(offer.providerId)} · {formatWhen(offer)}</p>
              </span>
            </button>
          );
        })}
        {!offers.length ? <p className="muted">Keine Treffer. Ändere die Filter, um Angebote auf der Karte zu sehen.</p> : null}
      </div>
      <div className="map__canvas">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <rect width="100" height="100" fill="#eef2f5" />
          {/* Neckar */}
          <path d="M62 0C54 20 70 38 58 60S44 86 48 100" fill="none" stroke="#c4ddee" strokeWidth="7" />
          {/* streets */}
          <g stroke="#ffffff" fill="none">
            <path d="M0 30h100M0 66h100M24 0v100M80 0v100" strokeWidth="2.6" />
            <path d="M0 48l100-12M0 86l100-28M42 0 28 100M68 0l12 100" strokeWidth="1.4" />
          </g>
          {/* green */}
          <rect x="5" y="50" width="13" height="11" rx="1.5" fill="#d7e8d4" />
          <rect x="85" y="56" width="11" height="16" rx="1.5" fill="#d7e8d4" />
        </svg>
        <span className="map__label" style={{ left: "8%", top: "7%" }}>Bildungscampus</span>
        <span className="map__label" style={{ left: "62%", top: "54%" }}>Neckar</span>
        <span className="map__label" style={{ left: "12%", top: "88%" }}>Innenstadt</span>
        {pins.map(({ offer, x, y }, i) => {
          const meta = interestMeta(offer.interests[0] ?? "robots");
          return (
            <button key={offer.id} type="button" className={`map-pin${hot === offer.id ? " is-hot" : ""}`}
              style={{ left: `${x}%`, top: `${y}%`, "--i": Math.min(i, 8), "--a": meta.a, "--b": meta.b } as CSSProperties}
              aria-label={`${offer.title.de}, ${providerNameOf(offer.providerId)}`}
              onMouseEnter={() => setHot(offer.id)} onMouseLeave={() => setHot(h => (h === offer.id ? null : h))}
              onFocus={() => setHot(offer.id)} onClick={() => onOpen(offer)}>
              {offer.interests[0] ? <InterestIcon interest={offer.interests[0]} size={18} /> : null}
            </button>
          );
        })}
        {hotPin ? (
          <div className="map__pop" aria-hidden="true">
            <h4>{hotPin.offer.title.de}</h4>
            <p>{providerNameOf(hotPin.offer.providerId)} · {formatWhen(hotPin.offer)}</p>
            <p>{hotPin.offer.venue.name}, {hotPin.offer.venue.city}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
