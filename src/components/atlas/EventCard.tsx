"use client";

import type { CSSProperties, PointerEvent } from "react";
import type { Interest, Offer } from "@/shared/contracts";
import { interestMeta, InterestIcon } from "./interests";
import { ageKnown, formatAge, formatPrice, formatWhen } from "./format";

export interface EventCardProps {
  offer: Offer;
  saved?: boolean;
  onOpen?: (offer: Offer) => void;
  onToggleSave?: (offer: Offer, from: HTMLElement) => void;
  index?: number;
  /** Display name of the provider (from the providers endpoint). */
  provider: string;
  /** Selected interests this event matches; the first one colors the card. */
  matches?: Interest[];
  /** Readable reasons from the shared recommender (never a score). */
  reasons?: string[];
  /** view-transition-name so the card can glide on reflow and grow into the detail sheet. */
  vtName?: string;
  /** Adult presentation adds the practical venue/access line; the data is the same either way. */
  adult?: boolean;
}

function tilt(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget, r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  el.style.setProperty("--rx", `${(0.5 - y) * 9}deg`);
  el.style.setProperty("--ry", `${(x - 0.5) * 11}deg`);
  el.style.setProperty("--mx", `${x * 100}%`);
  el.style.setProperty("--my", `${y * 100}%`);
}
function untilt(e: PointerEvent<HTMLElement>) {
  e.currentTarget.style.setProperty("--rx", "0deg");
  e.currentTarget.style.setProperty("--ry", "0deg");
}

/** One event. The title is the open button (covers the card); save is a separate control. */
export function EventCard({ offer, saved = false, onOpen, onToggleSave, index = 0, matches = [], reasons = [], provider, vtName, adult = false }: EventCardProps) {
  const lead = matches[0] ?? offer.interests[0];
  const meta = lead ? interestMeta(lead) : null;
  const style = { "--i": index, "--a": meta?.a ?? "var(--accent-a)", "--b": meta?.b ?? "var(--accent-b)", viewTransitionName: vtName } as CSSProperties;
  return (
    <article className="event-card m-enter" style={style} onPointerMove={tilt} onPointerLeave={untilt}>
      <div className="event-card__inner">
        <div className="event-card__band">
          {lead ? <span className="event-card__icon"><InterestIcon interest={lead} size={30} /></span> : null}
          <span className="event-card__provider">{provider}</span>
          {offer.source.kind === "demo" ? <span className="tag tag--demo">Demo</span> : <span className="tag tag--verified">Geprüft</span>}
        </div>
        <div className="event-card__body">
          <p className="event-card__when">{formatWhen(offer)}</p>
          <h3 className="event-card__title">
            <button type="button" className="event-card__open" onClick={() => onOpen?.(offer)}>{offer.title.de}</button>
          </h3>
          {reasons.length ? <p className="event-card__match">{reasons.join(" · ")}</p> : null}
          <div className="event-card__facts">
            <span className={ageKnown(offer) ? "tag" : "tag tag--unknown"}>{formatAge(offer)}</span>
            <span className={offer.priceEur === null ? "tag tag--unknown" : "tag"}>{formatPrice(offer)}</span>
            {offer.availability === "full" ? <span className="tag tag--full">Ausgebucht</span> : null}
            {offer.availability === "unknown" ? <span className="tag tag--unknown">Plätze unbekannt</span> : null}
          </div>
          {adult ? (
            <p className="event-card__venue">
              {offer.venue.name}, {offer.venue.city}
              {offer.venue.access === "step-free" ? " · stufenlos" : offer.venue.access === "unknown" ? " · Zugang unbekannt" : ""}
            </p>
          ) : null}
        </div>
        <span className="event-card__glare" aria-hidden="true" />
      </div>
      {onToggleSave ? (
        <button type="button" className={`event-card__save${saved ? " is-saved" : ""}`} aria-pressed={saved}
          onClick={e => onToggleSave(offer, e.currentTarget)}>
          <svg key={saved ? "s" : "u"} className={saved ? "m-pop" : undefined} width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s-7.5-4.6-9.3-9.2C1.3 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.9 3.5 4.5 7.3C19.5 16.4 12 21 12 21z" fill={saved ? "#ff6b8a" : "none"} stroke={saved ? "#ff6b8a" : "currentColor"} strokeWidth="2" />
          </svg>
          <span className="visually-hidden">{saved ? `${offer.title.de} von der Merkliste entfernen` : `${offer.title.de} merken`}</span>
        </button>
      ) : null}
    </article>
  );
}
