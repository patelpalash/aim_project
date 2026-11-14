"use client";

import { useEffect, useRef, useState } from "react";
import type { Interest, Offer } from "@/shared/contracts";
import { INTERESTS } from "@/shared/contracts";
import fixtures from "../../../data/demo-offers.json";
import { EventCard } from "./EventCard";
import { INTEREST_META, InterestIcon } from "./interests";
import { PaperBird } from "./PaperBird";
import { formatAge, formatPrice, formatWhen, providerLabel } from "./format";
import "./styleguide.css";

const offers = fixtures as Offer[];

const SWATCHES = [
  ["Tinte", "--ink", "Text, Konturen, Schatten"], ["Papier", "--paper", "Hintergrund mit Raster"],
  ["Blau", "--blue", "Roboter · Aktionen"], ["Gelb", "--yellow", "Kunst · Hervorhebung"],
  ["Rot", "--red", "Spiele bauen"], ["Grün", "--green", "Rätsel · Erfolg"], ["Violett", "--violet", "Geschichten"]
] as const;

const MOTIONS = [
  { name: "Interesse wählen", cls: "m-stick", target: "180 ms Feder", reduced: "Sofortiger Zustand" },
  { name: "Ergebnis erscheint", cls: "m-enter", target: "260 ms, 40 ms versetzt", reduced: "Kurzes Einblenden" },
  { name: "Merken", cls: "m-pop", target: "220 ms Pop + Flug", reduced: "Text- und Symbolwechsel" },
  { name: "Falsche Antwort", cls: "m-wobble", target: "300 ms Wackeln", reduced: "Erklärtext" },
  { name: "Quiz-Schritt", cls: "m-step", target: "220 ms Gleiten", reduced: "Inhalt wechselt, Fokus folgt" }
] as const;

