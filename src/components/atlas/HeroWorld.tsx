"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Code, GameController, Gear, Pause, Play, Robot, Sparkle } from "@phosphor-icons/react";
import type { Topic } from "@/shared/contracts";
import { pick } from "@/shared/i18n";
import { useLocale } from "../i18n";

interface HeroWorldProps {
  topics: readonly { id: Topic; label: { de: string; en: string } }[];
  selected: readonly Topic[];
  counts: Readonly<Record<string, number>>;
  matchCount: number;
  loading: boolean;
  onChoose: (id: Topic) => void;
  onBrowse: () => void;
}
interface Point { x: number; y: number }
const DESTINATIONS: Point[] = [{ x: 37, y: 42 }, { x: 76, y: 43 }, { x: 52, y: 69 }];

/** A layered miniature world. Topic choices move the courier and filter the real catalogue. */
export function HeroWorld({ topics, selected, counts, matchCount, loading, onChoose, onBrowse }: HeroWorldProps) {
  const { locale } = useLocale();
  const say = (de: string, en: string) => locale === "de" ? de : en;
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [destination, setDestination] = useState<Topic | null>(null);
  const [journey, setJourney] = useState({ from: { x: 25, y: 67 }, to: { x: 25, y: 67 }, serial: 0 });
  const [travelling, setTravelling] = useState(false);
  const roverRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const pointerFrame = useRef(0);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReduced(media.matches); if (media.matches) setTravelling(false); };
    update(); media.addEventListener("change", update);
    return () => { media.removeEventListener("change", update); cancelAnimationFrame(pointerFrame.current); };
  }, []);
  const choose = (id: Topic, index: number) => {
    let from = journey.to;
    if (roverRef.current && stageRef.current) {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(roverRef.current).transform);
      from = { x: matrix.m41 / roverRef.current.clientWidth * 100, y: matrix.m42 / roverRef.current.clientHeight * 100 };
    }
    const seat = id === "ai" ? 0 : id === "coding" ? 1 : id === "gaming" ? 2 : index % 3;
    setDestination(id);
    setJourney({ from, to: DESTINATIONS[seat], serial: journey.serial + 1 });
    setTravelling(!reduced);
    onChoose(id);
  };
  const activeLabel = topics.find(t => t.id === destination)?.label;
  const destinationSelected = destination !== null && selected.includes(destination);
  return <div className={`atlas-world-scene hero-world${paused || reduced ? " motion-paused" : ""}`}>
    <div className="hero-world-top"><span><span className="world-live-dot" />{say("DEINE KLEINE IDEENWELT", "YOUR LITTLE WORLD OF IDEAS")}</span><button type="button" className="world-motion-control" aria-pressed={paused || reduced} disabled={reduced} onClick={() => setPaused(p => !p)} aria-label={reduced ? say("Bewegung durch Geräteeinstellung reduziert", "Motion reduced by your device setting") : paused ? say("Welt animieren", "Play world animations") : say("Animationen pausieren", "Pause world animations")}>{paused || reduced ? <Play size={16} weight="fill" /> : <Pause size={16} weight="fill" />}{paused || reduced ? say("Start", "Play") : say("Pause", "Pause")}</button></div>
    <div className="world-viewport" ref={stageRef}>
      <div className="world-tilt" ref={tiltRef} onPointerMove={event => {
        if (paused || reduced || event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5, y = (event.clientY - rect.top) / rect.height - .5;
        cancelAnimationFrame(pointerFrame.current);
        pointerFrame.current = requestAnimationFrame(() => { tiltRef.current?.style.setProperty("--tilt-x", `${-y * 3}deg`); tiltRef.current?.style.setProperty("--tilt-y", `${x * 4}deg`); });
      }} onPointerLeave={() => { cancelAnimationFrame(pointerFrame.current); tiltRef.current?.style.setProperty("--tilt-x", "0deg"); tiltRef.current?.style.setProperty("--tilt-y", "0deg"); }}>
        <Image className="world-island" src="/art/atlas-world.png" alt={say("Eine kleine Insel mit Roboterwerkstatt, Coding-Gewächshaus und Spielefabrik", "A miniature island with a robot workshop, coding greenhouse and game factory")} width={1536} height={1024} priority sizes="(max-width: 600px) 95vw, (max-width: 1000px) 65vw, 750px" />
        <span className="world-workshop-gear" aria-hidden="true"><Gear weight="fill" /></span>
        <div className={`world-rover${journey.serial ? travelling ? " is-travelling" : " has-arrived" : " is-patrolling"}`} ref={roverRef} key={journey.serial} style={{ "--from-x": `${journey.from.x}%`, "--from-y": `${journey.from.y}%`, "--to-x": `${journey.to.x}%`, "--to-y": `${journey.to.y}%` } as CSSProperties} aria-hidden="true" onAnimationEnd={event => { if (event.animationName === "world-rover-travel") setTravelling(false); }}><span className="world-rover-body"><Image src="/art/atlas-rover.png" alt="" width={1280} height={1280} sizes="90px" /></span></div>
        <span className="world-light world-light--ai" data-active={selected.includes("ai")} aria-hidden="true"><Sparkle size={22} weight="fill" /></span><span className="world-light world-light--coding" data-active={selected.includes("coding")} aria-hidden="true"><Code size={21} weight="bold" /></span><span className="world-light world-light--gaming" data-active={selected.includes("gaming")} aria-hidden="true"><Sparkle size={23} weight="fill" /></span>
      </div>
      <div className="world-hotspots" role="group" aria-label={say("Themen auf der Insel", "Island topics")}>
        {topics.slice(0, 3).map((topic, index) => {
          const Icon = topic.id === "ai" ? Robot : topic.id === "coding" ? Code : topic.id === "gaming" ? GameController : Sparkle;
          const seat = topic.id === "ai" ? 0 : topic.id === "coding" ? 1 : topic.id === "gaming" ? 2 : index;
          return <button key={topic.id} type="button" className={`world-hotspot world-hotspot--${seat}`} data-destination={destination === topic.id} aria-pressed={selected.includes(topic.id)} onClick={() => choose(topic.id, index)}><Icon size={23} weight="duotone" /><span>{pick(topic.label, locale)}<small>{loading ? "…" : `${counts[topic.id] ?? 0} ${say("Angebote", "activities")}`}</small></span><ArrowRight size={18} /></button>;
        })}
      </div>
    </div>
    {topics.length > 3 ? <div className="world-extra-topics">{topics.slice(3).map((topic, index) => <button type="button" key={topic.id} aria-pressed={selected.includes(topic.id)} onClick={() => choose(topic.id, index + 3)}>{pick(topic.label, locale)}</button>)}</div> : null}
    <div className="world-console"><div aria-live="polite"><span className="world-console-icon"><Robot size={23} weight="duotone" /></span><span>{activeLabel ? travelling && !paused ? say("Der Roboter ist unterwegs…", "The robot is on its way…") : destinationSelected ? `${pick(activeLabel, locale)} ${say("entdecken", "selected")}` : say("Deine Auswahl wurde aktualisiert.", "Your selection has been updated.") : say("Tippe auf einen Ort. Der Roboter kommt mit!", "Pick a place. The robot will come along!")}<small>{say("Fantasiewelt · keine echte Landkarte", "An imaginary world · not a location map")}</small></span></div><button type="button" onClick={onBrowse}>{loading ? "…" : matchCount}<span>{say("Treffer", "matches")}</span><ArrowRight size={18} /></button></div>
  </div>;
}
