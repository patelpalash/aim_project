"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface AtlasTransition { skipTransition: () => void; finished: Promise<void>; ready: Promise<void>; updateCallbackDone: Promise<void> }
type VTDocument = Document & { startViewTransition?: (cb: () => void) => AtlasTransition };
let activeTransition: AtlasTransition | null = null;
let pendingUpdate: (() => void) | null = null;
export function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && typeof (document as VTDocument).startViewTransition === "function" && !prefersReducedMotion();
}

/** Run a state update as a View Transition so named elements glide between layouts. Falls back to a plain update. */
export function withTransition(update: () => void): void {
  // Rapid filter / open / close clicks must commit in order, even during a snapshot.
  pendingUpdate?.();
  activeTransition?.skipTransition();
  if (!supportsViewTransitions()) { pendingUpdate = null; activeTransition = null; update(); return; }
  let committed = false;
  const apply = () => { if (committed) return; committed = true; flushSync(update); };
  pendingUpdate = apply;
  try {
    const transition = (document as VTDocument).startViewTransition!(apply);
    activeTransition = transition;
    transition.ready.catch(() => undefined);
    transition.updateCallbackDone.catch(() => undefined);
    transition.finished.catch(() => undefined).finally(() => {
      if (activeTransition === transition) { activeTransition = null; pendingUpdate = null; }
    });
  } catch { apply(); activeTransition = null; pendingUpdate = null; }
}

/** Short exit animation, with an immediate reduced-motion path and unmount cleanup. */
export function useSheetMotion(onClose: () => void) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(onClose);
  latest.current = onClose;
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const close = () => {
    if (timer.current) return;
    if (prefersReducedMotion()) { latest.current(); return; }
    setClosing(true);
    timer.current = setTimeout(() => latest.current(), 180);
  };
  return { closing, close };
}

/** Marks .reveal elements with data-in (an attribute React re-renders leave alone) elements as they scroll into view. Content stays visible if this never runs. */
export function useScrollReveal(dep: unknown): void {
  useEffect(() => {
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("can-reveal");
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { e.target.setAttribute("data-in", ""); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    document.querySelectorAll(".reveal:not([data-in])").forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [dep]);
}

/** Ticks a number toward its target (results count). Immediate with reduced motion. */
export function useCountUp(target: number, ms = 380): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (prefersReducedMotion()) { setValue(target); from.current = target; return; }
    const start = from.current, t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms), eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(start + (target - start) * eased);
      setValue(v); from.current = v;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

/** A small light flies from one element to another (save → shortlist counter). */
export function flyBetween(from: HTMLElement, to: HTMLElement | null, onArrive: () => void): void {
  if (!to || prefersReducedMotion() || typeof from.animate !== "function") { onArrive(); return; }
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const dot = document.createElement("span");
  dot.className = "fly-dot";
  dot.style.left = `${a.left + a.width / 2}px`; dot.style.top = `${a.top + a.height / 2}px`;
  document.body.appendChild(dot);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = dot.animate([
    { transform: "translate(0,0) scale(1)", opacity: 1 },
    { transform: `translate(${dx * 0.35}px, ${dy * 0.75 - 60}px) scale(1.5)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0.9 }
  ], { duration: 620, easing: "cubic-bezier(0.5, 0, 0.2, 1)" });
  anim.onfinish = () => { dot.remove(); onArrive(); };
}
