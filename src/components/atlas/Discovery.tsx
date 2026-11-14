"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Format, Interest, Offer, SearchFilters } from "@/shared/contracts";
import { FORMATS, INTERESTS } from "@/shared/contracts";
import { filterOffers } from "@/shared/catalog";
import { loadCatalog, type CatalogState } from "./catalog";
import { rangeFor, WHEN_LABEL, type When } from "./dates";
import { DetailSheet } from "./DetailSheet";
import { EventCard } from "./EventCard";
import { HeroCanvas } from "./HeroCanvas";
import { INTEREST_META, InterestIcon } from "./interests";
import { providerLabel } from "./format";
import { flyBetween, supportsViewTransitions, useCountUp, useScrollReveal, withTransition } from "./motion";
import "./discovery.css";

const FORMAT_LABEL: Record<Format, string> = { workshop: "Workshop", course: "Kurs", event: "Veranstaltung", "drop-in": "Offener Treff" };
const PRICE_OPTIONS = [["", "Egal"], ["0", "Kostenlos"], ["10", "bis 10 €"], ["25", "bis 25 €"]] as const;
const AGES = Array.from({ length: 11 }, (_, i) => i + 7); // 7–17: the target audience is 7+
const HEADLINE = ["Finde,", "was", "dich", "wirklich", "begeistert."];
const PROVIDERS = ["aim", "experimenta", "Haus der Familie", "IPAI"];
/** Only the first cards get their own view-transition-name; hundreds of names would be slow. */
const MAX_NAMED = 24;

/**
 * Discovery home (I2). Interest tiles + direct search + practical filters over one catalog.
 * All state stays in memory in this tab; nothing is sent to a server.
 * TODO(P3): swap local state for Palash's shared discovery/shortlist state when it lands.
 */
