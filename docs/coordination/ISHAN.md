# Ishan coordination

Owner: Ishan + Claude. Branch: `codex/ishan-design`.
Only this owner updates this file. Follow [COLLABORATION.md](../COLLABORATION.md).

## Current report

- Protocol adoption: adopted.
- Last updated (UTC): 2026-11-14 16:40.
- Current task/slice: I1 settled ("Clean studio", Ishan's pick, docs/DESIGN.md) and the site restyled to it, including a new list/map toggle (schematic Heilbronn map); I3 shortlist + parent handoff shipped. Next: I4 quiz + sequence puzzle UI.
- State: discovery page (`/`) works on demo fixtures with the demo banner; clean-studio look live; shortlist sheet with "Für Eltern" tab live.
- Based on `main` commit: 0b09fa8 (merged in 08e1bb5).
- Next independent task: I4 quiz/puzzle UI over shared evaluators; then I5 organizer desk (needs ISH-REQ-2).

## Requests to teammates

- ISH-REQ-1 → Umang: `/api/offers`, `/api/taxonomy`, `/api/providers` per `src/shared/api-contract.ts`. Until they exist the UI falls back explicitly to `data/demo-offers.json` (404 path in `src/components/atlas/catalog-data.ts`). Acceptance: the status line on `/` switches from "Demo-Daten" to "Geprüfter Katalog". Work continues on fixtures meanwhile.
- ISH-REQ-2 → Umang: `/api/admin` review routes are needed before I5 (organizer desk) can start. Not blocking I3/I4.

## Replies to teammates

None open.

## Ready slices

- I1 rev 3 + I3, code SHAs `68beb96` (clean-studio restyle + MapView) and `d5b3dd8` (ShortlistSheet with parent handoff) on `codex/ishan-design`.
  - Paths: `src/styles/*`, `src/app/layout.tsx`, `src/components/atlas/{MapView,ShortlistSheet}.tsx`, restyled atlas components; docs/DESIGN.md rev 3. HeroCanvas removed.
  - Checks run: `npm run check`, `npm run build`, headless Chromium flows (save → shortlist → parent tab, map pins → detail sheet, phone width no h-scroll). Screenshots in project files `ishan-design/screens/v3-*.png`.
  - Known gaps: map is schematic until offers carry addresses/coordinates; audience-mode currently only switches to parent via "Erwachsenen zeigen".

- I2 (+ I3 groundwork), code SHA `43d8357` on `codex/ishan-design`.
  - Paths: `src/components/atlas/*` (Discovery now uses `@/shared/use-discovery`, `@/shared/catalog-client`, `@/shared/catalog` reasons, taxonomy-driven tiles, provider names from the providers list; new `catalog-data.ts` wrapper; removed the temporary `catalog.ts` loader), `src/styles/*`, `src/app/layout.tsx`, `src/app/page.tsx`.
  - Example: `npm run dev`, open `/` — demo banner shows until ISH-REQ-1 lands; filters, sort, shortlist counter, detail sheet, reduced-motion fallbacks all work on fixtures.
  - Checks run: `npm run check` (typecheck + 62 tests pass), `npm run build`, headless Chromium smoke test (tiles filter, card -> sheet, demo status line).
  - Known gaps: visual direction being re-chosen by Ishan (five candidates out for selection), so the current night-atlas styling will be replaced; quiz/puzzle UI not built yet; GitHub pushes from this environment are blocked (no app access), so the branch is mirrored as a bundle in the shared project files (`ishan-design/codex-ishan-design.bundle`).
