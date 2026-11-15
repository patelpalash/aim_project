# Implementation status and handoff

## 15 November redesign publication and next owner

The interactive redesign at `20c4e62`, including the earlier `166f6b8` and `51ef1a6`, is prepared for main through `codex/atlas-redesign-handoff`. It includes Ishan's language commits `71f18df`/`f76de4c`, the cream/forest/orange frontend, working topic island, five event-taster types, persistent Skip and source handoff. Production build/TypeScript and the documented targeted browser checks passed; see [redesign handoff](LOCAL_REDESIGN_HANDOFF.md) and [QA](../design-qa.md). Cached source coverage limitations remain unchanged; no hosted deployment is claimed.

The user explicitly authorized publishing this version, superseding the earlier local-only instruction. Ishan's next work is [this five-part prompt](prompts/ISHAN_NEXT_ITERATION.md): improve whole-page scale and hero; fix DE/EN behaviour; complete/administer the existing organizer journey; build a simple separate parent list; replace the logo. These are remaining work, not claims about the published baseline. The organizer already exists: `/organizer` and the enabled local `/api/admin/summary` returned HTTP 200, with 19 real records in the summary; this read-only inspection did not re-test publication writes.

Publication validation: `npm run check` passed route generation, TypeScript and **132/132 tests** on this redesign; the preceding production build at `20c4e62` also passed. Only handoff documentation changed after that build.

The sections below record earlier integration/rehearsal evidence, not proof that the five new requests are complete.

Final integration and demo rehearsal: 14 November 2026. Plan revision 3 remains the product scope. This file distinguishes implemented and verified behaviour from what is still open.

**Temporary integration owner:** Umang + Claude ran this final integration and rehearsal because Palash's Codex session hit its usage limit. Ownership is unchanged: Ishan owns all design/frontend, Palash owns shared contracts/root tooling and `main` integration, Umang owns `src/server/`, `src/app/api/` and `data/`.

| Task | State | Evidence/remaining work |
| --- | --- | --- |
| P1-P4 | Implemented and verified | Next.js shell, shared contracts (taxonomy, date-only, age evidence, review), memory-only discovery state, quiz and sequence puzzle evaluators. Covered by the 123-test suite. |
| I1-I6 | Integrated through `7aa6ae5` | Discovery/detail/map/shortlist/parent view, child/teen/adult presentation, direct topic filters, quiz with back/edit, robot-path puzzle, organizer desk with source/theme maintenance, dialog keyboard handling. No newer reported Ishan commit exists on `origin/codex/ishan-design`. |
| U1-U6 | Implemented and verified | Four live adapters (stage-only), shared normalization/review/publication service, CSV intake, public and local-desk APIs, reviewed baseline with decision ledger, German source statuses. |
| P5 | Integrated and rehearsed | Final checks below. No hosted deployment. |

## Final rehearsal evidence (actually run)

Checked commit: the merge of `origin/main` `7fef39b` into `codex/umang-data` (`a6d9bd8`), in a fresh git worktree with its own `npm ci`, on Node.js 24.22.3 / npm 10.9.9 (Linux).

