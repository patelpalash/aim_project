"use client";

import { useEffect, useRef } from "react";
import type { Interest } from "@/shared/contracts";
import { INTERESTS } from "@/shared/contracts";
import { INTEREST_META } from "./interests";

/** Where each interest's hub star sits, as a fraction of the canvas (kept clear of the headline on wide screens). */
const HUBS: Record<Interest, [number, number]> = {
  "build-games": [0.62, 0.3], robots: [0.8, 0.52], "make-art": [0.93, 0.22], "solve-puzzles": [0.68, 0.74], "tell-stories": [0.9, 0.8]
};

/**
 * Decorative living star map behind the hero. Stars drift and link up; each interest has a hub star
 * that lights up and connects to its neighbours when that interest is selected, and the map leans
 * toward the pointer. Pauses off-screen and in hidden tabs. With reduced motion it draws one still frame.
 */
export function HeroCanvas({ selected }: { selected: Interest[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sel = useRef(selected);
  const redraw = useRef<() => void>(() => undefined);
  sel.current = selected;
  useEffect(() => { redraw.current(); }, [selected]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, visible = true, t = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const glow: Record<string, number> = {};
    type Star = { x: number; y: number; vx: number; vy: number; r: number; tw: number };
    let stars: Star[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(90, Math.max(28, (w * h) / 14000)));
      let seed = 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      stars = Array.from({ length: n }, () => ({ x: rnd() * w, y: rnd() * h, vx: (rnd() - 0.5) * 0.22, vy: (rnd() - 0.5) * 0.22, r: 0.6 + rnd() * 1.6, tw: rnd() * 6.28 }));
    };

    const draw = () => {
      t += 0.016;
      pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05;
      ctx.clearRect(0, 0, w, h);
      const ox = pointer.x * 18, oy = pointer.y * 12;
      if (!still) for (const s of stars) {
        s.x += s.vx; s.y += s.vy;
        if (s.x < -20) s.x = w + 20; else if (s.x > w + 20) s.x = -20;
        if (s.y < -20) s.y = h + 20; else if (s.y > h + 20) s.y = -20;
      }
      const link = Math.min(150, w * 0.16);
      ctx.lineWidth = 1;
      for (let i = 0; i < stars.length; i++) {
        const a = stars[i]!;
        for (let j = i + 1; j < stars.length; j++) {
          const b = stars[j]!, d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < link) { ctx.strokeStyle = `rgba(160,180,255,${0.16 * (1 - d / link)})`; ctx.beginPath(); ctx.moveTo(a.x + ox, a.y + oy); ctx.lineTo(b.x + ox, b.y + oy); ctx.stroke(); }
        }
      }
      for (const s of stars) {
        ctx.fillStyle = `rgba(220,228,255,${0.45 + 0.35 * Math.sin(t * 1.4 + s.tw)})`;
        ctx.beginPath(); ctx.arc(s.x + ox, s.y + oy, s.r, 0, 6.283); ctx.fill();
      }
      // Interest hubs
      for (const id of INTERESTS) {
        const on = sel.current.includes(id) ? 1 : 0;
        glow[id] = still ? on : (glow[id] ?? 0) + (on - (glow[id] ?? 0)) * 0.08;
        const g = glow[id]!, [fx, fy] = HUBS[id], [r, gg, b] = INTEREST_META[id].rgb;
        const hx = fx * w + ox * 1.8 + (still ? 0 : Math.sin(t * 0.6 + fx * 9) * 6), hy = fy * h + oy * 1.8 + (still ? 0 : Math.cos(t * 0.5 + fy * 7) * 6);
        if (g > 0.02) for (const s of stars) {
          const d = Math.hypot(s.x + ox - hx, s.y + oy - hy), reach = 210;
          if (d < reach) { ctx.strokeStyle = `rgba(${r},${gg},${b},${0.55 * g * (1 - d / reach)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(s.x + ox, s.y + oy); ctx.stroke(); }
        }
        const rad = 26 + g * 46 + (still ? 0 : Math.sin(t * 2 + fx * 5) * 3);
        const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, rad);
        grad.addColorStop(0, `rgba(${r},${gg},${b},${0.35 + 0.5 * g})`); grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(hx, hy, rad, 0, 6.283); ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${0.75 + 0.25 * g})`; ctx.beginPath(); ctx.arc(hx, hy, 2.4 + g * 2.2, 0, 6.283); ctx.fill();
      }
    };
    const loop = () => { if (visible && !document.hidden) draw(); raf = requestAnimationFrame(loop); };
    redraw.current = () => { if (still) draw(); };

    resize(); draw();
    const ro = new ResizeObserver(() => { resize(); draw(); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; });
    io.observe(canvas);
    const onMove = (e: PointerEvent) => { pointer.tx = e.clientX / window.innerWidth - 0.5; pointer.ty = e.clientY / window.innerHeight - 0.5; };
    if (!still) { window.addEventListener("pointermove", onMove, { passive: true }); raf = requestAnimationFrame(loop); }
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener("pointermove", onMove); };
  }, []);

  return <canvas ref={ref} className="dz-hero__canvas" aria-hidden="true" />;
}