export function Discovery() {
  const [catalog, setCatalog] = useState<CatalogState>({ phase: "loading" });
  const [interests, setInterests] = useState<Interest[]>([]);
  const [pulse, setPulse] = useState<Interest | null>(null);
  const [query, setQuery] = useState("");
  const [when, setWhen] = useState<When>("all");
  const [age, setAge] = useState("");
  const [provider, setProvider] = useState("");
  const [price, setPrice] = useState("");
  const [format, setFormat] = useState("");
  const [stepFree, setStepFree] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [bump, setBump] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [vt, setVt] = useState(false);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  const load = useCallback(() => {
    const ctl = new AbortController();
    setCatalog({ phase: "loading" });
    loadCatalog(ctl.signal).then(setCatalog).catch(() => undefined);
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

  const offers = catalog.phase === "ready" ? catalog.offers : [];
  const providers = useMemo(() => [...new Set(offers.map(o => o.providerId))].sort(), [offers]);
  const perInterest = useMemo(() => Object.fromEntries(INTERESTS.map(i => {
    try { return [i, filterOffers(offers, { interests: [i] }).length]; } catch { return [i, 0]; }
  })) as Record<Interest, number>, [offers]);

  const filters: SearchFilters = useMemo(() => ({
    query: query.trim() || undefined,
    interests: interests.length ? interests : undefined,
    age: age ? Number(age) : undefined,
    providerId: provider || undefined,
    maxPriceEur: price ? Number(price) : undefined,
    format: (format || undefined) as Format | undefined,
    stepFreeOnly: stepFree || undefined,
    ...rangeFor(when)
  }), [query, interests, age, provider, price, format, stepFree, when]);

  const results = useMemo(() => {
    try { return filterOffers(offers, filters); } catch { return []; }
  }, [offers, filters]);
  const shownCount = useCountUp(results.length);

  const activeCount = [query.trim(), interests.length, age, provider, price, format, stepFree, when !== "all"].filter(Boolean).length;

  useEffect(() => {
    if (catalog.phase !== "ready") return;
    const t = setTimeout(() => setAnnounce(results.length === 1 ? "1 Angebot gefunden" : `${results.length} Angebote gefunden`), 500);
    return () => clearTimeout(t);
  }, [results.length, catalog.phase, filters]);

  const toggleInterest = (i: Interest) => {
    setPulse(interests.includes(i) ? null : i);
    withTransition(() => setInterests(p => (p.includes(i) ? p.filter(x => x !== i) : [...p, i])));
  };
  const toggleSave = (o: Offer, from?: HTMLElement) => {
    const adding = !saved.includes(o.id);
    setSaved(s => (adding ? [...s, o.id] : s.filter(x => x !== o.id)));
    setAnnounce(adding ? `${o.title.de} gemerkt` : `${o.title.de} von der Merkliste entfernt`);
    if (adding && from) flyBetween(from, counterRef.current, () => setBump(b => b + 1));
    else setBump(b => b + 1);
  };
  const resetAll = () => withTransition(() => {
    setInterests([]); setQuery(""); setWhen("all"); setAge(""); setProvider(""); setPrice(""); setFormat(""); setStepFree(false);
    setAnnounce("Alle Filter zurückgesetzt");
  });
  const open = offers.find(o => o.id === openId) ?? null;
  const nameFor = (id: string, idx: number) => (vt && idx < MAX_NAMED ? `offer-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}` : undefined);
  const openIdx = open ? results.findIndex(o => o.id === open.id) : -1;

  return (
    <div className="dz">
      <header className={`dz-top${scrolled ? " is-scrolled" : ""}`}>
        <div className="wrap dz-top__in">
          <a className="dz-logo" href="/"><span className="dz-logo__mark" aria-hidden="true" />Interest Atlas</a>
          <span className="dz-shortlist" aria-label={`${saved.length} gemerkt`}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.3-9.2C1.3 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.9 3.5 4.5 7.3C19.5 16.4 12 21 12 21z" fill={saved.length ? "#ff6b8a" : "none"} stroke={saved.length ? "#ff6b8a" : "currentColor"} strokeWidth="2" /></svg>
            <span ref={counterRef} key={bump} className={bump ? "dz-shortlist__n m-bump" : "dz-shortlist__n"}>{saved.length}</span>
            <span aria-hidden="true">gemerkt</span>
          </span>
        </div>
      </header>

      <main>
        <section className="dz-hero" aria-labelledby="dz-title">
          <div className="dz-hero__aurora" aria-hidden="true"><i /><i /><i /></div>
          <HeroCanvas selected={interests} />
          <div className="wrap dz-hero__in">
            <p className="eyebrow m-up" style={{ "--d": -2 } as CSSProperties}>KI · Coding · Gaming in Heilbronn</p>
            <h1 id="dz-title" className="m-words" aria-label={HEADLINE.join(" ")}>
              {HEADLINE.map((wd, n) => <span key={n} aria-hidden="true" style={{ "--w": n } as CSSProperties} className={n === 3 ? "dz-accent" : undefined}>{wd}&nbsp;</span>)}
            </h1>
            <p className="dz-lede m-up" style={{ "--d": 1 } as CSSProperties}>Workshops, Kurse und Events für alle ab 7 Jahren. Wähle, was dich interessiert, und sieh sofort, was in Heilbronn dazu passt.</p>
            <form className="dz-search m-up" style={{ "--d": 2 } as CSSProperties} role="search" onSubmit={e => { e.preventDefault(); resultsRef.current?.focus(); resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <label htmlFor="dz-q" className="visually-hidden">Angebote durchsuchen</label>
              <input id="dz-q" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Suchen, z. B. Roboter, Spiel, KI" autoComplete="off" />
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
            {INTERESTS.map((i, n) => {
              const on = interests.includes(i);
              return (
                <button key={i} type="button" aria-pressed={on} className={`dz-tile reveal${on ? " is-on" : ""}`}
                  style={{ "--a": INTEREST_META[i].a, "--b": INTEREST_META[i].b, "--d": n } as CSSProperties}
                  onClick={() => toggleInterest(i)}>
                  <span className={`dz-tile__orb${pulse === i ? " m-glow" : ""}`} onAnimationEnd={() => setPulse(null)}><InterestIcon interest={i} size={30} /></span>
                  <span className="dz-tile__label">{INTEREST_META[i].label}</span>
                  <span className="dz-tile__hint">{INTEREST_META[i].hint}</span>
                  <span className="dz-tile__count">{catalog.phase === "ready" ? `${perInterest[i]} ${perInterest[i] === 1 ? "Angebot" : "Angebote"}` : "…"}</span>
                  <span className="dz-tile__check" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 16 16"><path d="m3 8.5 3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="wrap dz-explore" aria-labelledby="dz-results-title">
          <div className="dz-controls panel reveal">
            <div className="dz-when" role="group" aria-label="Zeitraum">
              {(Object.keys(WHEN_LABEL) as When[]).map(w => (
                <button key={w} type="button" className="chip" aria-pressed={when === w} onClick={() => withTransition(() => setWhen(w))}>{WHEN_LABEL[w]}</button>
              ))}
            </div>
            <div className="dz-filters">
              <label className="dz-field"><span>Alter</span>
                <select value={age} onChange={e => { const v = e.target.value; withTransition(() => setAge(v)); }}>
                  <option value="">Egal</option>{AGES.map(a => <option key={a} value={a}>{a} Jahre</option>)}
                </select></label>
              <label className="dz-field"><span>Anbieter</span>
                <select value={provider} onChange={e => { const v = e.target.value; withTransition(() => setProvider(v)); }}>
                  <option value="">Alle</option>{providers.map(p => <option key={p} value={p}>{providerLabel(p)}</option>)}
                </select></label>
              <label className="dz-field"><span>Kosten</span>
                <select value={price} onChange={e => { const v = e.target.value; withTransition(() => setPrice(v)); }}>
                  {PRICE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></label>
              <label className="dz-field"><span>Art</span>
                <select value={format} onChange={e => { const v = e.target.value; withTransition(() => setFormat(v)); }}>
                  <option value="">Alle</option>{FORMATS.map(f => <option key={f} value={f}>{FORMAT_LABEL[f]}</option>)}
                </select></label>
              <label className="dz-check"><input type="checkbox" checked={stepFree} onChange={e => { const v = e.target.checked; withTransition(() => setStepFree(v)); }} /> Nur stufenlos</label>
              <button type="button" className="btn dz-reset" onClick={resetAll} disabled={!activeCount}>Zurücksetzen{activeCount ? ` (${activeCount})` : ""}</button>
            </div>
            {(age || price || stepFree) ? <p className="dz-hint">Angebote ohne Angabe zu Alter, Preis oder Zugang sind bei diesen Filtern ausgeblendet. Wir raten nichts.</p> : null}
          </div>

          <div className="dz-results-head">
            <h2 id="dz-results-title" ref={resultsRef} tabIndex={-1}>
              {catalog.phase === "ready"
                ? <><span className="dz-num" aria-hidden="true">{shownCount}</span><span className="visually-hidden">{results.length}</span> {results.length === 1 ? "Angebot" : "Angebote"}</>
                : "Angebote"}
            </h2>
            <CatalogStatus catalog={catalog} onRetry={load} />
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
          ) : results.length ? (
            <div className="dz-grid">
              {results.map((o, idx) => (
                <EventCard key={o.id} offer={o} index={Math.min(idx, 8)} saved={saved.includes(o.id)}
                  matches={interests.filter(i => o.interests.includes(i))}
                  vtName={o.id === openId ? undefined : nameFor(o.id, idx)}
                  onOpen={x => withTransition(() => setOpenId(x.id))} onToggleSave={toggleSave} />
              ))}
            </div>
          ) : (
            <div className="dz-empty panel m-enter">
              <div className="stack">
                <h3>Dazu gibt es gerade nichts.</h3>
                <p className="muted">{when === "today" || when === "weekend" ? `Für „${WHEN_LABEL[when]}“ ist nichts eingetragen.` : "Probiere andere Interessen oder weniger Filter."}</p>
                <div className="row">
                  {when !== "all" ? <button type="button" className="btn" onClick={() => withTransition(() => setWhen("all"))}>Alle Termine zeigen</button> : null}
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
      {open ? (
        <DetailSheet offer={open} saved={saved.includes(open.id)} onSave={() => toggleSave(open)}
          vtName={openIdx >= 0 ? nameFor(open.id, openIdx) : undefined}
          onClose={() => withTransition(() => setOpenId(null))} />
      ) : null}
    </div>
  );
}

function CatalogStatus({ catalog, onRetry }: { catalog: CatalogState; onRetry: () => void }) {
  if (catalog.phase === "loading") return <span className="status-line">Katalog wird geladen…</span>;
  if (catalog.phase === "error") return <span className="status-line" data-tone="bad">Nicht geladen <button type="button" className="dz-link" onClick={onRetry}>Neu laden</button></span>;
  if (catalog.note) return <span className="status-line" data-tone="warn">{catalog.note}</span>;
  if (catalog.mode === "demo") return <span className="status-line" data-tone="warn">Demo-Daten: erfundene Beispiele, keine echten Termine</span>;
  return <span className="status-line" data-tone="ok">Geprüfter Katalog{catalog.generatedAt ? ` · Stand ${new Date(catalog.generatedAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" })}` : ""}</span>;
}
