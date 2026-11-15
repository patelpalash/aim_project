"use client";
import type { ReactNode, RefObject } from "react";
import { ArrowLeft, ArrowUpRight, BookmarkSimple, CalendarBlank, MapPin } from "@phosphor-icons/react";
import type { Offer, SearchFilters } from "@/shared/contracts";
import type { ProviderSummary } from "@/shared/api-contract";
import { pick } from "@/shared/i18n";
import { BrandLogo } from "../BrandLogo";
import { LanguageSwitch, useLocale } from "../i18n";
import { availabilityLabel, formatAge, formatPrice, formatWhen, providerName } from "./format";
import { eventPageUrl } from "./challenge";
import { WHENS, whenPatch, type When } from "./dates";
import type { BundleState } from "./catalog-data";
import "./parent-discovery.css";

interface Props {
  offers: readonly Offer[]; providers: readonly ProviderSummary[]; filters: SearchFilters; when: When;
  savedIds: readonly string[]; catalog: BundleState; onPatch: (patch: Partial<SearchFilters>) => void;
  onBack: () => void; onOpen: (offer: Offer) => void; onSave: (offer: Offer) => void;
  onShortlist: () => void; onReset: () => void; onRetry: () => void;
  resultsRef: RefObject<HTMLHeadingElement | null>; children: ReactNode;
}

