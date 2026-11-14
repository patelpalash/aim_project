# Implementation status and handoff

Verified 14 November 2026. Plan revision 3 remains the product scope. This file distinguishes implementation from planning.

| Task | State | Evidence/remaining work |
| --- | --- | --- |
| P1 | Implemented and verified | Next.js App Router + React + TypeScript shell, `@/` alias and development/build/start/check commands. Production build, 18 original tests, HTTP 200/404 checks and browser rendering passed. |
| P2 | Implemented and verified | Additive taxonomy/date-only/age evidence contracts, catalog/review runtime validators, pure patch/selection guards and validated fictional examples. All 40 shared tests and the Next production build pass. See `HANDOFF_PALASH.md`. Actual service/storage remains Umang's work. |
| P3 | Implemented and verified as shared behavior | Memory-only reducer/React hook, filter/match/sort, selected detail/shortlist, reset and friendly match reasons. Parent presentation preserves actual activity constraints. UI integration remains Ishan's work. |
| P4 | Implemented and verified as shared behavior | Three-question preference mapping, two pattern variants and a bounded sequence evaluator with real movement traces and feedback. No automatic interest selection or play-based eligibility. Interfaces remain Ishan's work. |
| I1-I6 | Integrated; final acceptance in progress | Ishan's chosen Clean Studio design, discovery/detail/map/parent/shortlist, quiz/puzzle and organizer UI are integrated through `3e9337b`. Keyboard modal containment and maintenance configuration controls remain open in PALASH-005/006. |
| U1-U6 | Backend integrated; final acceptance in progress | Four adapters, cached source runs, public APIs, CSV/review/publication, refresh and maintenance APIs are integrated through `1323a19`. Source snapshots include partial coverage and blocked records honestly. Current provider-review timestamp gap is PALASH-007. |
| P5 | Integration working; verification continues | Checked code `c4b1ab0` combines both branches and integration fixes. 112 tests/type checks and production build pass. Real browser CSV flow publishes 19 reviewed fictional rows after one correction and excludes the unresolved row. Full PDF acceptance is not yet complete. |

The current suite has **112 passing tests** and the production build passes. The running app loads the real public API, with fictional offers explicitly labeled. The actual browser flow kept 8 public offers during draft editing, then returned 27 after selecting/publishing 19 demo rows. No unreviewed real source record was published by this verification. The earlier P1/P2 checks below remain historical evidence for those slices.

Fresh-clone verification of code commit `eedb261` passed on Windows with Node.js `24.18.1` and npm `11.4.2`: `npm ci`, `npm run check` (62/62), `npm run build`, `npm run dev -- --port 3101` and `npm run start -- --port 3102`. Development and production returned HTTP 200 with the German shell; production returned 404 for an unknown route. Git remained clean after both server runs. Servers were stopped after verification. The original demo fixtures and challenge reference files are unchanged from the planning baseline.

## PDF evidence boundary

- R6/R7/R8: shared configurable taxonomy, combined filters and matching are tested; real source classification and the final search/config UI remain open.
- R11/R13/R14: demo links stay null, state resets, and quiz/puzzle choices remain optional and local in the shared implementation. The running final UI/data flow still needs inspection.
- R15: commands, contracts, examples and ownership are documented and verified for this baseline. Do not check off full application acceptance in `DEMO_CHECKLIST.md` until both teammate implementations are integrated.

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
