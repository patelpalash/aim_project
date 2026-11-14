# Interest Atlas design direction and motion system (I1, revision 2)

Owner: Ishan + Claude. Branch `codex/ishan-design`.

**Revision 2 (14 November 2026).** Ishan reviewed the first "maker workshop" sticker style and found it too childish. He asked for a more realistic look with animation and motion across the whole website. The audience is 7 and older, including teens and parents. Revision 2 replaces the sticker style everywhere.

## Direction: Night atlas

A deep night-sky ground with a living star map. Each interest is a luminous gradient with its own icon and label. Surfaces are glass panels and solid cards with real depth (soft shadows, 3D tilt, moving light) instead of flat outlines.

| Area | Choice | Where it lives |
| --- | --- | --- |
| Palette | Night ground, light ink, one accent, five interest gradients, four status colors | `src/styles/tokens.css` |
| Type | Bricolage Grotesque (display) + Inter (reading), via `next/font/google` | `src/app/layout.tsx` |
| Primitives | Buttons, chips, tags, status pills, glass panel | `src/styles/base.css` |
| Interest choice | Five glass tiles (`aria-pressed`) with gradient icon, label, hint and live offer count | `Discovery.tsx`, `discovery.css` |
| Event card | Gradient band, date, title, match reason, facts; unknowns dashed; Demo/Verified tag | `EventCard.tsx`, `atlas.css` |
| Event detail | Side sheet on laptop, bottom sheet on phone; Esc/Back close; focus returns to the card | `DetailSheet.tsx` |
| Parent view (I3) | Same tokens, calmer: fact tables and side-by-side comparison, no ambient motion | planned |
| Organizer desk (I5) | Same tokens as a dense tool: tables, status pills, no decoration | planned |
| First puzzle (I4) | Robot path (Ishan's pick), restyled to this direction | planned |

## Motion map

All classes and timings are in `src/styles/motion.css`; helpers are in `src/components/atlas/motion.ts`.

| Where | What moves | Reduced motion |
| --- | --- | --- |
| Hero | Star-map canvas drifts, links stars and leans toward the pointer; aurora glows drift; headline rises word by word; search and provider list follow | One still frame, no drift |
| Interest tile | Lifts on hover, icon turns; on select the tile lights up, a check spins in, a glow pulses, and that interest's hub star lights up in the hero | State change only |
| Results | Cards glide to their new positions when filters change (View Transitions API), new cards rise in, the count ticks to the new number | Instant change, count jumps |
| Event card | 3D tilt follows the mouse with a moving light and colored glow | None |
| Detail | The card itself grows into the side sheet and shrinks back on close; sheet content cascades in | Short fade |
| Shortlist | Heart pops, a light flies to the header counter, the counter bumps; a live region announces it | Icon/text change and announcement |
| Scroll | Sections ease in as they enter the viewport; header condenses to glass after scrolling | Everything visible immediately |
| Loading | Shimmering skeleton cards and an honest status pill | Static skeleton |

No scroll hijacking, flashing or sound. Decorative motion never blocks input. The canvas pauses off-screen and in hidden tabs. Browsers without View Transitions fall back to CSS entrance animations.

## Rules

- Color never carries meaning alone: interests have icon and label, statuses have text.
- Unknown age, price, date or places show as dashed "unbekannt" tags. Demo fixtures always carry a Demo tag and no registration.
- Touch targets are at least 44 px. Sizes are in rem so larger browser text scales the layout.
- One dark theme on purpose. Checked contrast on the ground color: ink 16:1, soft ink 10:1, faint ink 6:1; white on the primary button at least 4.9:1.

## I2 discovery and explorer

`/` is the discovery home (`src/components/atlas/Discovery.tsx`): interest tiles, direct search, time shortcuts, filters for age, provider, cost, format and step-free access, and a reset. Results use the shared `filterOffers` over one catalog. There are loading, error-with-retry, empty-with-recovery and demo status states.

- **Loader:** `src/components/atlas/catalog.ts` tries `GET /api/offers` (contract shape) and falls back to `data/demo-offers.json` when the route is missing. No preferences or search text are sent. Until Umang's route exists, the browser logs one expected 404.
- **Shared state:** filters and the shortlist live in component state. Swap them for Palash's P3 state when it lands.
- **Honest filters:** when age, cost or step-free is set, records with unknown values are hidden (shared behavior), and the page says so.
- **No new root dependencies.** Motion uses CSS, the View Transitions API, the Web Animations API and one canvas.
- The `/design` style-guide page from revision 1 was removed with the sticker style.
