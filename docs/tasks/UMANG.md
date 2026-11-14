# Umang + Claude: scraping and backend assignment

Use plan revision 3 and task IDs **U1-U6** in [TEAM_TASKS.md](../TEAM_TASKS.md). Read [SCRAPING_PLAN.md](../SCRAPING_PLAN.md), [IMPORT_WORKFLOW.md](../IMPORT_WORKFLOW.md), [CONTRACT.md](../CONTRACT.md) and the PDF requirement map. The user-confirmed permission covers the four named institutions' public course/event pages.

## Own

Four source adapters, source evidence, normalization/upcoming logic, CSV template/upload, draft/edit/approval services, APIs/cache/storage, provider/theme persistence and scraper/service tests. Work in `src/server/`, `src/app/api/`, `data/` and service tests. Ishan owns all design/frontend; Palash owns root tooling/shared contract/integration.

## Build in this order

1. Define the adapter/normalization boundary and deliver the first actual qualifying upcoming record with source evidence and a working read response by H2-H3.
2. Implement/check all four adapters. Use actual public responses/rendered pages where needed; distinguish failed, partial, valid empty and reviewed outcomes. The source notes already identify static and dynamic entry points.
3. Implement one UTF-8 CSV template/upload into the same normalization/staging core. Select provider once; preserve unknowns and source age wording. No Excel/PDF/LLM/email parser is required.
4. Implement server-stored review sessions with stable row IDs, row states/diffs, inline correction, revalidation, revision checks and selected publication. Published events remain unchanged until approval.
5. Back refresh/status/config controls with the same catalog store, last-good-cache recovery, readable source errors and repeatable reset.
6. Verify source parsers and review behavior, spot-check real record facts and support rehearsal.

## Rules that must hold

- Provider record/occurrence identity is stable across title changes and reschedules; do not use mutable title/date hashes as the primary key.
- "ab 10 Jahren" is a minimum, not 10-14. Unknown cost is not zero. Date-only input retains precision. Parent/school-only events do not become child offerings.
- New and materially changed records are reviewed; no auto-publication after one successful scrape. A missing event or zero-result parser run never silently cancels/deletes the catalog.
- CSV and scraping share validation/review/publication. Blocked rows cannot publish, only selected valid reviewed rows can. Stale session/catalog revisions return 409; repeat approval/import is idempotent.
- Source URLs/hosts are restricted to configured providers. Keep evidence separate from selected public fields and writable maintenance routes local.
- All four institutions remain target scope. One working adapter is an early milestone; an unfinished adapter is a named requirement gap.

## Demo fixture and acceptance

Create a clearly fictional 20-row CSV with stable IDs, dates suitable for the rehearsal clock, 18 valid rows and two blocked rows. Demonstrate one inline correction, publication of 19 reviewed rows, the remaining blocked row staying unpublished and no duplicates on re-import. Preserve demo labeling and null real-registration links.

Also demonstrate a real scraped record through the same service. Verify changed dates/titles, recurrence, invalid fields, stale approval, source failure/empty distinction and cached fallback. No time-saving benchmark or citywide demand claim is established by these demos.

## Handoff

Use `codex/umang-data`. Supply Ishan/Palash a catalog response and review-session example by H3. Aim for source/CSV publication by H7, coverage/recovery audit by H9, then fixes and rehearsal. Report task IDs, commit, API examples, source evidence, actual checks and remaining gaps.