- `npm ci`, `npm run check` (typegen + `tsc`, **123/123 tests**) and `npm run build` (no warnings) passed; the worktree stayed clean.
- **Catalog read from the API** (`GET /api/offers`): 27 offers = **19 reviewed real** (aim 8, experimenta 1, Haus der Familie 10) + **8 labelled fictional examples**; `mode: "demo"` because examples are present. Every real offer is approved with a provider URL and review time; every example keeps null source/registration URLs.
- **Re-reviewed courses:** `aim-271430cyc1` Craft Your City (`build-worlds`) and `aim-271420fe` Code your Chat (`build-apps`) are published, review time `2026-11-14T18:48:52.317Z`.
- **Review times / statuses:** `lastReviewedAt` equals each provider's newest approval (aim 18:48:52Z; experimenta and Haus der Familie 17:41:56Z; IPAI `null`). All four status messages are German. aim is `partial` (page cap stated), experimenta `reviewed`, Haus der Familie and IPAI `review-needed`; `rejectedCount` excludes rows corrected and published in review.
- **Holds:** the 12 held decisions in `data/catalog/review-decisions.json` are absent from the public catalog. A ledger dry run against current runs reports 19 approved / 12 held with no changed facts.
- **Source failure:** the real IPAI adapter run with every response returning HTTP 503 reported `failed`, did not overwrite `ipai-latest.json` (same hash), left the public catalog at 27/19, and the API showed IPAI `error` with separate last-attempt and last-success times and "Die letzte Aktualisierung ist fehlgeschlagen; angezeigt wird der letzte erfolgreiche Lauf." (The outage was simulated at the HTTP layer; a proxy-based outage attempt did not block the container's network.) A real live IPAI and experimenta refresh also ran successfully.
- **CSV over HTTP:** template download; `data/demo-upload.csv` 18 valid / 2 blocked; inline date fix → revision 2, 19 ready; stale edit 409; public catalog unchanged before approval; blocked row approval 400; stale approval 409; publishing 19 → 19 published / 1 blocked; repeat approval returns the identical result; public +19 with `aim-demo-csv-15` excluded; re-import 18 unchanged / 2 blocked, no duplicates. Source-run staging creates a review session and publishes nothing. Cross-site write → 403.
- **Reset:** `POST /api/admin/reset` restored the reviewed baseline (27 = 19 real + 8 examples) and bumped the catalogue version.
- **Public configuration:** without `INTEREST_ATLAS_LOCAL_DESK`, all 8 maintenance routes tested returned 404; public API, `/` and `/organizer` returned 200.
- **Visitor journey (Chromium, 1280 px, 16/16):** status line "19 geprüfte Angebote · 8 Demo-Beispiele (erfunden)" matches the API; per-card Geprüft/Demo labels; interest tile, topic filter and search combine; detail shows "Geprüfte Quelle", provider link and review time; Tab/Shift+Tab stay inside the dialog and Escape returns focus; save, child/teen/adult switching keeps shortlist and query; parent view lists the saved real offer with date; quiz completes with optional suggestions; puzzle evaluates input ("Deine Befehle führen zum Ziel!"); reset-play keeps the shortlist; full-session reset clears it; only `GET /api/offers|taxonomy|providers` are requested; no console/page errors.
- **Organizer journey (Chromium):** CSV upload 20 rows/18 selectable, inline date fix → 19, publish result stays visible ("19 veröffentlicht · 1 blockiert geblieben"); live experimenta refresh polled to "beendet"; all four sources show "Adapter vorhanden"; "Änderungen prüfen" opens a source review session without publishing; a theme was added (version +1), an invalid ID refused with German feedback, and the theme disabled with its ID kept.
- **Phone (iPhone 13 profile, 390 px, reduced motion):** no horizontal scroll on `/` and `/organizer`; detail sheet opens by tap and fits; save by tap works. Under reduced motion entrance animations run at 0.001 s and cards use a 0.12 s opacity-only fade (no movement).
- **Keyboard (1280 px):** first Tab reaches the skip link on both routes; 25 consecutive tab stops per route have visible focus (search field: accent border and 4 px ring).

Not verified in that rehearsal: colour contrast measurement, 200 % text zoom, slow-network/offline behaviour, screen-reader output, a usability session with a nontechnical organizer, and hosted deployment. The follow-up rehearsal below closes the text-zoom and slow-network items.

## Follow-up rehearsal: Ishan's final frontend acceptance integrated

Checked commit `35050b5` — `origin/main` `a7b4f83` plus Ishan's reported `c072a22`/`616483f` merged into `codex/umang-data`. Node.js 24.22.3. `npm run check` (**123/123**) and `npm run build` pass.

- **Integrated and preserved:** mixed-catalog wording from record provenance, per-card Demo/Geprüft labels, source-refresh polling, source-to-review staging, topic/source maintenance controls, shared `reset-play`, the separate full-session reset, and the existing quiz, puzzle, audience and shortlist behaviour. Ishan's merge changed only three CSS files and his own coordination report; no shared or server code moved.
- **Ishan's frontend acceptance (owner-reported, code `c072a22`, 100 browser assertions):** `/` and `/organizer` at 360/390/768/1024/1440 px with no horizontal overflow and every control inside the viewport at >=24x24 px; **200 % text** (32 px root) at 360 px on both routes; reduced motion leaves nothing transparent; both sheets contain Tab and Shift+Tab and restore focus; quiz skip/back/re-answer; puzzle wrong → retry → correct; play reset versus full-session reset. It fixed three real defects: the audience switch ran off a 360/390 px viewport and was unreachable, segment groups could not shrink, and the organizer's 12rem upload fields overflowed a 360 px phone by 106 px at 200 % text.
- **Backend rehearsal re-run on this merge (34 API checks):** both re-reviewed courses still published with their new interests and review time `2026-11-14T18:48:52.317Z`; all four German source statuses accurate (aim `partial` with the page cap, experimenta `reviewed`, Haus der Familie and IPAI `review-needed`, IPAI `lastReviewedAt` still `null` with all four events held); a live IPAI refresh **failed** (`Overview https://ipai-foundation.ai/#events: fetch failed`) and the catalogue stayed at 27 with status `error` and a German explanation; an arbitrary provider/URL refused (400); CSV template headers; 18 ready / 2 blocked; a genuinely stale edit **and** a stale approval both 409 with `STALE_REVISION` and nothing published; correction → revision 2, 19 ready; publishing the selection → 19 published / 1 blocked, catalogue 27 → 46, every earlier record kept, the blocked row absent, and the published CSV rows labelled demo with null source URLs; repeat approval adds no duplicates; re-import reports 18 unchanged; `POST /api/admin/reset` restored 27 = 19 + 8 twice in a row with taxonomy v3 intact; cross-site write 403.
- **Slow loading, empty results and a failed catalogue (newly verified):** a 2.5 s delay on every `/api/**` request shows the busy skeleton and "Katalog wird geladen…" before the catalogue arrives; a search with no matches shows "Dazu gibt es gerade nichts" with a way back; an HTTP 500 on `/api/offers` shows "Nicht geladen" plus the error panel and **zero cards**, so fixtures are never silently substituted.
- **Visitor journey with every non-local request blocked:** the whole path (topic → interest → reviewed card → detail with its provider link and review time → save → "Erwachsenen zeigen" → parent facts) completed with **no external host contacted**.
- **Organizer journey:** an experimenta refresh from the desk reported its run and published nothing (27 → 27); topic and source maintenance controls present and working.
- **Still not verified:** measured colour contrast, screen-reader output, a usability session with a nontechnical organizer, a run with the network physically disabled, and hosted deployment.

Evidence screenshots are in the shared project files under `ishan-design/screens/` (`v5-*` for the frontend acceptance, `v6-*` for this integration rehearsal).

## Site languages (German and English)

Added after the rehearsal, on `codex/ishan-design` at `71f18df`. The whole interface exists in German and English, switched with a visible DE/EN control in the header of `/` and `/organizer`. German is the source language and the fallback, so a missing English string shows the German text rather than a key. Offer titles and summaries, taxonomy labels, quiz questions and puzzle messages were already bilingual in the shared contracts and are now read in the chosen language; the recommender's reasons and the parent handoff take the locale instead of a hardcoded `"de"`; dates, times, ages, prices and timestamps format per locale and stay in Europe/Berlin. The choice is kept in that browser only (`localStorage`), defaults to German, and picks English only for an English browser; it also sets `<html lang>`.

Verified in the running app with 56 headless-Chromium assertions (German browser → German site, English browser → English site, every visitor and organizer surface in both, runtime switching keeping the shortlist, interests and filters, the choice surviving a reload, 360px in English with no horizontal overflow including at 200% text). Deliberately unchanged: source-run messages from the backend stay German (ISH-REQ-3 requires that) and are shown as secondary detail under a translated status line; the CSV template header stays fixed. Open: no translator has reviewed the English copy, and the desk's title field still edits the German title only.

## Decisions before the demo (history)

- **UMANG-003:** keep the eight labeled examples for this prototype. No backend removal or mode/schema change is requested. The public copy now describes mixed, example-only, reviewed-only and empty catalogs accurately; per-card demo labels and null demo booking/source URLs stay intact.
- **UMANG-004 complete:** Umang re-fetched and checked both aim detail pages, confirmed title/date/time/fee, and approved source-quoted interest corrections. Craft Your City (`aim-271430cyc1`) is approved under `build-worlds` with the gaming topic; Code your Chat (`aim-271420fe`) is approved under `build-apps`, with AI/coding topics supported by the source text. Their publication-review time is `2026-11-14T18:48:52.317Z`. The updated baseline retains the original 17 offers' `17:41:56Z` review time; re-applying the ledger was reported idempotent. Twelve records remain held for source-evidence reasons. Future normalization rules recognize the new interests without assigning `build-apps` to generic Python courses.
- **ISH-REQ-4:** added `reset-play`, which clears quiz answers and puzzle completions while preserving filters, audience, selected event and shortlist. The UI uses it directly; a separate visible full-session reset also clears preferences/shortlist and remounts play state. Browser checks confirmed the solved note stays cleared after switching adult/child and the shortlist survives play reset but clears on full reset. Detail-dialog Tab/Shift+Tab containment and Escape/focus return passed.

Earlier fictional CSV verification data was backed up locally before the reset endpoint restored the committed reviewed baseline. Before applying UMANG-004 locally, the 17-real runtime catalog was backed up again. The normal reset then loaded the new 19-real-plus-eight-demo baseline (catalogue version 3). Runtime state remains ignored.

Fresh GitHub clone `c566abe` passed `npm ci`, the then-current 118 checks and production build on Node.js 24.18.1; it returned the then-current 25-offer baseline. After integrating Umang's `213635a` and `796e438` commits, the current checkout passed a fresh `npm ci`, all 123 checks and production build. The standard `/api/admin/reset` route refreshed the local catalog to 27, including both new IDs; `/` and `/api/offers` return HTTP 200 and the expected 27 offers. No fresh-clone install has been run after the latest integration merge.

## Earlier verification

The 112-check/CSV-count evidence below describes the earlier integrated baseline, before the reviewed real records were added. It is historical evidence, not the current public catalog count.

Fresh GitHub clone `c4f6deb` passed `npm ci`, `npm run check` (112/112) and `npm run build` on Node.js `24.18.1`/npm `11.4.2`, with a clean working tree. Its production server loaded the catalog through the actual three public endpoints (8 fictional offers, four providers/source statuses). The maintenance template, summary, topic and provider routes returned 404 with the desk disabled. The enabled local server rejected a cross-site write with 403. The temporary clone server was stopped afterward.

Additional running-app evidence: the organizer refreshed IPAI through its real configured adapter, polled the completed run and showed four blocked candidates without publishing them. The refreshed snapshot is `data/source-runs/ipai-latest.json`, run `ipai-20261114T170352`: listing and four detail responses were HTTP 200. Staging the cached aim run opened the common review UI (15 candidates, nine valid but needing review, six blocked), and reload resumed that session. No source rows were approved in this check. The robot sequence accepted a correct command and showed evaluator feedback; the three-question quiz produced optional interest suggestions. An independently verified 390px/reduced-motion journey is still pending; the browser viewport tool reached only 759px, so that observation is not phone-width evidence.

## Remaining functionality (updated at final rehearsal)

| Owner | Remaining work |
| --- | --- |
| Team | After each source refresh run `node src/server/review/apply-review.ts --dry-run`; rows whose facts changed are held for a fresh human review. Held categories stay held: running series with closed registration, online venues (no online-venue extension yet), general-adult IPAI events, out-of-scope records. aim coverage stays labelled partial while the page cap is reached. |
| Ishan | Optional, non-blocking polish from the rehearsal: the "Nur stufenlos" checkbox is 20 px (inside a clickable label) and the inline "Organizer-Bereich" link is 19 px tall. Contrast and 200 % zoom have not been measured. |
| Palash | Resume `main` integration ownership; no hosted deployment exists and writable maintenance must stay local. |

Discovery passport, a second puzzle and missing-opportunity wishes are optional P1 extensions after the core acceptance. An English UI and additional games are lower-priority extras, not implemented functionality.

Fresh-clone verification of code commit `eedb261` passed on Windows with Node.js `24.18.1` and npm `11.4.2`: `npm ci`, `npm run check` (62/62), `npm run build`, `npm run dev -- --port 3101` and `npm run start -- --port 3102`. Development and production returned HTTP 200 with the German shell; production returned 404 for an unknown route. Git remained clean after both server runs. Servers were stopped after verification. The original demo fixtures and challenge reference files are unchanged from the planning baseline.

## PDF evidence boundary

- R6/R7/R8: direct topic filters, configuration controls and reviewed source discovery are integrated. The two new interests have now been applied to the source-reviewed aim records; public discovery returns both events with their real topics.
- R11/R13/R14: demo links stay null, play remains optional, the selected offer reaches the practical parent view and explicit play/session resets are connected. This is not a full privacy/accessibility compliance claim.
- R15: the integrated GitHub clone install/check/build/start and actual ownership boundaries are verified. Other application acceptance remains open in `DEMO_CHECKLIST.md`.

## Running the integrated application

Use Node.js 24 or newer. From the repository root:

```bash
npm ci
npm run build
INTEREST_ATLAS_LOCAL_DESK=1 npm run start
```

PowerShell: `npm ci; npm run build; $env:INTEREST_ATLAS_LOCAL_DESK = "1"; npm run start`.

- Visitors: http://127.0.0.1:3000 · Organizer desk: http://127.0.0.1:3000/organizer (binds to loopback only).
- Without `INTEREST_ATLAS_LOCAL_DESK=1` every maintenance route returns 404 (public read-only configuration). Local writes also reject cross-site origins and non-local hosts. Keep it unset on any public hosting.
- Reset the demo to the committed reviewed baseline (local desk only): `curl -X POST -H "content-type: application/json" -d "{\"resetDemo\":true}" http://127.0.0.1:3000/api/admin/reset`. There is no reset button in the desk UI.
- `npm run dev` starts the development server on the same port. `npm run check` regenerates route types, type-checks and runs the 123 tests.
- No AI API key, database or hosted deployment is required. Runtime state (`data/catalog/published-offers.json`, `data/review-sessions/`) is git-ignored; source refreshes and theme/source edits write tracked files under `data/`, so review `git status` before committing after a demo.
