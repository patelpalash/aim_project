# Interest Atlas design direction and motion system (I1)

Owner: Ishan + Claude. Branch `codex/ishan-design`. Living reference: run the app and open `/design`.

Ishan picked every option visually on 14 November 2026. Audience note from Ishan: **design for 7 and older**, not toddlers. Children, teens and parents use the same data. Teens and parents get calmer emphasis.

## Picks

| Area | Choice | Where it lives |
| --- | --- | --- |
| World | Maker workshop: graph-paper bench, chunky outlined stickers, hard offset shadows | `src/styles/base.css` (paper grid, `.sticker`, `.btn`) |
| Palette | Bold primaries: ink, blue, yellow, red, plus green and violet so each of the five interests has its own color | `src/styles/tokens.css` |
| Type | Fredoka (display) + Atkinson Hyperlegible (reading), loaded with `next/font/google` | `src/app/layout.tsx` |
| Motion | Bouncy spring with a slight overshoot | `src/styles/motion.css` |
| Interest choice | Sticker board: tap or keyboard-toggle stickers (`aria-pressed`), each with color, icon and text | `.interest`, `InterestIcon` |
| Event card | Sticker card: colored band, provider and Demo/Verified tag, date, age, price, unknowns shown dashed | `src/components/atlas/EventCard.tsx` |
| Event detail | Side sheet from the right, bottom sheet on phones; Esc and Back close it; focus returns to the card | `.sheet`, `DetailSheet` in the style guide |
| First puzzle | Robot path: order arrow commands, run, each step highlights; up/down buttons instead of dragging | Layout preview in `/design`; logic waits for Palash's evaluator (P4) |
| Guide | Paper bird. Decorative only; its hints are always real text | `src/components/atlas/PaperBird.tsx` |
| Parent view | Side-by-side comparison table of saved events. No sticker shadows; practical facts first | Preview in `/design` |
| Organizer desk | Neutral tool: dense table, same fonts, status tags. Blocked rows stay visible and unpublished | Preview in `/design` |

## Rules

- Color never carries meaning alone. Every interest has color, icon and label. Every status has text.
- Unknown age, price, date or places render as dashed "unbekannt" tags, never as a guess.
- Demo fixtures always show a Demo tag and never a working registration button.
- Touch targets are at least 44 CSS px. Sizes are in rem, so larger browser text scales the layout.
- One light "paper" theme on purpose. All text pairs were chosen for at least 4.5:1 contrast (checked: `--ink-soft` 7.0:1 and `--ink-faint` ≥4.5:1 on paper, white on `--blue-strong` 5.8:1, status text on its tint ≥4.5:1). Bright fills (`--red`, `--blue`) carry ink text or sit behind white label boxes, never white text.

## Motion table

Targets come from `docs/EXPERIENCE.md`. Class names are in `src/styles/motion.css`.

| Trigger | Class | Timing | Reduced motion |
| --- | --- | --- | --- |
| Pick an interest | `m-stick` (+ `m-press` on all sticker controls) | 180 ms spring | State change only |
| Results change | `m-enter` with `--i` stagger | 260 ms, 40 ms apart | 120 ms fade |
| Open/close event | `m-sheet` + `m-scrim` | 320 ms soft spring | 120 ms fade |
| Save to shortlist | `m-pop`, `m-fly`, counter `m-bump` | 220 ms + 480 ms flight | Icon/text change + live-region announcement; flight hidden |
| Wrong puzzle answer | `m-wobble` | 300 ms | Explanation text |
| Quiz/puzzle step | `m-step` | 220 ms | 120 ms fade, focus moves |
| Success | `m-burst` (sticker confetti, local) | 520 ms | Status text only |
| View switch child/teen/parent | `m-view` | 260 ms fade | Immediate |
| Robot step | `m-step-glow` | 420 ms | Highlight color only |

No scroll hijacking, no flashing, no autoplay sound. The paper bird's idle bob stops under reduced motion. The spring uses CSS `linear()` easing with a cubic-bezier fallback, so it needs no animation library.

## Layout plan

- **Phone (≈390 px):** one column. Interest stickers wrap in rows. Cards are full width. The event detail is a bottom sheet up to 88% of the viewport height. The parent comparison and desk tables scroll sideways inside their own box.
- **Laptop (≈1366 px):** the sticker board sits above a card grid with 3–4 columns. The detail opens as a 480 px side sheet, and the list stays visible behind a scrim. Content max width is 1180 px.

## Integration notes

- No new root dependencies. Fonts come from `next/font/google`, which Next already ships. `next build` fetches them at build time.
- `src/app/layout.tsx` now imports the styles and fonts. Palash's bootstrap page at `/` is unchanged until I2 replaces it.
- The style guide reads `data/demo-offers.json` directly for previews only. I2 will switch to the agreed shared loader.
