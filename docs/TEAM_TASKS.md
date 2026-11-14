# Three-person execution board

Consolidated plan revision 3, one day. This is the assignment for **Palash + ChatGPT**, **Ishan + Claude** and **Umang + Claude**. Read [PLAN.md](PLAN.md), [REQUIREMENTS.md](REQUIREMENTS.md), [CONTRACT.md](CONTRACT.md), [EXPERIENCE.md](EXPERIENCE.md), [SCRAPING_PLAN.md](SCRAPING_PLAN.md) and [IMPORT_WORKFLOW.md](IMPORT_WORKFLOW.md).

## Ownership

| Person | Owns | Does not independently replace |
| --- | --- | --- |
| Palash + ChatGPT | Shared behavior/model, shell/root tooling, integration and final verification | Ishan's art direction or Umang's source adapter/service implementation |
| Ishan + Claude | All design and frontend, motion, puzzle views and organizer UI | Shared schema, root lockfile or a parallel server |
| Umang + Claude | Four source adapters, CSV intake, normalization/review services, APIs/cache/storage and provider data | Visual design or a second incompatible event model |

## Work packages and acceptance

| ID | Owner | Deliverable | Done when | Handoff |
| --- | --- | --- | --- | --- |
| P1 | Palash | In-place Next.js shell, alias, run/build/check commands | App starts without overwriting shared starter/docs; root setup is available for Ishan | H1 |
| P2 | Palash | Shared contract alignment for taxonomy, date-only precision, age evidence and review sessions | One example catalog/review payload is agreed; both consumers know required fields and limits | H1-H2 |
| P3 | Palash | Memory-only discovery/shortlist state, filters and matching | Interests/constraints change actual results; state survives view switches; reset clears it | H3-H5 |
| P4 | Palash | Three-question quiz and small pattern/sequence evaluators | Deterministic outcomes, useful feedback, no user-code execution; suggested interests require user choice | H3-H5 |
| P5 | Palash | Integration and final verification | Public journey plus scrape/CSV review-to-publication work; relevant checks/build pass; final gaps are named | H5-H12 |
| I1 | Ishan | One art direction and motion rules | Coherent discovery/detail/parent/organizer designs, phone/laptop plan and reduced-motion behavior | H1 |
| I2 | Ishan | Discovery/vision board, results and filters | Direct browse/search and visual selection work with the same catalog; loading/empty/error states exist | H3-H5 |
| I3 | Ishan | Contextual details, shortlist and parent view | Selection/filter context survives transitions; actual practical facts and provenance are readable | H5 |
| I4 | Ishan | Quiz and compact puzzle interfaces | Skip/back/retry and keyboard/touch work; feedback leads to relevant events; no game-only access gate | H5-H7 |
| I5 | Ishan | Review/Upload and Sources/Themes UI | Template download/upload, row status, inline edit and selected valid publication use agreed APIs; config/source errors are understandable | H7-H9 |
| I6 | Ishan | Interaction polish and accessible states | Essential motion, reduced motion, focus, larger text, touch and phone/laptop flow checked in running app | H9-H11 |
| U1 | Umang | Adapter/normalization boundary and first actual upcoming record | Exact source record/evidence reaches a validated staged row and agreed read response | H2-H3 |
| U2 | Umang | Four provider adapters | Each source outcome is evidenced; qualifying records have correct dates/audience; failed/partial is distinct from valid empty | H5-H9 |
| U3 | Umang | CSV template/upload into the same normalization core | Fixed-column UTF-8 CSV parses; 20-row demo has expected valid/blocked results; no separate event store | H3-H5 |
| U4 | Umang | Draft read/edit/review/selected publication service | Revalidation, stable IDs, revision checks, invalid-row blocking, repeat-import behavior and atomic publication work | H5-H7 |
| U5 | Umang | Catalog cache, source/config status and recovery | Last good catalog survives failures; source/theme controls have real backing storage; reset and cached fallback work | H7-H9 |
| U6 | Umang | Parser/service evidence and tests | Real source sample checked; date/age/cost, reschedule, duplicate, stale approval and failed/empty source cases verified | H9-H11 |

Times are working estimates, not promises that unfinished work is complete. All four institutions remain target scope. If required coverage is unfinished, record the requirement gap and use the last good snapshot honestly.

## Dependency and integration checkpoints

- **H1:** Palash publishes the minimal shell/contract alignment. Ishan uses the first hour for visual direction; Umang investigates sources independently.
- **H3:** Umang supplies one working catalog response and a sample review session. Ishan can build earlier with the common fixtures; one loader replaces fixtures with API data.
- **H5:** Merge a working public discovery/detail/parent journey. CSV and scraping use one staging model.
- **H7:** A real source refresh and a CSV correction can both reach reviewed publication. Show one invalid row remaining unpublished.
- **H9:** Freeze features. Complete remaining required fixes, not new channels.
- **H9-H12:** Check the PDF acceptance map, run relevant checks/build, verify a clean clone and rehearse live/cached flows.

Use branches from `CONTRIBUTING.md`, commit small slices and hand off actual examples/checks. Palash integrates root dependencies and shared contract changes once. A handoff should state: task ID, commit/branch, changed files, example input/output, checks actually run and remaining work.

## Scope protection

Core: interactive discovery/motion, direct overview/search, real source data, parent handoff, optional-to-use quiz/puzzles, CSV template/preview/edit/selected publication, and simple source/theme maintenance.

After core works: session passport, second/extra puzzle variants, fixed-choice wish information or an English toggle. If time is short, ship one polished puzzle before adding another; preserve required data/search/maintenance/privacy work and coherent core transitions.

Deferred: PDF/LLM ingestion, email forwarding, arbitrary link fetching, XLSX parsing, learned column mappings, automatic publication, geographic heat maps and a large standalone gaming area. Do not implement the alternative plan wholesale.

## Ready-to-paste role prompts and task sheets

- [Palash prompt](prompts/PALASH_CHATGPT.md) and [Palash task sheet](tasks/PALASH.md)
- [Ishan prompt](prompts/ISHAN_CLAUDE.md) and [Ishan task sheet](tasks/ISHAN.md)
- [Umang prompt](prompts/UMANG_CLAUDE.md) and [Umang task sheet](tasks/UMANG.md)
