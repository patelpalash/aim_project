# Ishan coordination

Owner: Ishan + Claude. Branch: `codex/ishan-design`.
Only this owner updates this file. Follow [COLLABORATION.md](../COLLABORATION.md).

## Current report

- Protocol adoption: adopted.
- Last updated (UTC): 2026-11-14 17:05.
- Current task/slice: I1-I6 all implemented and pushed to `codex/ishan-design` (head `728d42f`). Ready for Palash's integration into main.
- State: `/` discovery works end to end on demo fixtures with the demo banner; `/organizer` works against the admin contract and states plainly that those routes are missing.
- Based on `main` commit: 0b09fa8 (merged in 08e1bb5).
- Next independent task: none blocking; waiting on ISH-REQ-1/ISH-REQ-2 to switch from fixtures to live data.

## Requests to teammates

- ISH-REQ-1 → Umang: `/api/offers`, `/api/taxonomy`, `/api/providers` per `src/shared/api-contract.ts`. Until they exist the UI falls back explicitly to `data/demo-offers.json` (404 path in `src/components/atlas/catalog-data.ts`). Acceptance: the status line on `/` switches from "Demo-Daten" to "Geprüfter Katalog". Work continues on fixtures meanwhile.
- ISH-REQ-2 → Umang: `/api/admin` review routes are needed before I5 (organizer desk) can start. Not blocking I3/I4.

## Replies to teammates

None open.

## Ready slices

- I4, I5, I6 — code SHAs `ea38295` (quiz + robot-path puzzle over the shared evaluators), `a1826f2` (organizer desk at `/organizer`), `728d42f` (accessibility pass).
  - Paths: `src/components/atlas/{PlaySection.tsx,play.css}`, `src/components/organizer/{OrganizerDesk.tsx,api.ts,organizer.css}`, `src/app/organizer/page.tsx`, `src/styles/base.css`.
  - Example: `/organizer` → "Beispiel-Session ansehen" renders `examples/review-session.json` read-only (1 ready, 1 blocked with its issue); with the admin routes live, upload → row states → inline PATCH → publish selected works without further changes.
  - Checks run: `npm run check` (62 tests), `npm run build`, headless Chromium at 360-1440px incl. 200% text and reduced motion; quiz suggestions and the puzzle's correct/boundary/not-at-goal paths exercised.
  - Known gaps: everything server-side is ISH-REQ-1/ISH-REQ-2; the map stays schematic until offers carry addresses.

- I1 rev 3 + I3, code SHAs `68beb96` (clean-studio restyle + MapView) and `d5b3dd8` (ShortlistSheet with parent handoff) on `codex/ishan-design`.
  - Paths: `src/styles/*`, `src/app/layout.tsx`, `src/components/atlas/{MapView,ShortlistSheet}.tsx`, restyled atlas components; docs/DESIGN.md rev 3. HeroCanvas removed.
  - Checks run: `npm run check`, `npm run build`, headless Chromium flows (save → shortlist → parent tab, map pins → detail sheet, phone width no h-scroll). Screenshots in project files `ishan-design/screens/v3-*.png`.
  - Known gaps: map is schematic until offers carry addresses/coordinates; audience-mode currently only switches to parent via "Erwachsenen zeigen".

- I2 (+ I3 groundwork), code SHA `43d8357` on `codex/ishan-design`.
  - Paths: `src/components/atlas/*` (Discovery now uses `@/shared/use-discovery`, `@/shared/catalog-client`, `@/shared/catalog` reasons, taxonomy-driven tiles, provider names from the providers list; new `catalog-data.ts` wrapper; removed the temporary `catalog.ts` loader), `src/styles/*`, `src/app/layout.tsx`, `src/app/page.tsx`.
  - Example: `npm run dev`, open `/` — demo banner shows until ISH-REQ-1 lands; filters, sort, shortlist counter, detail sheet, reduced-motion fallbacks all work on fixtures.
  - Checks run: `npm run check` (typecheck + 62 tests pass), `npm run build`, headless Chromium smoke test (tiles filter, card -> sheet, demo status line).
  - Known gaps: visual direction being re-chosen by Ishan (five candidates out for selection), so the current night-atlas styling will be replaced; quiz/puzzle UI not built yet; GitHub pushes from this environment are blocked (no app access), so the branch is mirrored as a bundle in the shared project files (`ishan-design/codex-ishan-design.bundle`).
