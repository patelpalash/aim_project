import type { Interest } from "@/shared/contracts";

/** Presentation metadata for the five shared interests. Labels are German-first. */
export const INTEREST_META: Record<Interest, { label: string; teen: string; color: string; tint: string; radius: string }> = {
  "build-games": { label: "Spiele bauen", teen: "Game Design", color: "var(--interest-build-games)", tint: "var(--red-tint)", radius: "14px" },
  robots: { label: "Roboter", teen: "Robotik & KI", color: "var(--interest-robots)", tint: "var(--blue-tint)", radius: "50%" },
  "make-art": { label: "Kunst & Bilder", teen: "Digitale Kunst", color: "var(--interest-make-art)", tint: "var(--yellow-tint)", radius: "50% 50% 14px 50%" },
  "solve-puzzles": { label: "Rätsel lösen", teen: "Logik & Code", color: "var(--interest-solve-puzzles)", tint: "var(--green-tint)", radius: "10px 28px" },
  "tell-stories": { label: "Geschichten", teen: "Storytelling", color: "var(--interest-tell-stories)", tint: "var(--violet-tint)", radius: "28px 10px" }
};

const stroke = { fill: "none", stroke: "#1b2230", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Simple line icons drawn for the workshop style (decorative; labels carry meaning). */
export function InterestIcon({ interest, size = 30 }: { interest: Interest; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 32 32", "aria-hidden": true } as const;
  switch (interest) {
    case "build-games":
      return <svg {...common}><rect x="4" y="10" width="24" height="14" rx="7" {...stroke} fill="#fff" /><path d="M10 14v6M7 17h6" {...stroke} /><circle cx="21" cy="15.5" r="1.6" fill="#1b2230" /><circle cx="24" cy="19" r="1.6" fill="#1b2230" /></svg>;
    case "robots":
      return <svg {...common}><path d="M16 4v4" {...stroke} /><circle cx="16" cy="4" r="1.8" fill="#1b2230" /><rect x="6" y="8" width="20" height="16" rx="5" {...stroke} fill="#fff" /><circle cx="12" cy="15" r="2.2" fill="#1b2230" /><circle cx="20" cy="15" r="2.2" fill="#1b2230" /><path d="M12 20h8" {...stroke} /><path d="M3 14v5M29 14v5" {...stroke} /></svg>;
    case "make-art":
      return <svg {...common}><path d="M16 5a11 11 0 1 0 0 22c2 0 2.5-1.6 1.6-3-1-1.5.2-3 2-3H23a5 5 0 0 0 5-5C28 9.5 22.6 5 16 5z" {...stroke} fill="#fff" /><circle cx="10" cy="14" r="1.8" fill="#ff5a4e" /><circle cx="14" cy="9.5" r="1.8" fill="#2f7cf6" /><circle cx="20" cy="10" r="1.8" fill="#22a36b" /></svg>;
    case "solve-puzzles":
      return <svg {...common}><path d="M6 8h6a3 3 0 1 1 6 0h6v6a3 3 0 1 0 0 6v6h-6a3 3 0 1 0-6 0H6v-6a3 3 0 1 1 0-6z" {...stroke} fill="#fff" /></svg>;
    case "tell-stories":
      return <svg {...common}><path d="M4 8c4-2 8-2 12 1 4-3 8-3 12-1v17c-4-2-8-2-12 1-4-3-8-3-12-1z" {...stroke} fill="#fff" /><path d="M16 9v17" {...stroke} /></svg>;
  }
}
