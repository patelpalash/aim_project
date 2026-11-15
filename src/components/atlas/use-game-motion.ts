"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { prefersReducedMotion } from "./motion";

/** One cancellable timeline per game: reset, skip and unmount cancel completion too. */
export function useGamePlayback() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [running, setRunning] = useState(false);
  const cancel = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(false);
  }, []);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  const play = (count: number, interval: number, step: (index: number) => void, finish: () => void) => {
    cancel();
    if (prefersReducedMotion()) { step(count - 1); finish(); return; }
    setRunning(true);
    for (let index = 0; index < count; index++) {
      timers.current.push(setTimeout(() => step(index), 60 + index * interval));
    }
    // Allow the last CSS move to finish before success or an external page can appear.
    timers.current.push(setTimeout(() => { setRunning(false); finish(); }, 60 + count * interval));
  };
  return { running, play, cancel };
}

/** Animate a numbered piece to its new box, including moves between different parents. */
export function useMovingPieces(ref: RefObject<HTMLDivElement | null>, revision: unknown) {
  const previous = useRef(new Map<string, DOMRect>());
  const capture = () => {
    const current = new Map<string, DOMRect>();
    ref.current?.querySelectorAll<HTMLElement>("[data-piece]").forEach(element => current.set(element.dataset.piece!, element.getBoundingClientRect()));
    previous.current = current;
  };
  useLayoutEffect(() => {
    const next = new Map<string, DOMRect>();
    ref.current?.querySelectorAll<HTMLElement>("[data-piece]").forEach(element => {
      const key = element.dataset.piece!;
      const rect = element.getBoundingClientRect();
      const before = previous.current.get(key);
      if (before && !prefersReducedMotion() && typeof element.animate === "function") {
        const dx = before.left - rect.left, dy = before.top - rect.top;
        if (Math.abs(dx) + Math.abs(dy) > 2) {
          element.animate([
            { transform: `translate(${dx}px, ${dy}px) scale(1.08)`, zIndex: 5 },
            { transform: "translate(0, 0) scale(1)", zIndex: 5 }
          ], { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" });
        }
      }
      next.set(key, rect);
    });
    previous.current = next;
  }, [ref, revision]);
  return capture;
}
