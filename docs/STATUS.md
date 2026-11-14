# Implementation status and handoff

Verified 14 November 2026. Plan revision 3 remains the product scope. This file distinguishes implementation from planning.

| Task | State | Evidence/remaining work |
| --- | --- | --- |
| P1 | Implemented and verified | Next.js App Router + React + TypeScript shell, `@/` alias and development/build/start/check commands. Production build, 18 original tests, HTTP 200/404 checks and browser rendering passed. |
| P2 | Implemented and verified | Additive taxonomy/date-only/age evidence contracts, catalog/review runtime validators, pure patch/selection guards and validated fictional examples. All 40 shared tests and the Next production build pass. See `HANDOFF_PALASH.md`. Actual service/storage remains Umang's work. |
| P3 | Implemented and verified as shared behavior | Memory-only reducer/React hook, filter/match/sort, selected detail/shortlist, reset and friendly match reasons. Parent presentation preserves actual activity constraints. UI integration remains Ishan's work. |
| P4 | Implemented and verified as shared behavior | Three-question preference mapping, two pattern variants and a bounded sequence evaluator with real movement traces and feedback. No automatic interest selection or play-based eligibility. Interfaces remain Ishan's work. |
| I1-I6 | Follow-up integrated; final acceptance in progress | Ishan's design and five-part follow-up are integrated through `7aa6ae5`: source/theme controls, direct topics, audience presentation, quiz navigation and modal keyboard handling. Source refresh polling/review staging are preserved in the merge. Shared play reset and full-session reset are connected in `ad09f52`. |
| U1-U6 | Latest source-review slice integrated; final acceptance in progress | Integrated Umang's `213635acb0096b477193d7a0ee7c5d987a9412de` and source-status follow-up `796e438e7df6f7b25027092c67397f8b85a5f135`: 19 evidence-reviewed real offers, 12 retained holds, per-provider review times, German source status messages and corrected review counts. |
| P5 | Integration working; final acceptance continues | Integrated merge `15a869ebce765cf24d393ba90653be26d85a6a93` includes both teammate slices and Umang's latest status work. On Node.js 24.18.1, `npm ci`, `npm run check` (123/123) and `npm run build` pass. The running API is 27 offers: 19 reviewed real and eight fictional. Final PDF/mobile/accessibility acceptance is incomplete. |

The integrated source-status changes add German, structured messages and distinguish corrected-and-published rows from unresolved blocked rows. On Node.js 24.18.1, a fresh `npm ci`, `npm run check` (123/123 tests), and `npm run build` pass. The running production site at `http://127.0.0.1:3000` returns HTTP 200 and the API returns **27 offers: 19 reviewed real records plus eight unchanged fictional fixtures**. The catalog reports taxonomy version 3 and actual approval times: aim `2026-11-14T18:48:52.317Z`, experimenta and Haus der Familie `2026-11-14T17:41:56.325Z`, IPAI `null`. The homepage count is **19 geprüfte Angebote · 8 Demo-Beispiele (erfunden)**. The checked-in screenshot below predates UMANG-004 and shows the former 17/8 count; it is historical visual evidence only. API `mode: demo` still means examples are present; it does not mean every record is fictional. Source coverage and review timestamps remain separate from catalog composition.

## Decisions before the demo

- **UMANG-003:** keep the eight labeled examples for this prototype. No backend removal or mode/schema change is requested. The public copy now describes mixed, example-only, reviewed-only and empty catalogs accurately; per-card demo labels and null demo booking/source URLs stay intact.
- **UMANG-004 complete:** Umang re-fetched and checked both aim detail pages, confirmed title/date/time/fee, and approved source-quoted interest corrections. Craft Your City (`aim-271430cyc1`) is approved under `build-worlds` with the gaming topic; Code your Chat (`aim-271420fe`) is approved under `build-apps`, with AI/coding topics supported by the source text. Their publication-review time is `2026-11-14T18:48:52.317Z`. The updated baseline retains the original 17 offers' `17:41:56Z` review time; re-applying the ledger was reported idempotent. Twelve records remain held for source-evidence reasons. Future normalization rules recognize the new interests without assigning `build-apps` to generic Python courses.
- **ISH-REQ-4:** added `reset-play`, which clears quiz answers and puzzle completions while preserving filters, audience, selected event and shortlist. The UI uses it directly; a separate visible full-session reset also clears preferences/shortlist and remounts play state. Browser checks confirmed the solved note stays cleared after switching adult/child and the shortlist survives play reset but clears on full reset. Detail-dialog Tab/Shift+Tab containment and Escape/focus return passed.

Earlier fictional CSV verification data was backed up locally before the reset endpoint restored the committed reviewed baseline. Before applying UMANG-004 locally, the 17-real runtime catalog was backed up again. The normal reset then loaded the new 19-real-plus-eight-demo baseline (catalogue version 3). Runtime state remains ignored.

