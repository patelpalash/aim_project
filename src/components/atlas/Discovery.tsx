"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Format, Interest, Offer, SearchFilters, Topic } from "@/shared/contracts";
import { pick } from "@/shared/i18n";
import { FORMATS } from "@/shared/contracts";
import { filterOffers, getRecommendationReasons } from "@/shared/catalog";
import { getActiveInterests, getActiveTopics } from "@/shared/taxonomy";
import { useDiscovery } from "@/shared/use-discovery";
import type { AudienceMode, DiscoverySort } from "@/shared/discovery";
import { describeCatalog, loadBundle, type BundleState } from "./catalog-data";
import { SourceStatusPanel } from "./SourceStatus";
import { WHENS, whenPatch, type When } from "./dates";
import { DetailSheet } from "./DetailSheet";
import { EventCard } from "./EventCard";
import { MapView } from "./MapView";
import { PlaySection } from "./PlaySection";
import { ShortlistSheet } from "./ShortlistSheet";
import { BrandLogo } from "../BrandLogo";
import { ParentDiscovery } from "./ParentDiscovery";
import { HeroWorld } from "./HeroWorld";
import { providerName } from "./format";
import { LanguageSwitch, useLocale } from "../i18n";
import { flyBetween, supportsViewTransitions, useCountUp, useScrollReveal, withTransition } from "./motion";
import "./discovery.css";
import { ArrowRight, BookmarkSimple, Compass, MagnifyingGlass, MapPin, SlidersHorizontal, Sparkle, Users } from "@phosphor-icons/react";
import { AtlasIcon } from "./AtlasIcon";
import { prefersReducedMotion } from "./motion";
import "./atlas-redesign.css";
import "./hero-world.css";

const SORTS: readonly DiscoverySort[] = ["recommended", "soonest", "title"];
const PRICE_OPTIONS = ["", "0", "10", "25"] as const;
const AGES = Array.from({ length: 15 }, (_, i) => i + 3);
const PROVIDERS = ["aim", "experimenta", "Haus der Familie", "IPAI"];
/** Presentation modes. Switching one only changes wording and emphasis, never the selection. */
const MODES: readonly AudienceMode[] = ["child", "teen", "parent"];
/** Only the first cards get their own view-transition-name; hundreds of names would be slow. */
const MAX_NAMED = 24;

/** Reads the active time shortcut back out of the shared filters. */
function whenOf(filters: { schedule?: string; dateFrom?: string; dateTo?: string }): When {
  if (filters.schedule === "upcoming" || !filters.schedule) return "soon";
  if (filters.dateFrom && filters.dateFrom === filters.dateTo) return "today";
  if (filters.dateFrom || filters.dateTo) return "weekend";
  return "all";
}

/**
 * Discovery home (I2/I3). Interest tiles + direct search + practical filters over the shared
 * catalog, with all session state in Palash's shared discovery reducer (P3).
 */
