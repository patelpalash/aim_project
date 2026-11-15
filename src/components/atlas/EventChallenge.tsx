"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, CheckCircle, Code, Cube, Plant, Play, Robot, Shapes, X } from "@phosphor-icons/react";
import type { Offer } from "@/shared/contracts";
import { useLocale } from "../i18n";
import { challengeFor, eventPageUrl } from "./challenge";
import { BridgeGame, CityGame, RouteGame, SortingGame } from "./EventGames";

/** Optional topic tasters, kept entirely in memory. Completing one opens the reviewed source. */
export function EventChallenge({ offer, saved, onSave }: { offer: Offer; saved: boolean; onSave: () => void }) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(true);
  const [harder, setHarder] = useState(false);
  const [solved, setSolved] = useState(false);
  const openedSource = useRef(false);
  const kind = challengeFor(offer);
  if (!kind) return null;
  const say = (de: string, en: string) => locale === "de" ? de : en;
  const sourceUrl = eventPageUrl(offer);
  const Icon = { building: Cube, robot: Robot, coding: Code, ai: Shapes, city: Plant }[kind];
  const title = { building: say("Die Brücken-Werkstatt", "The bridge workshop"), robot: say("Mission: Finde den Weg", "Mission: find the way"), coding: say("Code. Loop. Los!", "Code. Loop. Go!"), ai: say("Das Formen-Labor", "The shape lab"), city: say("Deine Stadt von morgen", "Your city of tomorrow") }[kind];
  const solve = () => {
    setSolved(true);
    if (sourceUrl && !openedSource.current) {
      openedSource.current = true;
      try { window.open(sourceUrl, "_blank", "noopener,noreferrer"); } catch { /* The visible source link remains available. */ }
    }
  };
  return <section className={`event-mission${solved ? " is-solved" : ""}`} aria-label={say("Freiwillige Mini-Mission zum Event", "Optional event mini-mission")}>
    <div className="mission-topline"><span><Icon size={18} weight="duotone" />{say("KLEIN AUSPROBIEREN. GROSS ENTDECKEN.", "A LITTLE PLAY. A BIG DISCOVERY.")}</span><span>1–2 min</span></div>
    <h3>{title}</h3>
    {!open ? <><p>{say("Ein kleines Spiel passend zum Thema. Das Event ist auch ohne Spiel zugänglich.", "A little game inspired by this topic. You can visit the event without playing.")}</p><button type="button" className="btn btn--primary" onClick={() => setOpen(true)}><Play size={18} weight="fill" />{say("Spiel öffnen", "Open game")}</button></> : <>
      <div className="mission-level" role="group" aria-label={say("Spieloptionen", "Game options")}>
        {kind !== "city" ? [false, true].map(value => <button type="button" key={String(value)} aria-pressed={harder === value} onClick={() => { setHarder(value); setSolved(false); }}>{value ? say("Kniffliger", "A little trickier") : say("Einfach", "Easy")}</button>) : null}
        <button type="button" className="mission-skip" onClick={() => { setOpen(false); setSolved(false); }}><X size={16} />{say("Spiel überspringen", "Skip game")}</button>
      </div>
      <div key={`${kind}-${harder}`} className="mission-content">
        {kind === "building" ? <BridgeGame harder={harder} onSolve={solve} onEdit={() => setSolved(false)} /> : kind === "ai" ? <SortingGame harder={harder} onSolve={solve} onEdit={() => setSolved(false)} /> : kind === "city" ? <CityGame onSolve={solve} onEdit={() => setSolved(false)} /> : <RouteGame harder={harder} coding={kind === "coding"} onSolve={solve} onEdit={() => setSolved(false)} />}
      </div>
    </>}
    {solved ? <div className="mission-victory" role="status"><CheckCircle size={28} weight="fill" /><div><strong>{say("Geschafft. Jetzt wird’s echt!", "You did it. Make it real!")}</strong><p>{sourceUrl ? say("Die Eventseite öffnet sich in einem neuen Tab. Falls dein Browser sie blockiert, nutze den Link unten.", "The event page opens in a new tab. If your browser blocks it, use the link below.") : say("Dieses Beispiel hat keine Buchungsseite. Entdecke ein echtes Angebot im Atlas!", "This example has no booking page. Discover a real event in the Atlas!")}</p><button type="button" className="game-save" disabled={saved} onClick={onSave}>{saved ? say("Event gemerkt", "Event saved") : say("Für später merken", "Save for later")}</button></div></div> : null}
    {sourceUrl ? <div className="mission-source"><a href={sourceUrl} target="_blank" rel="noopener noreferrer">{solved ? say("Zur Original-Eventseite", "Open the original event page") : say("Direkt zur Eventseite", "Go straight to the event page")}<ArrowUpRight size={19} /></a><p>{offer.availability === "full" ? say("Laut Quelle ausgebucht. Prüfe dort Warteliste und aktuelle Plätze.", "Listed as full. Check the provider for a waiting list and current availability.") : offer.availability === "cancelled" ? say("Laut Quelle abgesagt. Aktuelle Hinweise beim Veranstalter prüfen.", "Listed as cancelled. Check the organiser’s latest notice.") : say("Anmeldung und Tickets beim Veranstalter prüfen, am besten gemeinsam mit einem Erwachsenen.", "Check registration and tickets with the organiser, ideally together with an adult.")}</p>{!solved ? <p>{say("Nach dem Lösen öffnet sich diese Seite automatisch in einem neuen Tab.", "Solving the game opens this page automatically in a new tab.")}</p> : null}</div> : <p className="mission-disclaimer">{offer.source.kind === "demo" ? say("Erfundenes Demo-Event · keine Tickets oder Buchungsseite.", "Fictional demo event · no tickets or booking page.") : say("Für dieses Angebot ist keine geprüfte Eventseite verfügbar.", "There is no reviewed event-page link for this offer.")}</p>}
    <p className="mission-disclaimer">{say("Freiwilliges Lernspiel von Interest Atlas, kein Teil des Veranstalterprogramms. Du kannst jederzeit überspringen.", "Optional learning game by Interest Atlas, not part of the organiser’s programme. Skip whenever you like.")}</p>
  </section>;
}
