# Interest Atlas — visual direction, revision 3: "Clean studio"

Chosen by Ishan on 2026-11-14 from five candidate directions (clean studio, bold poster,
magazine, soft glass, city map), with the city-map feature from candidate 5 folded in.

## Direction

A bright, calm, photo-led booking-site feel. White ground, dark ink (#111827), one confident
blue (#1f5eff), soft wide shadows, big friendly radii. Interest gradients color the picture
areas of cards until real event photos exist. Audience is 7+ and their parents: modern and
trustworthy, never childish. One light world on purpose (no dark variant yet).

- Type: Plus Jakarta Sans (display, 700/800, tight tracking) + Inter (body). `--font-display` / `--font-body`.
- Tokens live in `src/styles/tokens.css`; components only use tokens.
- Primitives (buttons, chips, tags, status lines, panel) in `src/styles/base.css`.

## Motion map (`src/styles/motion.css` + component CSS)

- Hero: headline parts rise in; the verb rotates (Bauen → Entdecken → Erfinden) in a masked
  window; search bar lifts on focus.
- Interest tiles: lift + orb tilt on hover, check pops in, gradient wash on selection.
- Results: View Transitions glide cards to new places; count ticks up; cards tilt in 3D with a
  moving glare; the picture area zooms slightly on hover.
- Detail: the card morphs into the side sheet (View Transitions), content cascades in.
- Shortlist: heart pops, a light flies to the header counter, the counter bumps.
- Map: pins drop in and pulse; hovering a list row lifts its pin (and the other way around).
- Reduced motion: all transforms removed, short fades remain (global override in motion.css).

## City map view

`src/components/atlas/MapView.tsx`. The catalog has venue names but no coordinates, so the map
is deliberately schematic: one anchor per provider on a stylized Heilbronn canvas (river, blocks,
Bildungscampus/Innenstadt labels), pins fanned around the anchor, and a visible note
"Schematische Karte: Die Position zeigt den Anbieter, nicht die genaue Adresse." Nothing
geographic is invented. When sources provide addresses/coordinates, the anchors can become real
positions without changing the component's interface.

## Data honesty rules (unchanged)

Demo offers always show the demo tag and banner; unknown age/price/access stay "unbekannt" and
are excluded by those filters with an explaining hint; no invented times, prices or places.

## Accessibility pass (I6)

Checked with headless Chromium at 360 / 390 / 768 / 1440 px on both routes, plus a 22px root
font size (≈200% text) and `prefers-reduced-motion: reduce`:

- No horizontal page scroll and no element overflowing the viewport at any of those widths, with
  normal or enlarged text.
- Skip link as the first tab stop on both routes (`.skip-link`), jumping to the results heading
  and the organizer main region.
- Every interactive control shows a focus ring (`--focus-ring`); the search field highlights its
  whole pill via `:focus-within`.
- Touch targets: 44px for the logo and, on coarse pointers, for the list/map and tab toggles;
  card titles use a full-card hit area via `::after`.
- Reduced motion: the rotating verb, reveals and card entrances resolve to their end state; the
  robot animates in one step; nothing is left at `opacity: 0`.
- Status changes (result counts, saving, publishing, puzzle feedback) are announced through
  `role="status"` live regions.

## Follow-up slice: maintenance, topics, presentation, play navigation, dialog keys

Five requested additions, all on the shared contracts and Umang's local desk routes.

**Source and theme maintenance (`/organizer` → "Quellen & Themen").** Sources and themes are
added, renamed, enabled and disabled through `POST /api/admin/providers` and
`POST /api/admin/topics`. Rules the UI states rather than hides: an ID is never deleted, only
disabled, so already published offers keep validating; an existing source keeps its allowed hosts,
and a link off those hosts is refused with the reason; a newly added source is labelled CSV-only,
because automatic refresh needs an adapter for that website. The configuration version is shown
and visibly counts up with every change.

**Direct topic filters.** The three configured topic areas (KI, Coding, Gaming) sit above the
interest tiles as `filters.topics` chips, with a per-topic count and their own reset. Counts on
the chips and on the interest tiles are computed inside the time window in effect, so the number
matches the list that follows. Themes come from the loaded configuration only — never from the
bundled seed — so a disabled or renamed theme is never shown.

**Presentation switching (child / teen / adult).** The header switch dispatches only
`set-audience-mode`. Interests, topics, filters, the shortlist and quiz answers all survive it,
and the change is announced. The adult view changes wording, adds the venue and access line to
each card, opens the shortlist on the parent tab, and keeps the quiz and puzzle in the child and
teen views with a line saying where they are. The filter reset now clears filters only; the
shortlist, the mode and the quiz have their own controls.

**Quiz and puzzle navigation.** Back, re-answer, clear a single answer, "Antworten ändern" from
the result screen, and one reset for quiz and puzzle together that leaves saved offers and filters
untouched. The "already solved" note is tracked in the component, because the shared
`completedPuzzleIds` only grows (see ISH-REQ-4).

**Dialog keyboard.** `useDialog` (`src/components/atlas/use-dialog.ts`) moves focus into a sheet,
keeps Tab and Shift+Tab inside it, closes on Esc, and returns focus to the opener — or to a named
fallback when that element is gone, so focus never drops to the top of the document.
