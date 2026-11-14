"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Format, Interest, Offer, SearchFilters } from "@/shared/contracts";
import { FORMATS, INTERESTS } from "@/shared/contracts";
import { filterOffers } from "@/shared/catalog";
import { loadCatalog, type CatalogState } from "./catalog";
import { rangeFor, WHEN_LABEL, type When } from "./dates";
import { DetailSheet } from "./DetailSheet";
import { EventCard } from "./EventCard";
import { INTEREST_META, InterestIcon } from "./interests";
import { PaperBird } from "./PaperBird";
import { providerLabel } from "./format";
import "./discovery.css";

const FORMAT_LABEL: Record<Format, string> = { workshop: "Workshop", course: "Kurs", event: "Veranstaltung", "drop-in": "Offener Treff" };
const PRICE_OPTIONS = [["", "Egal"], ["0", "Kostenlos"], ["10", "bis 10 €"], ["25", "bis 25 €"]] as const;
const AGES = Array.from({ length: 11 }, (_, i) => i + 7); // 7–17: Ishan's target audience is 7+

/**
 * I2: discovery home. Sticker board + direct search + practical filters over one catalog.
 * All state stays in memory in this tab; nothing is sent to a server.
 * TODO(P3): swap local state for Palash's shared discovery/shortlist state when it lands.
 */
