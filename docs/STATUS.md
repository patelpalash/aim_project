# Implementation status and handoff

Verified 14 November 2026. Plan revision 3 remains the product scope. This file distinguishes implementation from planning.

| Task | State | Evidence/remaining work |
| --- | --- | --- |
| P1 | Implemented and verified | Next.js App Router + React + TypeScript shell, `@/` alias and development/build/start/check commands. Production build, 18 original tests, HTTP 200/404 checks and browser rendering passed. |
| P2 | Implemented and verified | Additive taxonomy/date-only/age evidence contracts, catalog/review runtime validators, pure patch/selection guards and validated fictional examples. All 40 shared tests and the Next production build pass. See `HANDOFF_PALASH.md`. Actual service/storage remains Umang's work. |
| P3 | Implemented and verified as shared behavior | Memory-only reducer/React hook, filter/match/sort, selected detail/shortlist, reset and friendly match reasons. Parent presentation preserves actual activity constraints. UI integration remains Ishan's work. |
| P4 | Implemented and verified as shared behavior | Three-question preference mapping, two pattern variants and a bounded sequence evaluator with real movement traces and feedback. No automatic interest selection or play-based eligibility. Interfaces remain Ishan's work. |
| I1-I6 | Integrated; final acceptance in progress | Ishan's chosen Clean Studio design, discovery/detail/map/parent/shortlist, quiz/puzzle and organizer UI are integrated through `3e9337b`. Modal keyboard containment, quiz navigation/reset, maintenance controls, direct topic filters and teen presentation remain open in PALASH-005/006/008/009. |
| U1-U6 | Backend integrated; final acceptance in progress | Four adapters, cached source runs, public APIs, CSV/review/publication, refresh and maintenance APIs are integrated through `1323a19`. Source snapshots include partial coverage and blocked records honestly. Current provider-review timestamp gap is PALASH-007. |
| P5 | Integration working; verification continues | Checked code `c4b1ab0` combines both branches and integration fixes. 112 tests/type checks and production build pass. Real browser CSV flow publishes 19 reviewed fictional rows after one correction and excludes the unresolved row. Full PDF acceptance is not yet complete. |

The current suite has **112 passing tests** and the production build passes. The running app loads the real public API, with fictional offers explicitly labeled. The actual browser flow kept 8 public offers during draft editing, then returned 27 after selecting/publishing 19 demo rows. No unreviewed real source record was published by this verification. The earlier P1/P2 checks below remain historical evidence for those slices.

Fresh GitHub clone `c4f6deb` passed `npm ci`, `npm run check` (112/112) and `npm run build` on Node.js `24.18.1`/npm `11.4.2`, with a clean working tree. Its production server loaded the catalog through the actual three public endpoints (8 fictional offers, four providers/source statuses). The maintenance template, summary, topic and provider routes returned 404 with the desk disabled. The enabled local server rejected a cross-site write with 403. The temporary clone server was stopped afterward.

Additional running-app evidence: the organizer refreshed IPAI through its real configured adapter, polled the completed run and showed four blocked candidates without publishing them. The refreshed snapshot is `data/source-runs/ipai-latest.json`, run `ipai-20261114T170352`: listing and four detail responses were HTTP 200. Staging the cached aim run opened the common review UI (15 candidates, nine valid but needing review, six blocked), and reload resumed that session. No source rows were approved in this check. The robot sequence accepted a correct command and showed evaluator feedback; the three-question quiz produced optional interest suggestions. An independently verified 390px/reduced-motion journey is still pending; the browser viewport tool reached only 759px, so that observation is not phone-width evidence.

## Remaining functionality

| Owner | Remaining work |
| --- | --- |
| Ishan | Add/edit/enable-disable source and theme controls; their backend routes already exist (PALASH-006). |
| Ishan | Expose direct configurable topic filters, including AI/coding/gaming, alongside existing interest and practical filters (PALASH-008). |
| Ishan | Finish child/teen/adult presentation switching while retaining selected interests, event and shortlist; the adult handoff already works (PALASH-009). |
| Ishan | Quiz Back/edit navigation and a full reset of mounted quiz/puzzle progress; contain modal keyboard focus, restore it on close and verify reduced motion (PALASH-005). |
| Umang | Populate each provider's last-reviewed timestamp from actual approvals, without implying all staged records were reviewed (PALASH-007). |
| Team | Review suitable real source records before publication, resolve blocked fields only from evidence and retain honest partial-coverage labels. Adapters for all four sources already exist; live-data acceptance is still incomplete. |
| Palash | Integrate these fixes, complete the PDF/mobile/accessibility/source-recovery acceptance and prepare the final demo handoff. There is no hosted deployment yet; the writable desk remains local. |

Discovery passport, a second puzzle and missing-opportunity wishes are optional P1 extensions after the core acceptance. An English UI and additional games are lower-priority extras, not implemented functionality.

Fresh-clone verification of code commit `eedb261` passed on Windows with Node.js `24.18.1` and npm `11.4.2`: `npm ci`, `npm run check` (62/62), `npm run build`, `npm run dev -- --port 3101` and `npm run start -- --port 3102`. Development and production returned HTTP 200 with the German shell; production returned 404 for an unknown route. Git remained clean after both server runs. Servers were stopped after verification. The original demo fixtures and challenge reference files are unchanged from the planning baseline.

## PDF evidence boundary

- R6/R7/R8: shared configurable taxonomy, combined filters and matching are tested; direct topic-filter/configuration controls and reviewed real-source discovery remain open.
- R11/R13/R14: demo links stay null, quiz/puzzle choices remain optional and the same selected offer reaches the practical parent view. Full reset still needs to clear mounted play state, and this is not a full privacy/accessibility compliance claim.
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
