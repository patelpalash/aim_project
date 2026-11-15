"use client";
import type { CSSProperties } from "react";
import { ArrowUpRight, BookmarkSimple, CalendarBlank, MapPin, PuzzlePiece } from "@phosphor-icons/react";
import type { Interest, Offer } from "@/shared/contracts";
import { pick } from "@/shared/i18n";
import { formatAge, formatPrice, formatWhen } from "./format";
import { AtlasIcon } from "./AtlasIcon";
import { challengeFor } from "./challenge";
import { useLocale } from "../i18n";

export interface EventCardProps {
  offer: Offer; saved?: boolean; onOpen?: (offer: Offer) => void;
  onToggleSave?: (offer: Offer, from: HTMLElement) => void;
  index?: number; provider: string; matches?: Interest[]; reasons?: string[];
  vtName?: string; adult?: boolean;
}
export function EventCard({ offer, saved = false, onOpen, onToggleSave, index = 0, matches = [], reasons = [], provider, vtName, adult = false }: EventCardProps) {
  const { locale, t } = useLocale();
  const title = pick(offer.title, locale);
  const lead = matches[0] ?? offer.interests[0];
  const mission = challengeFor(offer);
  const demo = offer.source.kind === "demo";
  return (
    <article className="atlas-card" data-theme={offer.topics[0] ?? "other"} style={{ "--i": index, viewTransitionName: vtName } as CSSProperties}>
      <div className="atlas-card__top"><span className="atlas-card__icon"><AtlasIcon interest={lead} size={32} /></span><span className="atlas-card__provider">{provider}<small>{t(`format.${offer.format}`)}</small></span>
        <button type="button" className="atlas-card__save" aria-pressed={saved} aria-label={t(saved ? "card.unsave" : "card.save", { title })} onClick={e => onToggleSave?.(offer, e.currentTarget)}><BookmarkSimple size={23} weight={saved ? "fill" : "regular"} /></button>
      </div>
      <div className="atlas-card__body">
        <p className="atlas-card__when"><CalendarBlank size={17} />{formatWhen(offer, locale)}</p>
        <h3><button type="button" className="atlas-card__open" onClick={() => onOpen?.(offer)}>{title}</button></h3>
        <div className="atlas-card__facts"><span>{formatAge(offer, locale)}</span><span>{formatPrice(offer, locale)}</span></div>
        {locale === "en" && !demo && offer.title.de === offer.title.en ? <p className="source-language-note">Provider text in German</p> : null}
        {adult ? <p className="atlas-card__venue"><MapPin size={16} />{offer.venue.name}, {offer.venue.city}</p> : null}
        {reasons.length > 0 && matches.length > 0 ? <p className="atlas-card__reason">{reasons.join(" · ")}</p> : null}
        <div className="atlas-card__tags"><span className={`tag ${demo ? "tag--demo" : "tag--verified"}`}>{t(demo ? "tag.demo" : "tag.verified")}</span>{offer.availability === "full" ? <span className="tag tag--full">{t("tag.full")}</span> : null}{offer.availability === "unknown" ? <span className="tag tag--unknown">{t("tag.placesUnknown")}</span> : null}</div>
      </div>
      <div className="atlas-card__bottom">{mission ? <span><PuzzlePiece size={17} weight="duotone" />{locale === "de" ? "Mit Mini-Mission" : "Try a mini-mission"}</span> : <span>{locale === "de" ? "Etwas Neues entdecken" : "Discover something new"}</span>}<ArrowUpRight size={23} aria-hidden="true" /></div>
    </article>
  );
}
