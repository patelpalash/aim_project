import type { Interest, Offer } from "@/shared/contracts";
import { INTEREST_META, InterestIcon } from "./interests";
import { formatAge, formatPrice, formatWhen, providerLabel } from "./format";

export interface EventCardProps {
  offer: Offer;
  saved?: boolean;
  onOpen?: (offer: Offer) => void;
  onToggleSave?: (offer: Offer) => void;
  index?: number;
  /** Interests the visitor picked that this event matches (shown as the reason it appears). */
  matches?: Interest[];
}

/** Sticker card for one event. The whole title is the open button; save is a separate control. */
export function EventCard({ offer, saved = false, onOpen, onToggleSave, index = 0, matches = [] }: EventCardProps) {
  const lead = offer.interests[0];
  const meta = lead ? INTEREST_META[lead] : null;
  return (
    <article className="event-card m-enter" style={{ ["--i" as string]: index, ["--c" as string]: meta?.color ?? "var(--blue)" }}>
      <div className="event-card__band">
        {lead ? <span className="event-card__icon"><InterestIcon interest={lead} size={26} /></span> : null}
        <span className="event-card__provider">{providerLabel(offer.providerId)}</span>
        {offer.source.kind === "demo" ? <span className="tag tag--demo">Demo</span> : <span className="tag tag--verified">Geprüft</span>}
      </div>
      <div className="event-card__body">
        <h3 className="event-card__title">
          <button type="button" className="event-card__open" onClick={() => onOpen?.(offer)}>{offer.title.de}</button>
        </h3>
        <p className="event-card__when">{formatWhen(offer)}</p>
        {matches.length ? <p className="event-card__match">Passt zu: {matches.map(m => INTEREST_META[m].label).join(", ")}</p> : null}
        <div className="event-card__facts">
          <span className={offer.minAge === null && offer.maxAge === null ? "tag tag--unknown" : "tag"}>{formatAge(offer)}</span>
          <span className={offer.priceEur === null ? "tag tag--unknown" : "tag"}>{formatPrice(offer)}</span>
          {offer.availability === "full" ? <span className="tag tag--full">Ausgebucht</span> : null}
          {offer.availability === "unknown" ? <span className="tag tag--unknown">Plätze unbekannt</span> : null}
        </div>
      </div>
      {onToggleSave ? (
        <button type="button" className={`event-card__save${saved ? " is-saved m-pop" : ""}`} key={saved ? "s" : "u"}
          aria-pressed={saved} onClick={() => onToggleSave(offer)}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.3-9.2C1.3 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.9 3.5 4.5 7.3C19.5 16.4 12 21 12 21z" fill={saved ? "#ff5a4e" : "#fff"} stroke="#1b2230" strokeWidth="2" /></svg>
          <span className="visually-hidden">{saved ? `${offer.title.de} von der Merkliste entfernen` : `${offer.title.de} merken`}</span>
        </button>
      ) : null}
    </article>
  );
}
