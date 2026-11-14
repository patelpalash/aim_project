# Implementation status and handoff

Verified 14 November 2026. Plan revision 3 remains the product scope. This file distinguishes implementation from planning.

| Task | State | Evidence/remaining work |
| --- | --- | --- |
| P1 | Implemented and verified | Next.js App Router + React + TypeScript shell, `@/` alias and development/build/start/check commands. Production build, 18 original tests, HTTP 200/404 checks and browser rendering passed. |
| P2 | Implemented and verified | Additive taxonomy/date-only/age evidence contracts, catalog/review runtime validators, pure patch/selection guards and validated fictional examples. All 40 shared tests and the Next production build pass. See `HANDOFF_PALASH.md`. Actual service/storage remains Umang's work. |
| P3/P4 | Planned | Shared discovery state, quiz and puzzle evaluation will follow the contract handoff. |
| I1-I6 | Teammate workstream | Ishan owns all final visual design/frontend. The current page is a minimal bootstrap, not the interactive product. |
| U1-U6 | Teammate workstream | Umang owns live source adapters, CSV/review services and backend. No source adapter/API is implemented by this bootstrap. |
| P5 | Integration workstream | Final public-to-backend integration requires the teammate implementations and full acceptance checks. |

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
