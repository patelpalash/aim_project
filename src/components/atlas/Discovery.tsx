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
import { interestMeta, InterestIcon } from "./interests";
import { providerName } from "./format";
import { LanguageSwitch, useLocale } from "../i18n";
import { flyBetween, supportsViewTransitions, useCountUp, useScrollReveal, withTransition } from "./motion";
import "./discovery.css";

const SORTS: readonly DiscoverySort[] = ["recommended", "soonest", "title"];
const PRICE_OPTIONS = ["", "0", "10", "25"] as const;
const AGES = Array.from({ length: 11 }, (_, i) => i + 7); // 7–17: the target audience is 7+
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
  const [catalog, setCatalog] = useState<BundleState>({ phase: "loading" });
  const bundle = catalog.phase === "ready" ? catalog.bundle : null;
  const offers = useMemo(() => bundle?.catalog.offers ?? [], [bundle]);
  const { state, dispatch, results, selectedOffer, shortlist } = useDiscovery(offers);

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

  const load = useCallback(() => {
    const ctl = new AbortController();
    setCatalog({ phase: "loading" });
    loadBundle(ctl.signal, undefined, locale).then(setCatalog).catch(() => undefined);
    return () => ctl.abort();
  }, [locale]);
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
    schedule: state.filters.schedule, dateFrom: state.filters.dateFrom, dateTo: state.filters.dateTo
  }), [state.filters.schedule, state.filters.dateFrom, state.filters.dateTo]);
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
    state.filters.maxPriceEur !== undefined, state.filters.format, state.filters.stepFreeOnly, when !== "soon"].filter(Boolean).length;

  useEffect(() => {
    if (catalog.phase !== "ready") return;
    const timer = setTimeout(() => setAnnounce(results.total === 1 ? t("offers.foundOne") : t("offers.found", { n: results.total })), 500);
    return () => clearTimeout(timer);
  }, [results.total, catalog.phase, t]);

  const patch = (p: Partial<SearchFilters>) => withTransition(() => dispatch({ type: "set-filters", patch: p }));
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
  const setMode = (next: AudienceMode) => withTransition(() => {
    dispatch({ type: "set-audience-mode", mode: next });
    setAnnounce(t("say.mode", { mode: t(`mode.${next}`) }));
  });
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
    setAnnounce(t("say.filtersReset"));
  });
  const resetSession = () => withTransition(() => {
    dispatch({ type: "reset" });
    setShortlistTab(null); setPulse(null); setView("list"); setBump(0);
    setPlaySession(value => value + 1);
    setAnnounce(t("say.sessionReset"));
  });
  const savedCount = shortlist.offers.length + shortlist.unavailableIds.length;
  const nameFor = (id: string, idx: number) => (vt && idx < MAX_NAMED ? `offer-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}` : undefined);
  const openIdx = selectedOffer ? results.matches.findIndex(o => o.id === selectedOffer.id) : -1;

  return (
    <div className="dz">
      <a className="skip-link" href="#dz-results-title">{t("dz.skip")}</a>
      <header className={`dz-top${scrolled ? " is-scrolled" : ""}`}>
        <div className="wrap dz-top__in">
          <a className="dz-logo" href="/"><span className="dz-logo__mark" aria-hidden="true" />Interest Atlas</a>
          <div className="dz-view dz-mode" role="group" aria-label={t("dz.presentation")}>
            {MODES.map(m => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{t(`mode.${m}`)}</button>
            ))}
          </div>
          <LanguageSwitch />
          <button ref={shortlistBtnRef} type="button" className="dz-shortlist" aria-label={t("dz.shortlistOpen", { n: savedCount })}
            onClick={() => withTransition(() => setShortlistTab("list"))}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.3-9.2C1.3 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.9 3.5 4.5 7.3C19.5 16.4 12 21 12 21z" fill={savedCount ? "#ff6b8a" : "none"} stroke={savedCount ? "#ff6b8a" : "currentColor"} strokeWidth="2" /></svg>
            <span ref={counterRef} key={bump} className={bump ? "dz-shortlist__n m-bump" : "dz-shortlist__n"}>{savedCount}</span>
            <span aria-hidden="true">{t("dz.saved")}</span>
          </button>
        </div>
      </header>

      <main>
        <section className="dz-hero" aria-labelledby="dz-title">
          <div className="wrap dz-hero__in">
            <p className="eyebrow m-up" style={{ "--d": -2 } as CSSProperties}>{t(`copy.${mode}.eyebrow`)}</p>
            {adult ? (
              <h1 id="dz-title" className="m-words">{t("dz.titleAdult")}</h1>
            ) : (
              <h1 id="dz-title" className="m-words" aria-label={t("dz.titleAria")}>
                <span aria-hidden="true" style={{ "--w": 0 } as CSSProperties}>{t("dz.titlePre")}&nbsp;</span>
                <span className="dz-rot" aria-hidden="true" style={{ "--w": 1 } as CSSProperties}>
                  {/* The last word repeats the first so the rotation loops without a jump. */}
                  <span className="dz-rot__list">{([1, 2, 3, 1] as const).map((w, n) => <span key={n}>{t(`dz.rot.${w}`)}</span>)}</span>
                </span>
                <span aria-hidden="true" style={{ "--w": 2 } as CSSProperties}>{t("dz.titlePost")}</span>
              </h1>
            )}
            <p className="dz-lede m-up" style={{ "--d": 1 } as CSSProperties}>{t(`copy.${mode}.lede`)}</p>
            <form className="dz-search m-up" style={{ "--d": 2 } as CSSProperties} role="search" onSubmit={e => { e.preventDefault(); resultsRef.current?.focus(); resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <label htmlFor="dz-q" className="visually-hidden">{t("dz.searchLabel")}</label>
              <input id="dz-q" type="search" value={query} onChange={e => patch({ query: e.target.value || undefined })} placeholder={t("dz.searchPlaceholder")} autoComplete="off" />
              <button type="submit" className="btn btn--primary">{t("dz.searchSubmit")}</button>
            </form>
            <ul className="dz-providers m-up" style={{ "--d": 3 } as CSSProperties} aria-label={t("dz.providers")}>
              {PROVIDERS.map(p => <li key={p}>{p}</li>)}
            </ul>
          </div>
        </section>

        <section className="wrap dz-topics" aria-labelledby="dz-topics-title">
          <div className="dz-board__head reveal">
            <h2 id="dz-topics-title">{t(adult ? "dz.topicsTitleAdult" : "dz.topicsTitle")}</h2>
            <p className="muted">
              {catalog.phase !== "ready"
                ? t("dz.topicsLoading")
                : topics.length
                  ? t("dz.topicsChosen", { n: topics.length, m: topicDefs.length })
                  : t("dz.topicsHint")}
            </p>
          </div>
          <div className="dz-topic-row reveal" role="group" aria-labelledby="dz-topics-title">
            {topicDefs.map(topic => (
              <button key={topic.id} type="button" className="chip chip--topic" aria-pressed={topics.includes(topic.id)} onClick={() => toggleTopic(topic.id)}>
                {pick(topic.label, locale)}
                <span className="chip__n">{catalog.phase === "ready" ? perTopic[topic.id] : "…"}</span>
              </button>
            ))}
            {topics.length ? (
              <button type="button" className="dz-link" onClick={() => withTransition(() => dispatch({ type: "set-filters", patch: { topics: undefined } }))}>
                {t("dz.topicsReset")}
              </button>
            ) : null}
          </div>
        </section>

        <section className="wrap dz-board" aria-labelledby="dz-board-title">
          <div className="dz-board__head reveal">
            <h2 id="dz-board-title">{t(adult ? "dz.boardTitleAdult" : "dz.boardTitle")}</h2>
            <p className="muted">{catalog.phase !== "ready" ? t("dz.interestsLoading") : interests.length ? t("dz.interestsChosen", { n: interests.length }) : t(`copy.${mode}.board`)}</p>
          </div>
          <div className="dz-tiles" role="group" aria-labelledby="dz-board-title">
            {tiles.map((tile, n) => {
              const meta = interestMeta(tile.id, pick(tile.label, locale), t);
              const on = interests.includes(tile.id);
              return (
                <button key={tile.id} type="button" aria-pressed={on} className={`dz-tile reveal${on ? " is-on" : ""}`}
                  style={{ "--a": meta.a, "--b": meta.b, "--d": n } as CSSProperties}
                  onClick={() => toggleInterest(tile.id)}>
                  <span className={`dz-tile__orb${pulse === tile.id ? " m-glow" : ""}`} onAnimationEnd={() => setPulse(null)}><InterestIcon interest={tile.id} size={30} /></span>
                  <span className="dz-tile__label">{meta.label}</span>
                  <span className="dz-tile__hint">{meta.hint}</span>
                  <span className="dz-tile__count">{catalog.phase === "ready" ? t(perInterest[tile.id] === 1 ? "offers.one" : "offers.many", { n: perInterest[tile.id] ?? 0 }) : "…"}</span>
                  <span className="dz-tile__check" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 16 16"><path d="m3 8.5 3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                </button>
              );
            })}
          </div>
        </section>

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
            resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }} />
        )}

        <section className="wrap dz-explore" aria-labelledby="dz-results-title">
          <div className="dz-controls panel reveal">
            <div className="dz-when" role="group" aria-label={t("filters.when")}>
              {WHENS.map(w => (
                <button key={w} type="button" className="chip" aria-pressed={when === w} onClick={() => patch(whenPatch(w))}>{t(`when.${w}`)}</button>
              ))}
            </div>
            <div className="dz-filters">
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
              onOpen={o => withTransition(() => dispatch({ type: "select-offer", id: o.id }))} />
          ) : results.matches.length ? (
            <div className="dz-grid">
              {results.matches.map((o, idx) => (
                <EventCard key={o.id} offer={o} index={Math.min(idx, 8)} saved={state.savedOfferIds.includes(o.id)}
                  provider={providerName(o.providerId, providers)}
                  matches={interests.filter(i => o.interests.includes(i))}
                  reasons={reasonsFor.get(o.id) ?? []} adult={adult}
                  vtName={o.id === state.selectedOfferId ? undefined : nameFor(o.id, idx)}
                  onOpen={x => withTransition(() => dispatch({ type: "select-offer", id: x.id }))} onToggleSave={toggleSave} />
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
      </main>

      <footer className="wrap dz-foot reveal">
        <p>{t("foot.sources")}</p>
        <p>{t("foot.privacy")}</p>
        <p><button type="button" className="btn" onClick={resetSession}>{t("foot.resetSession")}</button></p>
        <p><a href="/organizer">{t("foot.organizerLink")}</a>{t("foot.organizerRest")}</p>
      </footer>

      <p className="visually-hidden" role="status" aria-live="polite">{announce}</p>
      {selectedOffer ? (
        <DetailSheet offer={selectedOffer} provider={providerName(selectedOffer.providerId, providers)}
          saved={state.savedOfferIds.includes(selectedOffer.id)} onSave={() => toggleSave(selectedOffer)}
          vtName={openIdx >= 0 ? nameFor(selectedOffer.id, openIdx) : undefined}
          focusFallback={resultsRef}
          onShowAdult={adult ? undefined : () => withTransition(() => {
            if (!state.savedOfferIds.includes(selectedOffer.id)) dispatch({ type: "toggle-saved", id: selectedOffer.id });
            dispatch({ type: "set-audience-mode", mode: "parent" });
            dispatch({ type: "select-offer", id: null });
            setShortlistTab("parent");
          })}
          onClose={() => withTransition(() => dispatch({ type: "select-offer", id: null }))} />
      ) : null}
      {shortlistTab && !selectedOffer ? (
        <ShortlistSheet offers={shortlist.offers} unavailableCount={shortlist.unavailableIds.length}
          providers={providers} initialTab={shortlistTab === "list" && adult ? "parent" : shortlistTab}
          focusFallback={shortlistBtnRef}
          onOpenOffer={o => withTransition(() => { setShortlistTab(null); dispatch({ type: "select-offer", id: o.id }); })}
          onRemove={o => toggleSave(o)}
          onClose={() => withTransition(() => setShortlistTab(null))} />
      ) : null}
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