export function Discovery() {
  const { locale, t } = useLocale();
  const say = (de: string, en: string) => locale === "de" ? de : en;
  const [catalog, setCatalog] = useState<BundleState>({ phase: "loading" });
  const bundle = catalog.phase === "ready" ? catalog.bundle : null;
  const offers = useMemo(() => bundle?.catalog.offers ?? [], [bundle]);
  const { state, dispatch, results, selectedOffer, shortlist } = useDiscovery(offers);

  useEffect(() => { dispatch({ type: "set-filters", patch: whenPatch("all") }); }, [dispatch]);

  const [pulse, setPulse] = useState<Interest | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [shortlistTab, setShortlistTab] = useState<"list" | "parent" | null>(null);
  const [playSession, setPlaySession] = useState(0);
  const [bump, setBump] = useState(0);
  const [announce, setAnnounce] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [vt, setVt] = useState(false);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const shortlistBtnRef = useRef<HTMLButtonElement>(null);

  const localeRef = useRef(locale);
  localeRef.current = locale;
  const load = useCallback(() => {
    const ctl = new AbortController();
    setCatalog({ phase: "loading" });
    loadBundle(ctl.signal, undefined, localeRef.current).then(next => { if (!ctl.signal.aborted) setCatalog(next); }).catch(() => undefined);
    return () => ctl.abort();
  }, []);
  useEffect(() => load(), [load]);
  useEffect(() => {
    setVt(supportsViewTransitions());
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useScrollReveal(catalog.phase);

  const interests = useMemo(() => state.filters.interests ?? [], [state.filters.interests]);
  const topics = useMemo(() => state.filters.topics ?? [], [state.filters.topics]);
  const when = whenOf(state.filters);
  const mode = state.audienceMode;
  const adult = mode === "parent";

  /**
   * Themes and interests come from the loaded configuration only. Falling back to the bundled
   * seed taxonomy while loading briefly showed tiles that the organizer may have disabled or
   * renamed, so nothing is offered until the real configuration is in.
   */
  const tiles = useMemo(() => (bundle ? getActiveInterests(bundle.taxonomy) : []), [bundle]);
  const topicDefs = useMemo(() => (bundle ? getActiveTopics(bundle.taxonomy) : []), [bundle]);
  const providers = bundle?.providers ?? [];
  /**
   * Counts on the tiles and topic chips are counted inside the time window that is actually in
   * effect, so the number matches what the list shows after clicking. Counting against no filters
   * at all made them promise more offers than the page then displayed.
   */
  const timeWindow = useMemo(() => ({
    schedule: state.filters.schedule, dateFrom: state.filters.dateFrom, dateTo: state.filters.dateTo, audience: state.filters.audience
  }), [state.filters.schedule, state.filters.dateFrom, state.filters.dateTo, state.filters.audience]);
  const perTopic = useMemo(() => Object.fromEntries(topicDefs.map(t => {
    try { return [t.id, filterOffers(offers, { ...timeWindow, topics: [t.id] }).length]; } catch { return [t.id, 0]; }
  })) as Record<string, number>, [offers, topicDefs, timeWindow]);
  const perInterest = useMemo(() => Object.fromEntries(tiles.map(t => {
    try { return [t.id, filterOffers(offers, { ...timeWindow, interests: [t.id] }).length]; } catch { return [t.id, 0]; }
  })) as Record<string, number>, [offers, tiles, timeWindow]);
  const reasonsFor = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!bundle) return map;
    for (const rec of results.recommendations) {
      try { map.set(rec.offer.id, getRecommendationReasons(rec, bundle.taxonomy, locale)); } catch { /* reasons stay empty */ }
    }
    return map;
  }, [results.recommendations, bundle, locale]);

  const query = state.filters.query ?? "";
  const shownCount = useCountUp(results.total);
  const activeCount = [query.trim(), interests.length, topics.length, state.filters.age !== undefined, state.filters.providerId,
    state.filters.maxPriceEur !== undefined, state.filters.format, state.filters.stepFreeOnly, when !== "all", state.filters.audience !== "family"].filter(Boolean).length;

  useEffect(() => {
    if (catalog.phase !== "ready") return;
    const timer = setTimeout(() => setAnnounce(results.total === 1 ? t("offers.foundOne") : t("offers.found", { n: results.total })), 500);
    return () => clearTimeout(timer);
  }, [results.total, catalog.phase, t]);

  const patch = (p: Partial<SearchFilters>) => withTransition(() => dispatch({ type: "set-filters", patch: p }));
  const browseEvents = () => document.getElementById("atlas-events")?.scrollIntoView({ behavior: prefersReducedMotion() ? "instant" : "smooth", block: "start" });
  const toggleInterest = (i: Interest) => {
    setPulse(interests.includes(i) ? null : i);
    withTransition(() => dispatch({ type: "toggle-interest", id: i }));
  };
  const toggleTopic = (id: Topic) => {
    const next = topics.includes(id) ? topics.filter(t => t !== id) : [...topics, id];
    withTransition(() => dispatch({ type: "set-filters", patch: { topics: next.length ? next : undefined } }));
  };
  /**
   * Presentation switch (child/teen/adult). It dispatches only `set-audience-mode`, so interests,
   * topics, filters, the shortlist and quiz answers all stay exactly as they were.
   */
  const setMode = (next: AudienceMode) => {
    dispatch({ type: "set-audience-mode", mode: next });
    setAnnounce(t("say.mode", { mode: t(`mode.${next}`) }));
  };
  const toggleSave = (o: Offer, from?: HTMLElement) => {
    const adding = !state.savedOfferIds.includes(o.id);
    dispatch({ type: "toggle-saved", id: o.id });
    setAnnounce(t(adding ? "say.saved" : "say.unsaved", { title: pick(o.title, locale) }));
    if (adding && from) flyBetween(from, counterRef.current, () => setBump(b => b + 1));
    else setBump(b => b + 1);
  };
  /**
   * Clears the filters only. The shortlist, the presentation mode and the quiz answers are
   * separate choices with their own controls, so a filter reset no longer throws them away.
   */
  const resetAll = () => withTransition(() => {
    dispatch({ type: "clear-filters" });
    dispatch({ type: "set-filters", patch: whenPatch("all") });
    setAnnounce(t("say.filtersReset"));
  });
  const resetSession = () => withTransition(() => {
    dispatch({ type: "reset" });
    dispatch({ type: "set-filters", patch: whenPatch("all") });
    setShortlistTab(null); setPulse(null); setView("list"); setBump(0);
    setPlaySession(value => value + 1);
    setAnnounce(t("say.sessionReset"));
  });
  const savedCount = shortlist.offers.length + shortlist.unavailableIds.length;
  const nameFor = (id: string, idx: number) => (vt && idx < MAX_NAMED ? `offer-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}` : undefined);
  // Keep reviewed activities prominent; explicit date/title sorts still retain their exact order.
  const displayOffers = state.sort === "recommended" ? [...results.matches].sort((a, b) => Number(a.source.kind === "demo") - Number(b.source.kind === "demo")) : results.matches;

  const dialogs = (<>
      {selectedOffer ? (
        <DetailSheet key={selectedOffer.id} offer={selectedOffer} allowGame={!adult} provider={providerName(selectedOffer.providerId, providers)}
          saved={state.savedOfferIds.includes(selectedOffer.id)} onSave={() => toggleSave(selectedOffer)}
          focusFallback={resultsRef}
          onShowAdult={adult ? undefined : () => {
            if (!state.savedOfferIds.includes(selectedOffer.id)) dispatch({ type: "toggle-saved", id: selectedOffer.id });
            dispatch({ type: "set-audience-mode", mode: "parent" });
            dispatch({ type: "select-offer", id: null });
            setShortlistTab("parent");
          }}
          onClose={() => dispatch({ type: "select-offer", id: null })} />
      ) : null}
      {shortlistTab && !selectedOffer ? (
        <ShortlistSheet offers={shortlist.offers} unavailableCount={shortlist.unavailableIds.length}
          providers={providers} initialTab={shortlistTab === "list" && adult ? "parent" : shortlistTab}
          focusFallback={shortlistBtnRef}
          onOpenOffer={o => { setShortlistTab(null); dispatch({ type: "select-offer", id: o.id }); }}
          onRemove={o => toggleSave(o)}
          onClose={() => setShortlistTab(null)} />
      ) : null}
  </>);
  if (adult) return <ParentDiscovery offers={results.matches} providers={providers} filters={state.filters} when={when} savedIds={state.savedOfferIds} catalog={catalog} onPatch={p => dispatch({ type: "set-filters", patch: p })} onBack={() => setMode("child")} onOpen={o => dispatch({ type: "select-offer", id: o.id })} onSave={toggleSave} onShortlist={() => setShortlistTab("parent")} onReset={resetAll} onRetry={load} resultsRef={resultsRef}>{dialogs}</ParentDiscovery>;

  return (
    <div className="dz atlas-world" data-audience={mode}>
      <a className="skip-link" href="#dz-results-title">{t("dz.skip")}</a>
      <header className={`dz-top${scrolled ? " is-scrolled" : ""}`}>
        <div className="wrap dz-top__in">
          <BrandLogo />
          <nav className="atlas-nav" aria-label={say("Hauptnavigation", "Main navigation")}>
            <a className="is-active" href="#atlas-events" onClick={e => { e.preventDefault(); browseEvents(); }}>{say("Entdecken", "Discover")}</a>
            <button type="button" onClick={() => setMode("parent")}><Users size={19} />{say("Für Eltern", "For parents")}</button>
            <a href="/organizer">{say("Verwaltung", "Admin")}</a>
          </nav>
          <LanguageSwitch />
          <button ref={shortlistBtnRef} type="button" className="dz-shortlist" aria-label={t("dz.shortlistOpen", { n: savedCount })} onClick={() => setShortlistTab("list")}>
            <BookmarkSimple size={21} weight={savedCount ? "fill" : "regular"} />
            <span className="saved-word">{say("Merkliste", "Saved")}</span><span ref={counterRef} key={bump} className={bump ? "dz-shortlist__n m-bump" : "dz-shortlist__n"}>{savedCount}</span>
          </button>
        </div>
      </header>
      <div className="mobile-shortcuts"><button type="button" onClick={() => setMode("parent")}>{say("Für Eltern & Familien", "For parents & families")}</button><a href="/organizer">{say("Verwaltung", "Admin")}</a></div>

      <main>
        <section className="atlas-hero wrap" aria-labelledby="dz-title">
          <div className="atlas-hero__copy">
            <p className="atlas-eyebrow"><MapPin size={16} weight="fill" />{say("KLEINE IDEEN. ECHTE ABENTEUER.", "LITTLE IDEAS. REAL ADVENTURES.")}</p>
            <h1 id="dz-title">{adult ? say("Gemeinsam Neues", "Discover something") : say("Dein nächstes", "Your next")}<br /><em>{adult ? say("entdecken.", "new together.") : say("Abenteuer.", "adventure.")}</em></h1>
            <p>{say("Roboter bauen, Spiele erfinden, KI verstehen. Finde Kurse und Events in Heilbronn, die dich neugierig machen.", "Build robots, invent games, understand AI. Find courses and events in Heilbronn that spark your curiosity.")}</p>
            <form className="atlas-search" role="search" onSubmit={e => { e.preventDefault(); resultsRef.current?.focus(); resultsRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "instant" : "smooth", block: "start" }); }}>
              <MagnifyingGlass size={23} aria-hidden="true" /><label className="visually-hidden" htmlFor="dz-q">{t("dz.searchLabel")}</label>
              <input id="dz-q" type="search" value={query} onChange={e => dispatch({ type: "set-filters", patch: { query: e.target.value || undefined } })} placeholder={say("Was möchtest du entdecken?", "What would you like to discover?")} autoComplete="off" />
              <button className="btn btn--primary" type="submit">{t("dz.searchSubmit")}<ArrowRight size={18} /></button>
            </form>
            <a className="atlas-browse" href="#atlas-events" onClick={e => { e.preventDefault(); browseEvents(); }}>{say("Direkt zu allen Angeboten", "Browse all activities")}<ArrowRight size={17} /></a>
          </div>
          <HeroWorld topics={topicDefs} selected={topics} counts={perTopic} matchCount={results.total} loading={catalog.phase === "loading"} onChoose={toggleTopic} onBrowse={browseEvents} />
        </section>
        <div className="atlas-sources wrap"><span>{say("VIELE ORTE. EINE ENTDECKUNGSREISE.", "MANY PLACES. ONE ADVENTURE.")}</span><ul aria-label={t("dz.providers")}>{PROVIDERS.map(p => <li key={p}>{p}</li>)}</ul><span>{say("Ohne Konto. Einfach loslegen.", "No account. Just explore.")}</span></div>

        <section className="wrap atlas-interest-section" aria-labelledby="dz-board-title">
          <div className="atlas-interest-heading"><h2 id="dz-board-title">{say("Worauf hast du Lust?", "What sounds like you?")}</h2><p>{say("Wähle ein Interesse. Oder entdecke einfach alles.", "Pick an interest. Or explore everything.")}</p></div>
          <div className="atlas-interests" role="group" aria-labelledby="dz-board-title">
            {tiles.map(tile => <button key={tile.id} type="button" className="atlas-interest" aria-pressed={interests.includes(tile.id)} onClick={() => toggleInterest(tile.id)}><AtlasIcon interest={tile.id} size={24} /><span>{pick(tile.label, locale)}</span><small>{perInterest[tile.id] ?? 0}</small></button>)}
            {catalog.phase === "loading" ? <p className="muted">{t("dz.interestsLoading")}</p> : null}
            {interests.length ? <button type="button" className="dz-link" onClick={() => patch({ interests: undefined })}>{say("Alle Interessen", "All interests")}</button> : null}
          </div>
        </section>

        <section id="atlas-events" className="wrap dz-explore" aria-labelledby="dz-results-title">
          <div className="atlas-collection-heading"><div><p className="atlas-eyebrow">{say("DEINE STADT KANN MEHR", "THERE’S MORE TO YOUR CITY")}</p><h2>{say("Was möchtest du als Nächstes erleben?", "What will you try next?")}</h2></div><div className="dz-view dz-mode" role="group" aria-label={t("dz.presentation")}>{MODES.map(m => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{t(`mode.${m}`)}</button>)}</div></div>
          <div className="dz-controls panel">
            <div className="atlas-filter-top"><span className="atlas-filter-label"><SlidersHorizontal size={19} />{say("Deine Auswahl", "Your selection")}</span><div className="dz-when" role="group" aria-label={t("filters.when")}>
              {WHENS.map(w => (
                <button key={w} type="button" className="chip" aria-pressed={when === w} onClick={() => patch(whenPatch(w))}>{t(`when.${w}`)}</button>
              ))}
            </div>
            </div>
            <div className="atlas-topic-filters" role="group" aria-label={say("Themen filtern", "Filter by topic")}>
              {topicDefs.map(topic => <button type="button" key={topic.id} className="chip" aria-pressed={topics.includes(topic.id)} onClick={() => toggleTopic(topic.id)}>{pick(topic.label, locale)}<small>{perTopic[topic.id] ?? 0}</small></button>)}
            </div>
            <details className="atlas-more-filters"><summary>{say("Alter, Anbieter, Kosten & mehr", "Age, provider, cost & more")}{activeCount ? ` (${activeCount})` : ""}</summary>
            <div className="dz-filters">
              <label className="dz-field"><span>{say("Zielgruppe", "Who is it for?")}</span>
                <select value={state.filters.audience ?? ""} onChange={e => patch({ audience: (e.target.value || undefined) as SearchFilters["audience"] })}>
                  <option value="family">{say("Kinder & Familien", "Children & families")}</option><option value="">{say("Alle Zielgruppen", "Everyone")}</option><option value="parent">{say("Nur Elternangebote", "Parent activities")}</option><option value="school">{say("Nur Schulgruppen", "School groups")}</option>
                </select></label>
              <label className="dz-field"><span>{t("filters.age")}</span>
                <select value={state.filters.age ?? ""} onChange={e => { const v = e.target.value; patch({ age: v ? Number(v) : undefined }); }}>
                  <option value="">{t("filters.any")}</option>{AGES.map(a => <option key={a} value={a}>{t("filters.years", { n: a })}</option>)}
                </select></label>
              <label className="dz-field"><span>{t("filters.provider")}</span>
                <select value={state.filters.providerId ?? ""} onChange={e => { const v = e.target.value; patch({ providerId: v || undefined }); }}>
                  <option value="">{t("filters.all")}</option>{providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></label>
              <label className="dz-field"><span>{t("filters.price")}</span>
                <select value={state.filters.maxPriceEur ?? ""} onChange={e => { const v = e.target.value; patch({ maxPriceEur: v ? Number(v) : undefined }); }}>
                  {PRICE_OPTIONS.map(v => (
                    <option key={v} value={v}>{v === "" ? t("filters.any") : v === "0" ? t("filters.free") : t("filters.upTo", { n: v })}</option>
                  ))}
                </select></label>
              <label className="dz-field"><span>{t("filters.format")}</span>
                <select value={state.filters.format ?? ""} onChange={e => { const v = e.target.value; patch({ format: (v || undefined) as Format | undefined }); }}>
                  <option value="">{t("filters.all")}</option>{FORMATS.map(f => <option key={f} value={f}>{t(`format.${f}`)}</option>)}
                </select></label>
              <label className="dz-field"><span>{t("filters.sort")}</span>
                <select value={state.sort} onChange={e => { const v = e.target.value as DiscoverySort; withTransition(() => dispatch({ type: "set-sort", sort: v })); }}>
                  {SORTS.map(srt => <option key={srt} value={srt}>{t(`sort.${srt}`)}</option>)}
                </select></label>
              <label className="dz-check"><input type="checkbox" checked={state.filters.stepFreeOnly ?? false} onChange={e => { const v = e.target.checked; patch({ stepFreeOnly: v || undefined }); }} /> {t("filters.stepFree")}</label>
              <button type="button" className="btn dz-reset" onClick={resetAll} disabled={!activeCount}>{t("filters.reset")}{activeCount ? ` (${activeCount})` : ""}</button>
            </div>
            </details>
            {(state.filters.age !== undefined || state.filters.maxPriceEur !== undefined || state.filters.stepFreeOnly) ? <p className="dz-hint">{t("filters.hint")}</p> : null}
          </div>

          <div className="dz-results-head">
            <h2 id="dz-results-title" ref={resultsRef} tabIndex={-1}>
              {catalog.phase === "ready"
                ? <><span className="dz-num" aria-hidden="true">{shownCount}</span><span className="visually-hidden">{results.total}</span> {t(results.total === 1 ? "offers.one" : "offers.many", { n: "" }).trim()}</>
                : t("offers.word")}
            </h2>
            <div className="dz-results-head__side">
              <div className="dz-view" role="group" aria-label={t("view.label")}>
                <button type="button" aria-pressed={view === "list"} onClick={() => withTransition(() => setView("list"))}>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  {t("view.list")}
                </button>
                <button type="button" aria-pressed={view === "map"} onClick={() => withTransition(() => setView("map"))}>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
                  {t("view.map")}
                </button>
              </div>
              <CatalogStatus catalog={catalog} onRetry={load} />
            </div>
          </div>

          {catalog.phase === "ready" && catalog.bundle.catalog.sourceStatuses?.length ? (
            <SourceStatusPanel statuses={catalog.bundle.catalog.sourceStatuses}
              cache={catalog.bundle.catalog.cache ?? null} providers={providers} />
          ) : null}

          {catalog.phase === "loading" ? (
            <div className="dz-grid" aria-busy="true" aria-label={t("catalog.loadingOffers")}>
              {[0, 1, 2, 3].map(n => <div key={n} className="dz-skel" />)}
            </div>
          ) : catalog.phase === "error" ? (
            <div className="dz-empty panel">
              <p><strong>{catalog.message}</strong> {t("catalog.errorTail")}</p>
              <button type="button" className="btn btn--primary" onClick={load}>{t("catalog.reload")}</button>
            </div>
          ) : view === "map" ? (
            <MapView offers={results.matches} providerNameOf={id => providerName(id, providers)}
              onOpen={o => dispatch({ type: "select-offer", id: o.id })} />
          ) : results.matches.length ? (
            <div className="dz-grid">
              {displayOffers.map((o, idx) => (
                <EventCard key={o.id} offer={o} index={Math.min(idx, 8)} saved={state.savedOfferIds.includes(o.id)}
                  provider={providerName(o.providerId, providers)}
                  matches={interests.filter(i => o.interests.includes(i))}
                  reasons={reasonsFor.get(o.id) ?? []} adult={adult}
                  vtName={o.id === state.selectedOfferId ? undefined : nameFor(o.id, idx)}
                  onOpen={x => dispatch({ type: "select-offer", id: x.id })} onToggleSave={toggleSave} />
              ))}
            </div>
          ) : (
            <div className="dz-empty panel m-enter">
              <div className="stack">
                <h3>{t("empty.title")}</h3>
                <p className="muted">{when === "today" || when === "weekend" ? t("empty.when", { when: t(`when.${when}`) }) : t("empty.other")}</p>
                <div className="row">
                  {when !== "all" ? <button type="button" className="btn" onClick={() => patch(whenPatch("all"))}>{t("empty.showAll")}</button> : null}
                  <button type="button" className="btn btn--primary" onClick={resetAll}>{t("empty.resetFilters")}</button>
                </div>
              </div>
            </div>
          )}
        </section>
        <details className="wrap atlas-play-more"><summary><Sparkle size={23} weight="duotone" /><span>{say("Noch keine Idee? Finde heraus, was dir Spaß macht.", "Not sure yet? Find out what you enjoy.")}</span><ArrowRight size={20} /></summary>
        {adult ? (
          <section className="wrap play" aria-label={t("play.sectionLabel")}>
            <p className="status-line">{t("play.adultNote")}</p>
          </section>
        ) : (
        <PlaySection key={playSession} taxonomy={bundle?.taxonomy ?? null} quizAnswers={state.quizAnswers}
          completedPuzzleIds={state.completedPuzzleIds} selectedInterests={interests}
          onAnswer={(questionId, choiceId) => dispatch({ type: "set-quiz-answer", questionId, choiceId })}
          onPuzzleDone={id => dispatch({ type: "complete-puzzle", id })}
          onResetPlay={() => dispatch({ type: "reset-play" })}
          onApplyInterests={ids => {
            withTransition(() => { for (const id of ids) if (!interests.includes(id)) dispatch({ type: "toggle-interest", id }); });
            setAnnounce(t(ids.length === 1 ? "say.interestApplied" : "say.interestsApplied"));
            resultsRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "instant" : "smooth", block: "start" });
          }} />
        )}

        </details>
      </main>

      <footer className="wrap dz-foot reveal">
        <p>{t("foot.sources")}</p>
        <p>{t("foot.privacy")}</p>
        <p><button type="button" className="btn" onClick={resetSession}>{t("foot.resetSession")}</button></p>
        <p><a href="/organizer">{t("foot.organizerLink")}</a>{t("foot.organizerRest")}</p>
      </footer>

      <p className="visually-hidden" role="status" aria-live="polite">{announce}</p>
      {dialogs}
    </div>
  );
}

function CatalogStatus({ catalog, onRetry }: { catalog: BundleState; onRetry: () => void }) {
  const { locale, t } = useLocale();
  if (catalog.phase === "loading") return <span className="status-line">{t("catalog.loading")}</span>;
  if (catalog.phase === "error") return <span className="status-line" data-tone="bad">{t("catalog.notLoaded")} <button type="button" className="dz-link" onClick={onRetry}>{t("catalog.reload")}</button></span>;
  if (catalog.note) return <span className="status-line" data-tone="warn">{catalog.note}</span>;
  const status = describeCatalog(catalog.bundle.catalog.offers, locale);
  return <span className="status-line" data-tone={status.tone}>{status.text}</span>;
}