export function StyleGuide() {
  const [picked, setPicked] = useState<Interest[]>(["robots"]);
  const [justPicked, setJustPicked] = useState<Interest | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [bump, setBump] = useState(0);
  const [open, setOpen] = useState<Offer | null>(null);
  const [replay, setReplay] = useState<Record<string, number>>({});
  const [announce, setAnnounce] = useState("");

  const toggleInterest = (i: Interest) => {
    setPicked(p => (p.includes(i) ? p.filter(x => x !== i) : [...p, i]));
    setJustPicked(i);
  };
  const toggleSave = (o: Offer) => {
    setSaved(s => {
      const has = s.includes(o.id);
      setAnnounce(has ? `${o.title.de} von der Merkliste entfernt` : `${o.title.de} gemerkt`);
      return has ? s.filter(x => x !== o.id) : [...s, o.id];
    });
    setBump(b => b + 1);
  };
  const shown = offers.filter(o => !picked.length || o.interests.some(i => picked.includes(i))).slice(0, 4);

  return (
    <main className="sg">
      <header className="sg-hero wrap">
        <div className="sg-hero__text stack">
          <span className="eyebrow">Interest Atlas · Gestaltung (I1)</span>
          <h1>Die Werkbank</h1>
          <p className="sg-lede">Ein Bastelplatz auf Karopapier: kräftige Sticker in Grundfarben, klare Schrift und Bewegungen, die wie ein aufgeklebter Sticker leicht nachfedern. Für Kinder ab 7, Jugendliche und Eltern.</p>
        </div>
        <div className="sg-hero__bird"><PaperBird size={120} /><p className="sg-bubble">Ich bin der Papiervogel. Ich gebe Tipps, aber nur, wenn du mich fragst.</p></div>
      </header>

      <section className="wrap sg-sec" aria-labelledby="s-color">
        <h2 id="s-color">Farben</h2>
        <p className="muted">Jedes Interesse hat eine Farbe <strong>und</strong> ein Symbol <strong>und</strong> einen Namen. Farbe allein trägt nie Bedeutung.</p>
        <div className="sg-swatches">
          {SWATCHES.map(([n, v, use]) => (
            <div key={v} className="sg-swatch"><span style={{ background: `var(${v})` }} /><b>{n}</b><small>{use}</small></div>
          ))}
        </div>
      </section>

      <section className="wrap sg-sec" aria-labelledby="s-type">
        <h2 id="s-type">Schrift</h2>
        <div className="sg-type sticker">
          <p style={{ font: "600 var(--text-3xl)/1 var(--font-display)" }}>Fredoka · Überschrift</p>
          <p style={{ font: "600 var(--text-xl)/1.2 var(--font-display)" }}>Roboter bauen am Samstag</p>
          <p>Atkinson Hyperlegible ist für gute Lesbarkeit gemacht. Sie unterscheidet I, l und 1 klar und funktioniert auch bei großer Schrift. Größen sind in rem, damit die Browser-Schriftgröße alles mitskaliert.</p>
          <p className="eyebrow">Kleine Beschriftung · 13 px · gesperrt</p>
        </div>
      </section>

      <section className="wrap sg-sec" aria-labelledby="s-interest">
        <h2 id="s-interest">Interessen-Sticker</h2>
        <p className="muted">Antippen oder mit Tab + Leertaste wählen. Die Ergebnisse darunter ändern sich wirklich.</p>
        <div className="sg-interests" role="group" aria-label="Interessen">
          {INTERESTS.map(i => (
            <button key={i} type="button" aria-pressed={picked.includes(i)}
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

      <section className="wrap sg-sec" aria-labelledby="s-cards">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 id="s-cards">Event-Sticker</h2>
          <span className="sg-shortlist">
            <span key={bump} className={bump ? "m-bump sg-shortlist__n" : "sg-shortlist__n"}>{saved.length}</span> gemerkt
          </span>
        </div>
        <p className="muted">Ganze Karte öffnet die Details als Seitenblatt (auf dem Handy von unten). Das Herz merkt sich das Angebot nur für diese Sitzung.</p>
        <div className="sg-cards" key={picked.join(",")}>
          {shown.map((o, idx) => (
            <EventCard key={o.id} offer={o} index={idx} saved={saved.includes(o.id)} onOpen={setOpen} onToggleSave={toggleSave} />
          ))}
          {!shown.length ? <p className="status-line">Keine passenden Angebote. Wähle ein anderes Interesse.</p> : null}
        </div>
        <div className="row">
          <span className="status-line" data-tone="ok">✓ Katalog geladen · 8 Demo-Angebote</span>
          <span className="status-line" data-tone="warn">⏱ Zwischengespeichert · Stand 14.11., 14:05</span>
          <span className="status-line" data-tone="bad">✕ experimenta konnte nicht aktualisiert werden</span>
        </div>
      </section>

      <section className="wrap sg-sec" aria-labelledby="s-ctl">
        <h2 id="s-ctl">Knöpfe, Filter, Hinweise</h2>
        <div className="row">
          <button type="button" className="btn btn--primary m-press">Angebote zeigen</button>
          <button type="button" className="btn btn--sun m-press">Rätsel starten</button>
          <button type="button" className="btn m-press">Erwachsenen zeigen</button>
          <button type="button" className="btn" disabled>Anmelden (Demo)</button>
        </div>
        <div className="row" role="group" aria-label="Zeitraum">
          {["Heute", "Dieses Wochenende", "Demnächst"].map((t, n) => (
            <button key={t} type="button" className="chip" aria-pressed={n === 1}>{t}</button>
          ))}
        </div>
        <div className="row">
          <span className="tag tag--demo">Demo</span><span className="tag tag--verified">Geprüft · Quelle</span>
          <span className="tag tag--full">Ausgebucht</span><span className="tag tag--unknown">Preis unbekannt</span>
          <span className="tag tag--stale">Veraltet</span>
        </div>
      </section>

      <section className="wrap sg-sec" aria-labelledby="s-motion">
        <h2 id="s-motion">Bewegung</h2>
        <p className="muted">Feder-Bewegung mit leichtem Nachschwingen. Bei „Bewegung reduzieren“ bleiben nur Zustandswechsel und kurze Überblendungen.</p>
        <div className="sg-motion">
          {MOTIONS.map(m => (
            <div key={m.cls} className="sg-motion__row sticker">
              <span key={replay[m.cls] ?? 0} className={`sg-motion__demo ${replay[m.cls] ? m.cls : ""}`} aria-hidden="true" />
              <div><b>{m.name}</b><small>{m.target} · reduziert: {m.reduced}</small></div>
              <button type="button" className="btn btn--quiet" onClick={() => setReplay(r => ({ ...r, [m.cls]: (r[m.cls] ?? 0) + 1 }))}>Abspielen</button>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap sg-sec" aria-labelledby="s-puzzle">
        <h2 id="s-puzzle">Rätsel: Roboter-Pfad</h2>
        <p className="muted">Befehle ordnen, ausführen, jeder Schritt leuchtet auf. Umsortieren per Pfeil-Knöpfen statt Ziehen. Vorschau des Layouts, die Logik kommt von Palash (P4).</p>
        <RobotPreview />
      </section>

      <section className="wrap sg-sec" aria-labelledby="s-parent">
        <h2 id="s-parent">Elternansicht: Vergleich</h2>
        <p className="muted">Ruhiger, ohne Sticker-Schatten. Praktische Fakten zuerst, Unbekanntes bleibt sichtbar unbekannt.</p>
        <div className="sg-compare-wrap">
          <table className="sg-compare">
            <thead><tr><th scope="col">Angebot</th>{offers.slice(0, 3).map(o => <th key={o.id} scope="col">{o.title.de.replace("Demo: ", "")}</th>)}</tr></thead>
            <tbody>
              <tr><th scope="row">Wann</th>{offers.slice(0, 3).map(o => <td key={o.id}>{formatWhen(o)}</td>)}</tr>
              <tr><th scope="row">Alter</th>{offers.slice(0, 3).map(o => <td key={o.id}>{formatAge(o)}</td>)}</tr>
              <tr><th scope="row">Kosten</th>{offers.slice(0, 3).map(o => <td key={o.id} className={o.priceEur === null ? "unk" : ""}>{formatPrice(o)}</td>)}</tr>
              <tr><th scope="row">Anbieter</th>{offers.slice(0, 3).map(o => <td key={o.id}>{providerLabel(o.providerId)}</td>)}</tr>
              <tr><th scope="row">Anmeldung</th>{offers.slice(0, 3).map(o => <td key={o.id}>{o.source.kind === "demo" ? "Demo, keine Anmeldung" : "Beim Anbieter"}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="wrap sg-sec" aria-labelledby="s-desk">
        <h2 id="s-desk">Pflege-Pult (Organisator)</h2>
        <p className="muted">Neutrales Werkzeug: dicht, sachlich, gleiche Schrift. Blockierte Zeilen bleiben sichtbar und unveröffentlicht.</p>
        <div className="sg-desk">
          <div className="sg-desk__bar"><b>CSV-Prüfung</b><span>18 bereit · 2 blockiert</span><button type="button" className="btn btn--quiet" disabled>Ausgewählte gültige Zeilen veröffentlichen (0)</button></div>
          <table className="sg-desk__table">
            <thead><tr><th scope="col">Status</th><th scope="col">Titel</th><th scope="col">Datum</th><th scope="col">Hinweis</th></tr></thead>
            <tbody>
              <tr><td><span className="tag tag--verified">bereit</span></td><td>Demo: Robotik-Nachmittag</td><td>21.11.</td><td>—</td></tr>
              <tr><td><span className="tag tag--full">blockiert</span></td><td>Demo: Kunst mit KI</td><td className="unk">fehlt</td><td>Datum fehlt: bitte ergänzen</td></tr>
              <tr><td><span className="tag tag--verified">bereit</span></td><td>Demo: Game Jam</td><td>05.12.</td><td>—</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <p className="visually-hidden" role="status" aria-live="polite">{announce}</p>
      {open ? <DetailSheet offer={open} saved={saved.includes(open.id)} onSave={() => toggleSave(open)} onClose={() => setOpen(null)} /> : null}
    </main>
  );
}

function DetailSheet({ offer, saved, onSave, onClose }: { offer: Offer; saved: boolean; onSave: () => void; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus(); };
  }, [onClose]);
  const lead = offer.interests[0];
  return (
    <>
      <div className="sheet-scrim m-scrim" onClick={onClose} aria-hidden="true" />
      <div className="sheet m-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"
        style={{ ["--c" as string]: lead ? INTEREST_META[lead].color : "var(--blue)" }}>
        <div className="sheet__head">
          <button ref={closeRef} type="button" className="btn icon-btn" onClick={onClose} aria-label="Zurück zur Liste">←</button>
          <span className="tag tag--demo">Demo-Angebot</span>
        </div>
        <div className="sheet__body">
          <h2 id="sheet-title" style={{ fontSize: "var(--text-xl)" }}>{offer.title.de}</h2>
          <p>{offer.summary.de}</p>
          <dl className="facts">
            <dt>Wann</dt><dd>{formatWhen(offer)}</dd>
            <dt>Alter</dt><dd>{formatAge(offer)}</dd>
            <dt>Kosten</dt><dd>{formatPrice(offer)}</dd>
            <dt>Ort</dt><dd>{offer.venue.name}, {offer.venue.city}</dd>
            <dt>Anbieter</dt><dd>{providerLabel(offer.providerId)}</dd>
            <dt>Quelle</dt><dd>Erfundenes Beispiel, keine echte Veranstaltung</dd>
          </dl>
        </div>
        <div className="sheet__foot">
          <button type="button" className="btn m-press" aria-pressed={saved} onClick={onSave}>{saved ? "♥ Gemerkt" : "♡ Merken"}</button>
          <button type="button" className="btn btn--primary m-press">Erwachsenen zeigen</button>
        </div>
      </div>
    </>
  );
}

const CMDS = ["→", "→", "↓", "→"] as const;
function RobotPreview() {
  const [step, setStep] = useState(-1);
  const path = [0, 1, 2, 6, 7];
  useEffect(() => {
    if (step < 0 || step >= CMDS.length) return;
    const t = setTimeout(() => setStep(s => s + 1), 450);
    return () => clearTimeout(t);
  }, [step]);
  const pos = path[Math.max(0, Math.min(step, CMDS.length))] ?? 0;
  const done = step >= CMDS.length;
  return (
    <div className="sg-robot sticker">
      <div className="sg-robot__grid" aria-label={`Spielfeld, Roboter auf Feld ${pos + 1}`} role="img">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={`sg-robot__cell${i === 7 ? " is-goal" : ""}${i === pos ? " is-bot" : ""}`}>
            {i === pos ? <InterestIcon interest="robots" size={26} /> : i === 7 ? "★" : ""}
          </span>
        ))}
      </div>
      <ol className="sg-robot__cmds">
        {CMDS.map((c, i) => (
          <li key={i} className={step === i ? "is-now m-step-glow" : ""}>
            <span aria-hidden="true">{c}</span><span className="visually-hidden">{c === "→" ? "rechts" : "runter"}</span>
            <span className="sg-robot__move"><button type="button" className="chip" aria-label={`Befehl ${i + 1} nach oben`}>↑</button><button type="button" className="chip" aria-label={`Befehl ${i + 1} nach unten`}>↓</button></span>
          </li>
        ))}
      </ol>
      <div className="stack" style={{ alignContent: "start" }}>
        <button type="button" className="btn btn--primary m-press" onClick={() => setStep(0)}>Ausführen</button>
        <p role="status" className={done ? "sg-robot__win" : "muted"}>{done ? "Geschafft! Der Roboter hat den Stern erreicht." : "Drücke Ausführen."}</p>
        {done ? <span className="sg-burst" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map(n => <i key={n} className="m-burst" style={{ ["--bx" as string]: `${Math.cos(n) * 60}px`, ["--by" as string]: `${Math.sin(n) * -50 - 20}px`, background: ["var(--red)", "var(--yellow)", "var(--blue)", "var(--green)", "var(--violet)", "var(--red)"][n] }} />)}</span> : null}
      </div>
    </div>
  );
}
