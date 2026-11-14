import type { Interest } from "@/shared/contracts";
import { STRINGS } from "../strings.ts";
import type { Translate } from "../i18n";

/** Look of the five shared interests. Names and hints are translated, not stored here. */
export interface InterestMeta { label: string; hint: string; a: string; b: string; rgb: [number, number, number] }
const INTEREST_LOOK: Record<string, Pick<InterestMeta, "a" | "b" | "rgb">> = {
  "build-games": { a: "var(--i-build-games-a)", b: "var(--i-build-games-b)", rgb: [255, 122, 92] },
  robots: { a: "var(--i-robots-a)", b: "var(--i-robots-b)", rgb: [77, 160, 255] },
  "make-art": { a: "var(--i-make-art-a)", b: "var(--i-make-art-b)", rgb: [246, 140, 150] },
  "solve-puzzles": { a: "var(--i-solve-puzzles-a)", b: "var(--i-solve-puzzles-b)", rgb: [80, 215, 140] },
  "tell-stories": { a: "var(--i-tell-stories-a)", b: "var(--i-tell-stories-b)", rgb: [180, 140, 250] }
};
const NEUTRAL = { a: "var(--accent-a)", b: "var(--accent-b)", rgb: [142, 166, 255] as [number, number, number] };

/** A configured interest without artwork keeps a neutral look and no hint, so themes stay addable. */
export function interestMeta(id: Interest, label?: string, t?: Translate): InterestMeta {
  const look = INTEREST_LOOK[id] ?? NEUTRAL;
  const labelKey = `interest.${id}.label`;
  const hintKey = `interest.${id}.hint`;
  const known = labelKey in STRINGS;
  return {
    ...look,
    label: label ?? (known && t ? t(labelKey as never) : known ? STRINGS[labelKey as keyof typeof STRINGS].de : id),
    hint: hintKey in STRINGS ? (t ? t(hintKey as never) : STRINGS[hintKey as keyof typeof STRINGS].de) : ""
  };
}

const s = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Line icons (decorative; labels carry meaning). */
export function InterestIcon({ interest, size = 28 }: { interest: Interest; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 32 32", "aria-hidden": true } as const;
  switch (interest) {
    case "build-games":
      return <svg {...common}><rect x="4" y="10" width="24" height="14" rx="7" {...s} /><path d="M10 14v6M7 17h6" {...s} /><circle cx="21" cy="15.5" r="1.5" fill="currentColor" /><circle cx="24" cy="19" r="1.5" fill="currentColor" /></svg>;
    case "robots":
      return <svg {...common}><path d="M16 4v4" {...s} /><circle cx="16" cy="4" r="1.6" fill="currentColor" /><rect x="6" y="8" width="20" height="16" rx="5" {...s} /><circle cx="12" cy="15" r="2" fill="currentColor" /><circle cx="20" cy="15" r="2" fill="currentColor" /><path d="M12 20h8M3 14v5M29 14v5" {...s} /></svg>;
    case "make-art":
      return <svg {...common}><path d="M16 5a11 11 0 1 0 0 22c2 0 2.5-1.6 1.6-3-1-1.5.2-3 2-3H23a5 5 0 0 0 5-5C28 9.5 22.6 5 16 5z" {...s} /><circle cx="10" cy="14" r="1.6" fill="currentColor" /><circle cx="14" cy="9.5" r="1.6" fill="currentColor" /><circle cx="20" cy="10" r="1.6" fill="currentColor" /></svg>;
    case "solve-puzzles":
      return <svg {...common}><path d="M6 8h6a3 3 0 1 1 6 0h6v6a3 3 0 1 0 0 6v6h-6a3 3 0 1 0-6 0H6v-6a3 3 0 1 1 0-6z" {...s} /></svg>;
    case "tell-stories":
      return <svg {...common}><path d="M4 8c4-2 8-2 12 1 4-3 8-3 12-1v17c-4-2-8-2-12 1-4-3-8-3-12-1zM16 9v17" {...s} /></svg>;
    default:
      return <svg {...common}><path d="m16 4 3.4 7.4 8 .9-6 5.5 1.7 8L16 21.7l-7.1 4.1 1.7-8-6-5.5 8-.9z" {...s} /></svg>;
  }
}