Fresh GitHub clone `c566abe` passed `npm ci`, the then-current 118 checks and production build on Node.js 24.18.1; it returned the then-current 25-offer baseline. After integrating Umang's `213635a` and `796e438` commits, the current checkout passed a fresh `npm ci`, all 123 checks and production build. The standard `/api/admin/reset` route refreshed the local catalog to 27, including both new IDs; `/` and `/api/offers` return HTTP 200 and the expected 27 offers. No fresh-clone install has been run after the latest integration merge.

## Earlier verification

The 112-check/CSV-count evidence below describes the earlier integrated baseline, before the reviewed real records were added. It is historical evidence, not the current public catalog count.

Fresh GitHub clone `c4f6deb` passed `npm ci`, `npm run check` (112/112) and `npm run build` on Node.js `24.18.1`/npm `11.4.2`, with a clean working tree. Its production server loaded the catalog through the actual three public endpoints (8 fictional offers, four providers/source statuses). The maintenance template, summary, topic and provider routes returned 404 with the desk disabled. The enabled local server rejected a cross-site write with 403. The temporary clone server was stopped afterward.

Additional running-app evidence: the organizer refreshed IPAI through its real configured adapter, polled the completed run and showed four blocked candidates without publishing them. The refreshed snapshot is `data/source-runs/ipai-latest.json`, run `ipai-20261114T170352`: listing and four detail responses were HTTP 200. Staging the cached aim run opened the common review UI (15 candidates, nine valid but needing review, six blocked), and reload resumed that session. No source rows were approved in this check. The robot sequence accepted a correct command and showed evaluator feedback; the three-question quiz produced optional interest suggestions. An independently verified 390px/reduced-motion journey is still pending; the browser viewport tool reached only 759px, so that observation is not phone-width evidence.

## Remaining functionality

| Owner | Remaining work |
| --- | --- |
| Team | Reconcile source refreshes against recorded review decisions, retaining closed/in-progress, unsupported online and general-adult holds and honest page-cap/partial-coverage labels. |
| Palash + Ishan | Finish connected mobile, reduced-motion and accessibility acceptance/rehearsal. Ishan reports 49 browser assertions and 360px checks for his follow-up; Palash has independently checked composition, configured interests, topic/mode preservation, reset and detail-dialog keyboard behavior, not the entire phone journey. |
| Palash | Final demonstration rehearsal/handoff. The latest integrated clean-clone setup is verified above. There is no hosted deployment; writable maintenance stays local. |

Discovery passport, a second puzzle and missing-opportunity wishes are optional P1 extensions after the core acceptance. An English UI and additional games are lower-priority extras, not implemented functionality.

Fresh-clone verification of code commit `eedb261` passed on Windows with Node.js `24.18.1` and npm `11.4.2`: `npm ci`, `npm run check` (62/62), `npm run build`, `npm run dev -- --port 3101` and `npm run start -- --port 3102`. Development and production returned HTTP 200 with the German shell; production returned 404 for an unknown route. Git remained clean after both server runs. Servers were stopped after verification. The original demo fixtures and challenge reference files are unchanged from the planning baseline.

## PDF evidence boundary

- R6/R7/R8: direct topic filters, configuration controls and reviewed source discovery are integrated. The two new interests have now been applied to the source-reviewed aim records; public discovery returns both events with their real topics.
- R11/R13/R14: demo links stay null, play remains optional, the selected offer reaches the practical parent view and explicit play/session resets are connected. This is not a full privacy/accessibility compliance claim.
- R15: the integrated GitHub clone install/check/build/start and actual ownership boundaries are verified. Other application acceptance remains open in `DEMO_CHECKLIST.md`.

## Running the integrated application

Use Node.js 24 or newer. From the repository root:

```powershell
npm ci
npm run dev
```

The development script binds to loopback at port 3000. Another port can be selected with `npm run dev -- --port 3001`. Keep the existing shared application; do not scaffold a second app over the repository.

Ishan's visual application is now integrated at `/`; the review desk is `/organizer`. To enable its local maintenance routes in PowerShell, set `$env:INTEREST_ATLAS_LOCAL_DESK = "1"` before `npm run dev` or `npm run start`. With the flag absent, writes return 404. Local writes also reject cross-site origins and nonlocal destinations. Keep maintenance disabled on public hosting until proper access control/storage exists.

```powershell
npm run check
npm run build
npm run start
```

`check` regenerates Next route types, type-checks the project and runs shared tests. `start` serves the production build and requires `build` first. No AI API key, database or hosted deployment is required for this shell. This is a local application/source handoff, not a deployment.
