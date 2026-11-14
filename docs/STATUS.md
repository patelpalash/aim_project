# Implementation status and handoff

Verified 14 November 2026. Plan revision 3 remains the product scope. This file distinguishes implementation from planning.

| Task | State | Evidence/remaining work |
| --- | --- | --- |
| P1 | Implemented and verified | Next.js App Router + React + TypeScript shell, `@/` alias and development/build/start/check commands. Production build, 18 original tests, HTTP 200/404 checks and browser rendering passed. |
| P2 | Implemented and verified | Additive taxonomy/date-only/age evidence contracts, catalog/review runtime validators, pure patch/selection guards and validated fictional examples. All 40 shared tests and the Next production build pass. See `HANDOFF_PALASH.md`. Actual service/storage remains Umang's work. |
| P3 | Implemented and verified as shared behavior | Memory-only reducer/React hook, filter/match/sort, selected detail/shortlist, reset and friendly match reasons. Parent presentation preserves actual activity constraints. UI integration remains Ishan's work. |
| P4 | Implemented and verified as shared behavior | Three-question preference mapping, two pattern variants and a bounded sequence evaluator with real movement traces and feedback. No automatic interest selection or play-based eligibility. Interfaces remain Ishan's work. |
| I1-I6 | Teammate workstream | Ishan owns all final visual design/frontend. The current page is a minimal bootstrap, not the interactive product. |
| U1-U6 | Teammate workstream | Umang owns live source adapters, CSV/review services and backend. No source adapter/API is implemented by this bootstrap. |
| P5 | Partially verified; awaiting teammate branches | Shell, shared hook and public loader are checked. Loader validates the three public read contracts against a local HTTP fixture server, including errors/cancellation. Latest remote fetch exposes no Ishan/Umang branch yet. The actual public journey, four adapters and CSV review-to-publication service still need integration and full acceptance checks. |

The current suite has **62 passing tests** and the production build passes. The browser/HTTP evidence for P1 proves only that the shell runs. The HTTP fixture server and fictional offers do not establish live source or backend behavior.

## PDF evidence boundary

- R6/R7/R8: shared configurable taxonomy, combined filters and matching are tested; real source classification and the final search/config UI remain open.
- R11/R13/R14: demo links stay null, state resets, and quiz/puzzle choices remain optional and local in the shared implementation. The running final UI/data flow still needs inspection.
- R15: commands, contracts, examples and ownership are documented and verified for this baseline. Do not check off full application acceptance in `DEMO_CHECKLIST.md` until both teammate implementations are integrated.

## Using the bootstrap

Use Node.js 24 or newer. From the repository root:

```powershell
npm ci
npm run dev
```

The development script binds to loopback at port 3000. Another port can be selected with `npm run dev -- --port 3001`. Ishan can replace the bootstrap page/layout with his visual implementation after incorporating the shared baseline. Do not scaffold a second app over the repository.

```powershell
npm run check
npm run build
npm run start
```

`check` regenerates Next route types, type-checks the project and runs shared tests. `start` serves the production build and requires `build` first. No AI API key, database or hosted deployment is required for this shell. This is a local application/source handoff, not a deployment.