export function Discovery() {
  const [catalog, setCatalog] = useState<CatalogState>({ phase: "loading" });
  const [interests, setInterests] = useState<Interest[]>([]);
  const [justPicked, setJustPicked] = useState<Interest | null>(null);
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
  const resultsRef = useRef<HTMLHeadingElement>(null);

  const load = useCallback(() => {
    const ctl = new AbortController();
    setCatalog({ phase: "loading" });
    loadCatalog(ctl.signal).then(setCatalog).catch(() => undefined);
    return () => ctl.abort();
  }, []);
  useEffect(() => load(), [load]);

  const offers = catalog.phase === "ready" ? catalog.offers : [];
  const providers = useMemo(() => [...new Set(offers.map(o => o.providerId))].sort(), [offers]);

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

  const activeCount = [query.trim(), interests.length, age, provider, price, format, stepFree, when !== "all"].filter(Boolean).length;
  const resultKey = JSON.stringify(filters);

  useEffect(() => {
    if (catalog.phase !== "ready") return;
    const t = setTimeout(() => setAnnounce(results.length === 1 ? "1 Angebot gefunden" : `${results.length} Angebote gefunden`), 400);
    return () => clearTimeout(t);
  }, [results.length, catalog.phase, resultKey]);

  const toggleInterest = (i: Interest) => {
    setInterests(p => (p.includes(i) ? p.filter(x => x !== i) : [...p, i]));
    setJustPicked(i);
  };
  const toggleSave = (o: Offer) => {
    setSaved(s => (s.includes(o.id) ? s.filter(x => x !== o.id) : [...s, o.id]));
    setAnnounce(saved.includes(o.id) ? `${o.title.de} von der Merkliste entfernt` : `${o.title.de} gemerkt`);
    setBump(b => b + 1);
  };
  const resetAll = () => {
    setInterests([]); setQuery(""); setWhen("all"); setAge(""); setProvider(""); setPrice(""); setFormat(""); setStepFree(false);
    setAnnounce("Alle Filter zurückgesetzt");
  };
  const open = offers.find(o => o.id === openId) ?? null;

  return (
    <div className="dz">
      <header className="dz-top">
        <div className="wrap dz-top__in">
          <a className="dz-logo" href="/"><span className="dz-logo__mark" aria-hidden="true" />Interest Atlas</a>
          <span className="dz-shortlist" aria-label={`${saved.length} gemerkt`}>
            <span key={bump} className={bump ? "dz-shortlist__n m-bump" : "dz-shortlist__n"}>{saved.length}</span>
            <span aria-hidden="true">gemerkt</span>
          </span>
        </div>
      </header>

      <main>
        <section className="wrap dz-hero" aria-labelledby="dz-title">
          <div className="dz-hero__text">
            <span className="eyebrow">KI · Coding · Gaming in Heilbronn</span>
            <h1 id="dz-title">Was willst du ausprobieren?</h1>
            <p className="dz-lede">Klebe dir Sticker für alles, was dich interessiert. Darunter erscheinen passende Kurse und Workshops von aim, experimenta, Haus der Familie und IPAI.</p>
            <form className="dz-search" role="search" onSubmit={e => { e.preventDefault(); resultsRef.current?.focus(); }}>
              <label htmlFor="dz-q" className="visually-hidden">Angebote durchsuchen</label>
              <input id="dz-q" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Suchen, z. B. Roboter oder Spiel" autoComplete="off" />
              <button type="submit" className="btn btn--primary m-press">Suchen</button>
            </form>
          </div>
          <div className="dz-hero__bird" aria-hidden="true"><PaperBird size={110} /></div>
        </section>

        <section className="wrap dz-board" aria-labelledby="dz-board-title">
          <div className="dz-board__head">
            <h2 id="dz-board-title">Deine Sticker</h2>
            <p className="muted">{interests.length ? `${interests.length} gewählt` : "Wähle beliebig viele, oder keinen und stöbere einfach."}</p>
          </div>
          <div className="dz-board__stickers" role="group" aria-labelledby="dz-board-title">
            {INTERESTS.map(i => (
              <button key={i} type="button" aria-pressed={interests.includes(i)}
                className={`interest m-press${justPicked === i ? " m-stick" : ""}`}
                onAnimationEnd={() => setJustPicked(null)}
                style={{ ["--c" as string]: INTEREST_META[i].color, ["--shape-radius" as string]: INTEREST_META[i].radius }}
                onClick={() => toggleInterest(i)}>
                <span className="interest__check" aria-hidden="true">✓</span>
                <span className="interest__shape"><InterestIcon interest={i} /></span>
                {INTEREST_META[i].label}
              </button>
            ))}
          </div>
        </section>

        <section className="wrap dz-explore" aria-labelledby="dz-results-title">
          <div className="dz-when" role="group" aria-label="Zeitraum">
            {(Object.keys(WHEN_LABEL) as When[]).map(w => (
              <button key={w} type="button" className="chip" aria-pressed={when === w} onClick={() => setWhen(w)}>{WHEN_LABEL[w]}</button>
            ))}
          </div>

          <div className="dz-filters">
            <label className="dz-field"><span>Alter</span>
              <select value={age} onChange={e => setAge(e.target.value)}>
                <option value="">Egal</option>{AGES.map(a => <option key={a} value={a}>{a} Jahre</option>)}
              </select></label>
            <label className="dz-field"><span>Anbieter</span>
              <select value={provider} onChange={e => setProvider(e.target.value)}>
                <option value="">Alle</option>{providers.map(p => <option key={p} value={p}>{providerLabel(p)}</option>)}
              </select></label>
            <label className="dz-field"><span>Kosten</span>
              <select value={price} onChange={e => setPrice(e.target.value)}>
                {PRICE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></label>
            <label className="dz-field"><span>Art</span>
              <select value={format} onChange={e => setFormat(e.target.value)}>
                <option value="">Alle</option>{FORMATS.map(f => <option key={f} value={f}>{FORMAT_LABEL[f]}</option>)}
              </select></label>
            <label className="dz-check"><input type="checkbox" checked={stepFree} onChange={e => setStepFree(e.target.checked)} /> Nur stufenlos</label>
            <button type="button" className="btn btn--quiet dz-reset" onClick={resetAll} disabled={!activeCount}>Alles zurücksetzen</button>
          </div>
          {(age || price || stepFree) ? <p className="dz-hint">Angebote ohne Angabe zu Alter, Preis oder Zugang werden bei diesen Filtern ausgeblendet, weil wir nichts raten.</p> : null}

          <div className="dz-results-head">
            <h2 id="dz-results-title" ref={resultsRef} tabIndex={-1}>
              {catalog.phase === "ready" ? `${results.length} ${results.length === 1 ? "Angebot" : "Angebote"}` : "Angebote"}
            </h2>
            <CatalogStatus catalog={catalog} onRetry={load} />
          </div>

          {catalog.phase === "loading" ? (
            <div className="dz-grid" aria-busy="true" aria-label="Angebote werden geladen">
              {[0, 1, 2].map(n => <div key={n} className="dz-skel" />)}
            </div>
          ) : catalog.phase === "error" ? (
            <div className="dz-empty sticker">
              <p><strong>{catalog.message}</strong> Prüfe die Verbindung und versuche es noch einmal.</p>
              <button type="button" className="btn btn--primary m-press" onClick={load}>Neu laden</button>
            </div>
          ) : results.length ? (
            <div className="dz-grid" key={resultKey}>
              {results.map((o, idx) => (
                <EventCard key={o.id} offer={o} index={idx} saved={saved.includes(o.id)}
                  matches={interests.filter(i => o.interests.includes(i))}
                  onOpen={x => setOpenId(x.id)} onToggleSave={toggleSave} />
              ))}
            </div>
          ) : (
            <div className="dz-empty sticker m-enter">
              <PaperBird size={64} idle={false} />
              <div className="stack">
                <p><strong>Dazu gibt es gerade nichts.</strong> {when === "today" || when === "weekend" ? `Für „${WHEN_LABEL[when]}“ ist nichts eingetragen.` : "Probiere andere Sticker oder weniger Filter."}</p>
                <div className="row">
                  {when !== "all" ? <button type="button" className="btn m-press" onClick={() => setWhen("all")}>Alle Termine zeigen</button> : null}
                  <button type="button" className="btn btn--primary m-press" onClick={resetAll}>Alles zurücksetzen</button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <p className="visually-hidden" role="status" aria-live="polite">{announce}</p>
      {open ? <DetailSheet offer={open} saved={saved.includes(open.id)} onSave={() => toggleSave(open)} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

function CatalogStatus({ catalog, onRetry }: { catalog: CatalogState; onRetry: () => void }) {
  if (catalog.phase === "loading") return <span className="status-line">Katalog wird geladen…</span>;
  if (catalog.phase === "error") return <span className="status-line" data-tone="bad">✕ Nicht geladen <button type="button" className="dz-link" onClick={onRetry}>Neu laden</button></span>;
  if (catalog.note) return <span className="status-line" data-tone="warn">⚠ {catalog.note}</span>;
  if (catalog.mode === "demo") return <span className="status-line" data-tone="warn">Demo-Daten: erfundene Beispiele, keine echten Termine</span>;
  return <span className="status-line" data-tone="ok">✓ Geprüfter Katalog{catalog.generatedAt ? ` · Stand ${new Date(catalog.generatedAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" })}` : ""}</span>;
}
