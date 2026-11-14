"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Format, Interest, Offer, SearchFilters } from "@/shared/contracts";
import { FORMATS } from "@/shared/contracts";
import { filterOffers, getRecommendationReasons } from "@/shared/catalog";
import { getActiveInterests } from "@/shared/taxonomy";
import { useDiscovery } from "@/shared/use-discovery";
import type { DiscoverySort } from "@/shared/discovery";
import { loadBundle, type BundleState } from "./catalog-data";
import { WHEN_LABEL, whenPatch, type When } from "./dates";
import { DetailSheet } from "./DetailSheet";
import { EventCard } from "./EventCard";
import { MapView } from "./MapView";
import { PlaySection } from "./PlaySection";
import { ShortlistSheet } from "./ShortlistSheet";
import { interestMeta, InterestIcon } from "./interests";
import { providerName } from "./format";
import { flyBetween, supportsViewTransitions, useCountUp, useScrollReveal, withTransition } from "./motion";
import "./discovery.css";

const FORMAT_LABEL: Record<Format, string> = { workshop: "Workshop", course: "Kurs", event: "Veranstaltung", "drop-in": "Offener Treff" };
const SORT_LABEL: Record<DiscoverySort, string> = { recommended: "Empfohlen", soonest: "Nächster Termin", title: "Titel A–Z" };
const PRICE_OPTIONS = [["", "Egal"], ["0", "Kostenlos"], ["10", "bis 10 €"], ["25", "bis 25 €"]] as const;
const AGES = Array.from({ length: 11 }, (_, i) => i + 7); // 7–17: the target audience is 7+
/** The last word repeats the first so the rotation loops without a jump. */
const ROTATING = ["Bauen", "Entdecken", "Erfinden", "Bauen"];
const PROVIDERS = ["aim", "experimenta", "Haus der Familie", "IPAI"];
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
  const [catalog, setCatalog] = useState<BundleState>({ phase: "loading" });
  const bundle = catalog.phase === "ready" ? catalog.bundle : null;
  const offers = useMemo(() => bundle?.catalog.offers ?? [], [bundle]);
  const { state, dispatch, results, selectedOffer, shortlist } = useDiscovery(offers);

  const [pulse, setPulse] = useState<Interest | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [shortlistTab, setShortlistTab] = useState<"list" | "parent" | null>(null);
  const [bump, setBump] = useState(0);
  const [announce, setAnnounce] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [vt, setVt] = useState(false);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  const load = useCallback(() => {
    const ctl = new AbortController();
    setCatalog({ phase: "loading" });
    loadBundle(ctl.signal).then(setCatalog).catch(() => undefined);
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
  const when = whenOf(state.filters);
  const tiles = useMemo(() => getActiveInterests(bundle?.taxonomy), [bundle]);
  const providers = bundle?.providers ?? [];
  const perInterest = useMemo(() => Object.fromEntries(tiles.map(t => {
    try { return [t.id, filterOffers(offers, { interests: [t.id] }).length]; } catch { return [t.id, 0]; }
  })) as Record<string, number>, [offers, tiles]);
  const reasonsFor = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!bundle) return map;
    for (const rec of results.recommendations) {
      try { map.set(rec.offer.id, getRecommendationReasons(rec, bundle.taxonomy, "de")); } catch { /* reasons stay empty */ }
    }
    return map;
  }, [results.recommendations, bundle]);

  const query = state.filters.query ?? "";
  const shownCount = useCountUp(results.total);
  const activeCount = [query.trim(), interests.length, state.filters.age !== undefined, state.filters.providerId,
    state.filters.maxPriceEur !== undefined, state.filters.format, state.filters.stepFreeOnly, when !== "soon"].filter(Boolean).length;

  useEffect(() => {
    if (catalog.phase !== "ready") return;
    const t = setTimeout(() => setAnnounce(results.total === 1 ? "1 Angebot gefunden" : `${results.total} Angebote gefunden`), 500);
    return () => clearTimeout(t);
  }, [results.total, catalog.phase]);

  const patch = (p: Partial<SearchFilters>) => withTransition(() => dispatch({ type: "set-filters", patch: p }));
  const toggleInterest = (i: Interest) => {
    setPulse(interests.includes(i) ? null : i);
    withTransition(() => dispatch({ type: "toggle-interest", id: i }));
  };
  const toggleSave = (o: Offer, from?: HTMLElement) => {
    const adding = !state.savedOfferIds.includes(o.id);
    dispatch({ type: "toggle-saved", id: o.id });
    setAnnounce(adding ? `${o.title.de} gemerkt` : `${o.title.de} von der Merkliste entfernt`);
    if (adding && from) flyBetween(from, counterRef.current, () => setBump(b => b + 1));
    else setBump(b => b + 1);
  };
  const resetAll = () => withTransition(() => {
    dispatch({ type: "reset" });
    setAnnounce("Alle Filter zurückgesetzt");
  });
  const savedCount = shortlist.offers.length + shortlist.unavailableIds.length;
  const nameFor = (id: string, idx: number) => (vt && idx < MAX_NAMED ? `offer-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}` : undefined);
  const openIdx = selectedOffer ? results.matches.findIndex(o => o.id === selectedOffer.id) : -1;

  return (
    <div className="dz">
      <header className={`dz-top${scrolled ? " is-scrolled" : ""}`}>
        <div className="wrap dz-top__in">
          <a className="dz-logo" href="/"><span className="dz-logo__mark" aria-hidden="true" />Interest Atlas</a>
          <button type="button" className="dz-shortlist" aria-label={`Merkliste öffnen, ${savedCount} gemerkt`}
            onClick={() => withTransition(() => setShortlistTab("list"))}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.3-9.2C1.3 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.9 3.5 4.5 7.3C19.5 16.4 12 21 12 21z" fill={savedCount ? "#ff6b8a" : "none"} stroke={savedCount ? "#ff6b8a" : "currentColor"} strokeWidth="2" /></svg>
            <span ref={counterRef} key={bump} className={bump ? "dz-shortlist__n m-bump" : "dz-shortlist__n"}>{savedCount}</span>
            <span aria-hidden="true">gemerkt</span>
          </button>
        </div>
      </header>

      <main>
        <section className="dz-hero" aria-labelledby="dz-title">
          <div className="wrap dz-hero__in">
            <p className="eyebrow m-up" style={{ "--d": -2 } as CSSProperties}>KI · Coding · Gaming in Heilbronn</p>
            <h1 id="dz-title" className="m-words" aria-label="Finde etwas zum Bauen, Entdecken und Erfinden in Heilbronn.">
              <span aria-hidden="true" style={{ "--w": 0 } as CSSProperties}>Finde etwas zum&nbsp;</span>
              <span className="dz-rot" aria-hidden="true" style={{ "--w": 1 } as CSSProperties}>
                <span className="dz-rot__list">{ROTATING.map((wd, n) => <span key={n}>{wd}</span>)}</span>
              </span>
              <span aria-hidden="true" style={{ "--w": 2 } as CSSProperties}>&nbsp;in Heilbronn.</span>
            </h1>
            <p className="dz-lede m-up" style={{ "--d": 1 } as CSSProperties}>Workshops, Kurse und Events für alle ab 7 Jahren. Wähle, was dich interessiert, und sieh sofort, was in Heilbronn dazu passt.</p>
            <form className="dz-search m-up" style={{ "--d": 2 } as CSSProperties} role="search" onSubmit={e => { e.preventDefault(); resultsRef.current?.focus(); resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <label htmlFor="dz-q" className="visually-hidden">Angebote durchsuchen</label>
              <input id="dz-q" type="search" value={query} onChange={e => patch({ query: e.target.value || undefined })} placeholder="Suchen, z. B. Roboter, Spiel, KI" autoComplete="off" />
              <button type="submit" className="btn btn--primary">Suchen</button>
            </form>
            <ul className="dz-providers m-up" style={{ "--d": 3 } as CSSProperties} aria-label="Anbieter">
              {PROVIDERS.map(p => <li key={p}>{p}</li>)}
            </ul>
          </div>
        </section>

        <section className="wrap dz-board" aria-labelledby="dz-board-title">
          <div className="dz-board__head reveal">
            <h2 id="dz-board-title">Was interessiert dich?</h2>
            <p className="muted">{interests.length ? `${interests.length} gewählt. Die Sternkarte oben leuchtet mit.` : "Wähle beliebig viele. Oder keins, und stöbere einfach."}</p>
          </div>
          <div className="dz-tiles" role="group" aria-labelledby="dz-board-title">
            {tiles.map((t, n) => {
              const meta = interestMeta(t.id, t.label.de);
              const on = interests.includes(t.id);
              return (
                <button key={t.id} type="button" aria-pressed={on} className={`dz-tile reveal${on ? " is-on" : ""}`}
                  style={{ "--a": meta.a, "--b": meta.b, "--d": n } as CSSProperties}
                  onClick={() => toggleInterest(t.id)}>
                  <span className={`dz-tile__orb${pulse === t.id ? " m-glow" : ""}`} onAnimationEnd={() => setPulse(null)}><InterestIcon interest={t.id} size={30} /></span>
                  <span className="dz-tile__label">{meta.label}</span>
                  <span className="dz-tile__hint">{meta.hint}</span>
                  <span className="dz-tile__count">{catalog.phase === "ready" ? `${perInterest[t.id]} ${perInterest[t.id] === 1 ? "Angebot" : "Angebote"}` : "…"}</span>
                  <span className="dz-tile__check" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 16 16"><path d="m3 8.5 3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                </button>
              );
            })}
          </div>
        </section>

        <PlaySection taxonomy={bundle?.taxonomy ?? null} quizAnswers={state.quizAnswers}
          completedPuzzleIds={state.completedPuzzleIds} selectedInterests={interests}
          onAnswer={(questionId, choiceId) => dispatch({ type: "set-quiz-answer", questionId, choiceId })}
          onPuzzleDone={id => dispatch({ type: "complete-puzzle", id })}
          onApplyInterests={ids => {
            withTransition(() => { for (const id of ids) if (!interests.includes(id)) dispatch({ type: "toggle-interest", id }); });
            setAnnounce(`${ids.length === 1 ? "Interesse" : "Interessen"} übernommen`);
            resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }} />

        <section className="wrap dz-explore" aria-labelledby="dz-results-title">
          <div className="dz-controls panel reveal">
            <div className="dz-when" role="group" aria-label="Zeitraum">
              {(Object.keys(WHEN_LABEL) as When[]).map(w => (
                <button key={w} type="button" className="chip" aria-pressed={when === w} onClick={() => patch(whenPatch(w))}>{WHEN_LABEL[w]}</button>
              ))}
            </div>
            <div className="dz-filters">
              <label className="dz-field"><span>Alter</span>
                <select value={state.filters.age ?? ""} onChange={e => { const v = e.target.value; patch({ age: v ? Number(v) : undefined }); }}>
                  <option value="">Egal</option>{AGES.map(a => <option key={a} value={a}>{a} Jahre</option>)}
                </select></label>
              <label className="dz-field"><span>Anbieter</span>
                <select value={state.filters.providerId ?? ""} onChange={e => { const v = e.target.value; patch({ providerId: v || undefined }); }}>
                  <option value="">Alle</option>{providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></label>
              <label className="dz-field"><span>Kosten</span>
                <select value={state.filters.maxPriceEur ?? ""} onChange={e => { const v = e.target.value; patch({ maxPriceEur: v ? Number(v) : undefined }); }}>
                  {PRICE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></label>
              <label className="dz-field"><span>Art</span>
                <select value={state.filters.format ?? ""} onChange={e => { const v = e.target.value; patch({ format: (v || undefined) as Format | undefined }); }}>
                  <option value="">Alle</option>{FORMATS.map(f => <option key={f} value={f}>{FORMAT_LABEL[f]}</option>)}
                </select></label>
              <label className="dz-field"><span>Sortierung</span>
                <select value={state.sort} onChange={e => { const v = e.target.value as DiscoverySort; withTransition(() => dispatch({ type: "set-sort", sort: v })); }}>
                  {(Object.keys(SORT_LABEL) as DiscoverySort[]).map(srt => <option key={srt} value={srt}>{SORT_LABEL[srt]}</option>)}
                </select></label>
              <label className="dz-check"><input type="checkbox" checked={state.filters.stepFreeOnly ?? false} onChange={e => { const v = e.target.checked; patch({ stepFreeOnly: v || undefined }); }} /> Nur stufenlos</label>
              <button type="button" className="btn dz-reset" onClick={resetAll} disabled={!activeCount}>Zurücksetzen{activeCount ? ` (${activeCount})` : ""}</button>
            </div>
            {(state.filters.age !== undefined || state.filters.maxPriceEur !== undefined || state.filters.stepFreeOnly) ? <p className="dz-hint">Angebote ohne Angabe zu Alter, Preis oder Zugang sind bei diesen Filtern ausgeblendet. Wir raten nichts.</p> : null}
          </div>

          <div className="dz-results-head">
            <h2 id="dz-results-title" ref={resultsRef} tabIndex={-1}>
              {catalog.phase === "ready"
                ? <><span className="dz-num" aria-hidden="true">{shownCount}</span><span className="visually-hidden">{results.total}</span> {results.total === 1 ? "Angebot" : "Angebote"}</>
                : "Angebote"}
            </h2>
            <div className="dz-results-head__side">
              <div className="dz-view" role="group" aria-label="Ansicht">
                <button type="button" aria-pressed={view === "list"} onClick={() => withTransition(() => setView("list"))}>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  Liste
                </button>
                <button type="button" aria-pressed={view === "map"} onClick={() => withTransition(() => setView("map"))}>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
                  Karte
                </button>
              </div>
              <CatalogStatus catalog={catalog} onRetry={load} />
            </div>
          </div>

          {catalog.phase === "loading" ? (
            <div className="dz-grid" aria-busy="true" aria-label="Angebote werden geladen">
              {[0, 1, 2, 3].map(n => <div key={n} className="dz-skel" />)}
            </div>
          ) : catalog.phase === "error" ? (
            <div className="dz-empty panel">
              <p><strong>{catalog.message}</strong> Prüfe die Verbindung und versuche es noch einmal.</p>
              <button type="button" className="btn btn--primary" onClick={load}>Neu laden</button>
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
                  reasons={reasonsFor.get(o.id) ?? []}
                  vtName={o.id === state.selectedOfferId ? undefined : nameFor(o.id, idx)}
                  onOpen={x => withTransition(() => dispatch({ type: "select-offer", id: x.id }))} onToggleSave={toggleSave} />
              ))}
            </div>
          ) : (
            <div className="dz-empty panel m-enter">
              <div className="stack">
                <h3>Dazu gibt es gerade nichts.</h3>
                <p className="muted">{when === "today" || when === "weekend" ? `Für „${WHEN_LABEL[when]}“ ist nichts eingetragen.` : "Probiere andere Interessen oder weniger Filter."}</p>
                <div className="row">
                  {when !== "all" ? <button type="button" className="btn" onClick={() => patch(whenPatch("all"))}>Alle Termine zeigen</button> : null}
                  <button type="button" className="btn btn--primary" onClick={resetAll}>Alles zurücksetzen</button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="wrap dz-foot reveal">
        <p>Interest Atlas zeigt Angebote von aim, experimenta, Haus der Familie und IPAI. Anmeldung immer direkt beim Anbieter.</p>
        <p>Deine Auswahl bleibt nur in diesem Tab. Kein Konto, keine Namen, nichts wird gesendet.</p>
      </footer>

      <p className="visually-hidden" role="status" aria-live="polite">{announce}</p>
      {selectedOffer ? (
        <DetailSheet offer={selectedOffer} provider={providerName(selectedOffer.providerId, providers)}
          saved={state.savedOfferIds.includes(selectedOffer.id)} onSave={() => toggleSave(selectedOffer)}
          vtName={openIdx >= 0 ? nameFor(selectedOffer.id, openIdx) : undefined}
          onShowAdult={() => withTransition(() => {
            if (!state.savedOfferIds.includes(selectedOffer.id)) dispatch({ type: "toggle-saved", id: selectedOffer.id });
            dispatch({ type: "set-audience-mode", mode: "parent" });
            dispatch({ type: "select-offer", id: null });
            setShortlistTab("parent");
          })}
          onClose={() => withTransition(() => dispatch({ type: "select-offer", id: null }))} />
      ) : null}
      {shortlistTab && !selectedOffer ? (
        <ShortlistSheet offers={shortlist.offers} unavailableCount={shortlist.unavailableIds.length}
          providers={providers} initialTab={shortlistTab}
          onOpenOffer={o => withTransition(() => { setShortlistTab(null); dispatch({ type: "select-offer", id: o.id }); })}
          onRemove={o => toggleSave(o)}
          onClose={() => withTransition(() => setShortlistTab(null))} />
      ) : null}
    </div>
  );
}

function CatalogStatus({ catalog, onRetry }: { catalog: BundleState; onRetry: () => void }) {
  if (catalog.phase === "loading") return <span className="status-line">Katalog wird geladen…</span>;
  if (catalog.phase === "error") return <span className="status-line" data-tone="bad">Nicht geladen <button type="button" className="dz-link" onClick={onRetry}>Neu laden</button></span>;
  if (catalog.note) return <span className="status-line" data-tone="warn">{catalog.note}</span>;
  if (catalog.bundle.catalog.mode === "demo") return <span className="status-line" data-tone="warn">Demo-Daten: erfundene Beispiele, keine echten Termine</span>;
  const at = catalog.bundle.catalog.generatedAt;
  return <span className="status-line" data-tone="ok">Geprüfter Katalog{at ? ` · Stand ${new Date(at).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" })}` : ""}</span>;
}