/** Practical family planning over the same catalogue/session, with no child discovery UI. */
export function ParentDiscovery({ offers, providers, filters, when, savedIds, catalog, onPatch, onBack, onOpen, onSave, onShortlist, onReset, onRetry, resultsRef, children }: Props) {
  const { locale, t } = useLocale();
  const say = (de: string, en: string) => locale === "de" ? de : en;
  const ordered = [...offers].sort((a, b) => {
    const time = (o: Offer) => o.startsAt ? Date.parse(o.startsAt) : o.startDate ? Date.parse(o.startDate) : Infinity;
    return Number(a.source.kind === "demo") - Number(b.source.kind === "demo") || time(a) - time(b) || pick(a.title, locale).localeCompare(pick(b.title, locale), locale);
  });
  const extraFilters = !!(filters.interests?.length || filters.topics?.length || filters.format || filters.stepFreeOnly || (filters.audience && filters.audience !== "family"));
  return <div className="atlas-world parent-world">
    <a className="skip-link" href="#dz-results-title">{say("Zu den Angeboten", "Skip to activities")}</a>
    <header className="parent-header"><div className="wrap parent-header-in"><BrandLogo /><span className="parent-badge">{say("Für Eltern & Familien", "For parents & families")}</span><div className="parent-header-actions"><LanguageSwitch /><button className="btn" type="button" onClick={onShortlist}><BookmarkSimple size={19} />{say("Merkliste", "Saved")} ({savedIds.length})</button><button className="btn" type="button" onClick={onBack}><ArrowLeft size={18} />{say("Kinderansicht", "Children’s view")}</button><a href="/organizer">{say("Verwaltung", "Admin")}</a></div></div></header>
    <main className="wrap parent-main"><div className="parent-intro"><span className="parent-kicker">{say("GUTE PLÄNE FÜR NEUGIERIGE KINDER", "GOOD PLANS FOR CURIOUS CHILDREN")}</span><h1>{say("Passende Aktivitäten. Alle Infos auf einen Blick.", "Find an activity. Get the details. Make a plan.")}</h1><p>{say("Kurse und Events in Heilbronn vergleichen. Anmeldung und aktuelle Plätze prüfen Sie direkt beim Veranstalter.", "Compare Heilbronn courses and events. Check registration and current availability directly with the organiser.")}</p></div>
      <section className="parent-filters" aria-label={say("Angebote filtern", "Filter activities")}>
        <label className="parent-search">{say("Suche", "Search")}<input type="search" value={filters.query ?? ""} onChange={e => onPatch({ query: e.target.value || undefined })} placeholder={say("Titel, Thema oder Ort", "Title, subject or venue")} /></label>
        <label>{say("Zeitraum", "When")}<select value={when} onChange={e => onPatch(whenPatch(e.target.value as When))}>{WHENS.map(w => <option value={w} key={w}>{t(`when.${w}`)}</option>)}</select></label>
        <label>{say("Alter des Kindes", "Child’s age")}<select value={filters.age ?? ""} onChange={e => onPatch({ age: e.target.value ? Number(e.target.value) : undefined })}><option value="">{say("Alle Altersangaben", "Any age")}</option>{Array.from({ length: 15 }, (_, i) => i + 3).map(age => <option key={age} value={age}>{age} {say("Jahre", "years")}</option>)}</select></label>
        <label>{say("Veranstalter", "Provider")}<select value={filters.providerId ?? ""} onChange={e => onPatch({ providerId: e.target.value || undefined })}><option value="">{say("Alle Veranstalter", "All providers")}</option>{providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>{say("Kosten", "Cost")}<select value={filters.maxPriceEur ?? ""} onChange={e => onPatch({ maxPriceEur: e.target.value ? Number(e.target.value) : undefined })}><option value="">{say("Alle Preise", "Any price")}</option><option value="0">{say("Kostenlos", "Free")}</option><option value="10">{say("Bis 10 €", "Up to €10")}</option><option value="25">{say("Bis 25 €", "Up to €25")}</option></select></label>
        <button className="btn" type="button" onClick={onReset}>{say("Filter löschen", "Clear filters")}</button>
      </section>
      {extraFilters ? <p className="parent-filter-note">{say("Zusätzliche Filter aus der Entdeckeransicht sind aktiv.", "Additional filters from discovery are active.")} <button type="button" onClick={onReset}>{say("Alle Angebote anzeigen", "Show all activities")}</button></p> : null}
      <div className="parent-results-heading"><h2 id="dz-results-title" ref={resultsRef} tabIndex={-1}>{catalog.phase === "loading" ? say("Angebote werden geladen…", "Loading activities…") : `${ordered.length} ${say("passende Angebote", "matching activities")}`}</h2><span>{say("Geprüfte Angebote zuerst · nach Termin", "Reviewed activities first · sorted by date")}</span></div>
      {catalog.phase === "ready" ? <p className="parent-provenance">{say("Quellen können unvollständig sein. Erfundenes ist als Demo gekennzeichnet; unbekannte Angaben bleiben sichtbar.", "Source coverage may be incomplete. Fictional records are labelled Demo; unknown details stay visible.")}</p> : null}
      {catalog.phase === "error" ? <div role="alert" className="parent-empty"><p>{t("catalog.failed")}</p><button type="button" className="btn" onClick={onRetry}>{t("catalog.reload")}</button></div> : catalog.phase === "loading" ? <div className="parent-empty" aria-busy="true">{t("catalog.loading")}</div> : !ordered.length ? <div className="parent-empty"><h3>{say("Keine passenden Angebote", "No matching activities")}</h3><p>{say("Versuchen Sie einen anderen Zeitraum oder löschen Sie die Filter.", "Try another date range or clear the filters.")}</p><button className="btn" type="button" onClick={onReset}>{say("Filter löschen", "Clear filters")}</button></div> : <div className="parent-events">{ordered.map(offer => {
        const source = eventPageUrl(offer), saved = savedIds.includes(offer.id), title = pick(offer.title, locale);
        const untranslated = locale === "en" && offer.title.de === offer.title.en;
        return <article key={offer.id} className="parent-event"><div className="parent-event-date"><CalendarBlank size={20} /><span>{formatWhen(offer, locale)}</span></div><div className="parent-event-copy"><p className="parent-provider">{providerName(offer.providerId, providers)} <span>{offer.source.kind === "demo" ? "Demo" : say("Geprüfte Quelle", "Reviewed source")}</span></p><h3><button type="button" onClick={() => onOpen(offer)}>{title}</button></h3>{untranslated ? <small>{say("Originaltext auf Deutsch", "Original provider text in German")}</small> : null}<dl><div><dt>{say("Alter", "Age")}</dt><dd>{formatAge(offer, locale)}</dd></div><div><dt>{say("Preis", "Cost")}</dt><dd>{formatPrice(offer, locale)}</dd></div><div><dt>{say("Plätze", "Places")}</dt><dd>{availabilityLabel(offer.availability, locale)}</dd></div></dl><p className="parent-venue"><MapPin size={16} />{offer.venue.name}, {offer.venue.city}</p></div><div className="parent-event-actions">{source ? <a className="btn btn--primary" href={source} target="_blank" rel="noopener noreferrer">{offer.availability === "full" ? say("Warteliste / Eventseite", "Waiting list / event page") : say("Event & Anmeldung", "Event & registration")}<ArrowUpRight size={17} /></a> : <span className="parent-demo-note">{say("Demo · keine Buchungsseite", "Demo · no booking page")}</span>}<button className="btn" type="button" aria-pressed={saved} onClick={() => onSave(offer)}><BookmarkSimple size={18} weight={saved ? "fill" : "regular"} />{saved ? say("Gemerkt", "Saved") : say("Merken", "Save")}</button><button className="parent-detail-link" type="button" onClick={() => onOpen(offer)}>{say("Alle Details", "All details")}</button></div></article>;
      })}</div>}
    </main><footer className="wrap parent-footer">{say("Ihre Auswahl bleibt in diesem Tab. Kein Kinderkonto, keine Buchung auf Interest Atlas.", "Your choices stay in this tab. No child account or on-site booking.")} <a href="/organizer">{say("Angebote verwalten", "Manage activities")}</a></footer>{children}
  </div>;
}
