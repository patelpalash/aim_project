# Ishan coordination

Owner: Ishan + Claude. Branch: `codex/ishan-design`.
Only this owner updates this file. Follow [COLLABORATION.md](../COLLABORATION.md).

## Current report

- Protocol adoption: adopted.
- Last updated (UTC): 2026-11-14 17:55.
- Current task/slice: I1-I6 implemented; verified against Umang's backend and fixed what that showed.
- State: with `codex/umang-data` merged locally, both routes run on the real API: `/` loads the live catalogue and reports per-source import state; `/organizer` does upload -> inline correction -> selected publication against the real review service.
- Based on `main` commit: `6629eca` (merged in `09c979b`).
- Next independent task: none blocking. Available for rehearsal fixes and whatever Palash's integration finds.

## Requests to teammates

- ISH-REQ-1 → Umang: **closed, delivered.** `/api/offers`, `/api/taxonomy`, `/api/providers` verified from my pages. The fixture fallback stays as the 404 path only.
- ISH-REQ-2 → Umang: **closed, delivered.** The admin routes work from `/organizer`. Note for everyone: they are local-only behind `INTEREST_ATLAS_LOCAL_DESK=1`; without it the desk correctly shows its "only locally enabled" state.
- ISH-REQ-3 → Umang (small, not blocking): `sourceStatus.message` is English ("15 candidate(s) staged for human review"). The panel now writes its own German sentence from `extractedCount`/`rejectedCount`/`partialCoverage` and shows your message as secondary detail, so nothing is blocked — but a German message, or a localised pair, would let the raw text move up.

## Replies to teammates

- **To Umang, on your ISH-REQ-1/ISH-REQ-2 replies: confirmed on my side.** I merged `origin/codex/umang-data` (`1323a19`) with my branch locally — no conflicts, `npm run check` 106/106, `npm run build` clean — and ran both routes against your server with `INTEREST_ATLAS_LOCAL_DESK=1`:
  - `/` loads the real bundle; 24 offers after publication; the status line stays "Demo-Daten" while demo fixtures are in the catalogue, which is the agreed behaviour.
  - `/organizer`: `data/demo-upload.csv` → 18 ready / 2 blocked; the date fix on the blocked row → 19 ready, revision 2; "Ausgewählte veröffentlichen (19)" → **19 veröffentlicht · 1 blockiert geblieben · Katalogversion 3**, and the blocked row is not public.
  - Thanks for the two editor-side server fixes in `8a75c3b` — the date edit and the age/`ageEvidence` re-derivation both behave as you describe.
  - Three things this run found on **my** side, all fixed in `6805780` and `5cbe349`: the publish confirmation was being wiped by the session refresh that follows approval; a reload lost the open import (the desk now stores the import id for the tab and refetches); and the "server missing" copy wrongly said the routes did not exist.
  - New on the results page: a "Woher die Angebote kommen" panel that reports your `sourceStatuses` and `cache` per provider, naming partial coverage explicitly. See ISH-REQ-3.

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
