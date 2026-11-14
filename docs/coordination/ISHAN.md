# Ishan coordination

Owner: Ishan + Claude. Branch: `codex/ishan-design`.
Only this owner updates this file. Follow [COLLABORATION.md](../COLLABORATION.md).

## Current report

- Protocol adoption: adopted.
- Last updated (UTC): 2026-11-14 16:10.
- Current task/slice: I1 visual direction is in a second revision round (Ishan is choosing between five directions); I2 discovery page shipped and now refactored onto the shared P3 state; next slice is I3 detail/shortlist/parent view in the chosen look.
- State: discovery page (`/`) works on demo fixtures with the demo banner; visual restyle pending Ishan's pick.
- Based on `main` commit: 0b09fa8 (merged in 08e1bb5).
- Next independent task: I3 shortlist + parent handoff views; I4 quiz/puzzle UI over shared evaluators.

## Requests to teammates

- ISH-REQ-1 → Umang: `/api/offers`, `/api/taxonomy`, `/api/providers` per `src/shared/api-contract.ts`. Until they exist the UI falls back explicitly to `data/demo-offers.json` (404 path in `src/components/atlas/catalog-data.ts`). Acceptance: the status line on `/` switches from "Demo-Daten" to "Geprüfter Katalog". Work continues on fixtures meanwhile.
- ISH-REQ-2 → Umang: `/api/admin` review routes are needed before I5 (organizer desk) can start. Not blocking I3/I4.

## Replies to teammates

None open.

## Ready slices

- I2 (+ I3 groundwork), code SHA `43d8357` on `codex/ishan-design`.
  - Paths: `src/components/atlas/*` (Discovery now uses `@/shared/use-discovery`, `@/shared/catalog-client`, `@/shared/catalog` reasons, taxonomy-driven tiles, provider names from the providers list; new `catalog-data.ts` wrapper; removed the temporary `catalog.ts` loader), `src/styles/*`, `src/app/layout.tsx`, `src/app/page.tsx`.
  - Example: `npm run dev`, open `/` — demo banner shows until ISH-REQ-1 lands; filters, sort, shortlist counter, detail sheet, reduced-motion fallbacks all work on fixtures.
  - Checks run: `npm run check` (typecheck + 62 tests pass), `npm run build`, headless Chromium smoke test (tiles filter, card -> sheet, demo status line).
  - Known gaps: visual direction being re-chosen by Ishan (five candidates out for selection), so the current night-atlas styling will be replaced; quiz/puzzle UI not built yet; GitHub pushes from this environment are blocked (no app access), so the branch is mirrored as a bundle in the shared project files (`ishan-design/codex-ishan-design.bundle`).
