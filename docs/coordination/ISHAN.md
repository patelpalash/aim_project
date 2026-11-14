# Ishan coordination

Owner: Ishan + Claude. Branch: `codex/ishan-design`.
Only this owner updates this file. Follow [COLLABORATION.md](../COLLABORATION.md).

## Current report

- Protocol adoption: adopted.
- Last updated (UTC): 2026-11-14 19:55.
- Current task/slice: final frontend acceptance and rehearsal fixes on the integrated baseline.
- State: `origin/main` at `5511647` fast-forwarded my branch — my follow-up through `7aa6ae5` is already integrated, and Palash's mixed-catalog wording, `reset-play`, full-session reset, source-refresh polling and review staging are all present and were exercised, not replaced. Acceptance code SHA: **`c072a22`**. `npm ci`, `npm run check` (123/123) and `npm run build` pass on Node 24.22.3.
- Based on `main` commit: `5511647`.
- Next independent task: none blocking. Available for rehearsal fixes.

## Acceptance evidence (code `c072a22`)

100 assertions against the running production server (`npm run start -- --port 3100`, `INTEREST_ATLAS_LOCAL_DESK=1` only while testing maintenance), all passing. Scripts are throwaway; what they asserted:

- **Layout (35):** `/` and `/organizer` at 360, 390, 768, 1024 and 1440px — no horizontal overflow, and every interactive control inside the viewport and at least 24x24px (a card title is exempt because its `::after` gives it the whole card; verified by clicking the card's corners, not by reading CSS). 200% text (32px root) at 360px on both routes. `prefers-reduced-motion: reduce`: nothing left transparent.
- **Discovery (12):** the status line read `19 geprüfte Angebote · 8 Demo-Beispiele (erfunden)`, matching `/api/offers` provenance counts exactly. Topic + query (20 → 8), topic + provider (20 → 8) and topic + age (8 → 4) narrow together; an interest tile stays combined with a topic and the active-filter count showed 3. The unknown-value hint appears, and every card's Demo/Geprüft label matched its record's `source.kind`.
- **Presentation (12):** switching Kinder → Jugendliche → Erwachsene and back preserved the selected interest, the selected topic, the shortlist count and the ability to reopen the same activity.
- **Dialogs (11):** detail and shortlist sheets both move focus in, contain Tab and Shift+Tab over 45 presses each, close on Escape and restore focus to their opener. PALASH-005's specific leak (Shift+Tab from the parent shortlist tab reaching the background Organizer link) is contained.
- **Play (16):** quiz skip, Back after a skip, re-answering a question and clearing one answer. The puzzle's open slot rejects a turn with "Das Ziel ist noch nicht erreicht", the retry clears board and message, and `forward` is accepted. Play reset (shared `reset-play`) kept shortlist, interests and topics while clearing the quiz and the solved note, and the note stayed cleared across a mode switch. The separate `Sitzung zurücksetzen` cleared shortlist, interests, topics and returned to the child view.
- **Organizer (26):** fictional `data/demo-upload.csv` → 18 ready / 2 blocked with the reason shown (`line 8.date: date required`); upload published nothing (27 before, 27 after); a date correction revalidated server-side to 19 ready at revision 2 and still published nothing; publishing the selection reported `19 veröffentlicht · 1 blockiert geblieben · 0 unverändert` and the public API grew by exactly 19, with all 27 earlier records still present and the blocked row's title absent from the catalogue; reload resumed the import. Source and theme controls: disable/enable a source, the configured-versus-implemented distinction, a theme disabled (configuration version 3 → 4) and confirmed gone from public discovery, a CSV-only source added through the form with the adapter note, and a malformed ID refused with its reason.
- **Baseline restored:** after each publication test, `POST /api/admin/reset {"resetDemo": true}` plus `git checkout -- data/` returned the committed baseline — 27 offers (19 reviewed + 8 labelled examples), taxonomy version 3 with 7 interests and four providers. Nothing under `data/` is committed from this branch.
- Screenshots in project files `ishan-design/screens/v5-*.png`: 200% text on both routes, reduced motion, puzzle wrong/retry/solved, after session reset, organizer upload/published/config.

## Fixed in this slice

Three layout defects that only the running app at real sizes showed, all in `c072a22`:

1. The presentation switch ran past the right edge at 360px and 390px and could not be reached at all, because the header row did not wrap and the page has no horizontal scroll. The header now wraps on phones and the switch takes its own row.
2. Segment groups (`.dz-view`: presentation switch, list/map toggle, organizer tabs) could not shrink; they now wrap, cap at 100% width and use fluid padding.
3. The organizer's upload fields had a fixed `min-width: 12rem`, wider than a 360px phone at 200% text — the page overflowed by 106px. Now `min(12rem, 100%)`.

Also raised the "Nur stufenlos" checkbox to the 24px WCAG 2.2 minimum target size.

## Remaining issues

- Not a frontend defect, for the record: re-uploading the same fictional CSV after publishing returns its rows as `unchanged` rather than ready, which is correct, so a publication test needs the reset between runs.
- IPAI's `lastReviewedAt` stays null while its general-adult rows are held, and aim remains `partial`. Both are honest states shown in the source panel, not UI bugs.
- The city map stays schematic until offers carry addresses or coordinates.
- No hosted deployment; writable maintenance stays local behind `INTEREST_ATLAS_LOCAL_DESK=1`.

## Requests to teammates

- ISH-REQ-1 → Umang: **closed, delivered.** `/api/offers`, `/api/taxonomy`, `/api/providers` verified from my pages. The fixture fallback stays as the 404 path only.
- ISH-REQ-2 → Umang: **closed, delivered.** The admin routes work from `/organizer`. Note for everyone: they are local-only behind `INTEREST_ATLAS_LOCAL_DESK=1`; without it the desk correctly shows its "only locally enabled" state.
- ISH-REQ-3 → Umang (small, not blocking): `sourceStatus.message` is English ("15 candidate(s) staged for human review"). The panel now writes its own German sentence from `extractedCount`/`rejectedCount`/`partialCoverage` and shows your message as secondary detail, so nothing is blocked — but a German message, or a localised pair, would let the raw text move up.

- ISH-REQ-4 → Palash (small, not blocking): `discoveryReducer` has no way to undo `complete-puzzle`, and `reset` clears the whole session including the shortlist. Ishan asked for a full quiz/puzzle reset, so the desk now clears the quiz through `set-quiz-answer: null` and tracks the "solved" note in the component. An `uncomplete-puzzle` action, or a `reset-play` that clears `quizAnswers` and `completedPuzzleIds` only, would let the shared state follow the UI. Related: my filter reset now dispatches `clear-filters` rather than `reset`, so resetting filters no longer empties the shortlist.

## Replies to teammates

- **To Umang, on your ISH-REQ-1/ISH-REQ-2 replies: confirmed on my side.** I merged `origin/codex/umang-data` (`1323a19`) with my branch locally — no conflicts, `npm run check` 106/106, `npm run build` clean — and ran both routes against your server with `INTEREST_ATLAS_LOCAL_DESK=1`:
  - `/` loads the real bundle; 24 offers after publication; the status line stays "Demo-Daten" while demo fixtures are in the catalogue, which is the agreed behaviour.
  - `/organizer`: `data/demo-upload.csv` → 18 ready / 2 blocked; the date fix on the blocked row → 19 ready, revision 2; "Ausgewählte veröffentlichen (19)" → **19 veröffentlicht · 1 blockiert geblieben · Katalogversion 3**, and the blocked row is not public.
  - Thanks for the two editor-side server fixes in `8a75c3b` — the date edit and the age/`ageEvidence` re-derivation both behave as you describe.
  - Three things this run found on **my** side, all fixed in `6805780` and `5cbe349`: the publish confirmation was being wiped by the session refresh that follows approval; a reload lost the open import (the desk now stores the import id for the tab and refetches); and the "server missing" copy wrongly said the routes did not exist.
  - New on the results page: a "Woher die Angebote kommen" panel that reports your `sourceStatuses` and `cache` per provider, naming partial coverage explicitly. See ISH-REQ-3.

## Ready slices

- Follow-up slice (Ishan's five items), code SHAs `c52dc94` and `f0d4567` on `codex/ishan-design`.
  - Paths: `src/components/organizer/{OrganizerDesk.tsx,api.ts,organizer.css}`, `src/components/atlas/{Discovery.tsx,PlaySection.tsx,EventCard.tsx,DetailSheet.tsx,ShortlistSheet.tsx,use-dialog.ts,discovery.css,play.css}`, docs/DESIGN.md.
  - What it adds: source/theme add, edit, enable, disable through `POST /api/admin/providers` and `POST /api/admin/topics`; direct KI/Coding/Gaming filters over `filters.topics`; a child/teen/adult presentation switch that only dispatches `set-audience-mode`; quiz back/re-answer/clear plus a combined quiz+puzzle reset; and a shared `useDialog` focus trap for both sheets.
  - Checks run: `npm run check` (62 tests on my branch, 106 with `origin/codex/umang-data` merged), `npm run build`, and 49 headless-Chromium assertions against your live server with `INTEREST_ATLAS_LOCAL_DESK=1` — all passing. Verified live: disable/enable a source, rename one and restore it, an off-host link refused with its reason, a new CSV-only source created, a theme disabled and re-enabled with the configuration version counting up, a new interest added and appearing as a tile on `/`, a malformed ID refused, Tab and Shift+Tab held inside both sheets, Esc returning focus to the opener, and no horizontal scroll at 360px on either route. Screenshots in project files `ishan-design/screens/v4-*.png`.
  - Note for Umang: the browser run writes to `data/taxonomy.json` and `data/providers.json` through your routes, which is the point of the feature — two of your fixture tests assert the seed values, so after a live run `git checkout -- data/` restores them. Nothing in `data/` is committed from my branch.
  - Known gaps: ISH-REQ-4 (shared puzzle completion cannot be undone); the map stays schematic until offers carry addresses.

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
