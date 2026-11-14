# Umang coordination

Owner: Umang + Claude. Branch: `codex/umang-data`.
Only this owner updates this file. Follow [COLLABORATION.md](../COLLABORATION.md).

## Current report

- Protocol adoption: adopted 2026-11-14. Read PALASH.md from `origin/codex/palash-integration`. `origin/codex/ishan-design` did not exist on the remote at this checkpoint, so Ishan's report is **not reported**.
- Last updated (UTC): 2026-11-14T16:45Z. Checkpoint: `origin/main` = `6629eca` (push-recovery guide), merged into this branch with no conflicts; `npm ci`, `npm run check` 102/102, `npm run build` clean after the merge. `origin/codex/ishan-design` still absent.
- Current task/slice: PALASH-002 and PALASH-003 backend slices are both done. Remaining: U6 rehearsal/verification support, and Ishan's I5 desk UI integration.
- State: U1–U5 backend implemented. Four live adapters stage records for review. The public read API follows the shared contract. CSV upload, review sessions, inline edits, selected publication, source refresh and reset are available as local desk routes.
- Based on `main` commit: `6629eca` (merged; earlier merges of `0b09fa8` and `2ccc5c8`).
- Publishing: **resolved.** A normal `git push -u origin codex/umang-data` succeeded at 2026-11-14T16:47Z. `git ls-remote --heads origin codex/umang-data` = `de1635d1ca8227288ed2bac989da88a2e29e8c8d`, equal to the local tip; code commits `97e3e43` (PALASH-002) and `4016c3d` (PALASH-003) are ancestors of the remote tip. All commits listed below are now on GitHub.
- Next independent task: U6 support. Answer integration questions, re-run sources before rehearsal, and fix whatever Palash's integration finds.

## Requests to teammates

- **UMANG-001 -> Palash (shared model):** please decide each of the following. Until then the adapters keep the conservative behaviour described.
  1. Online events. `venue.city` is required, so Haus der Familie "LIVE ONLINE" parent talks are blocked. Needed: an online venue representation.
  2. English text. Real records copy German into `en`, with a "translation pending" review note. Needed: an explicit pending-translation representation, or confirmation that copying is acceptable.
  3. Grade-based audiences. experimenta publishes "5. – 10. Klasse" with no ages, so age stays `unknown`. Confirm no grade-to-age mapping.
  4. Adult events. All four IPAI events have a general adult target group and are blocked as non-family. Confirm whether reviewers may tag such events `parents`.
  Acceptance: a written decision in PALASH.md. Continuing with U3/U4 meanwhile.

## Replies to teammates

- **PALASH-004 -> Palash: resolved.** The normal push works, and the branch is retrievable at https://github.com/patelpalash/aim_project/tree/codex/umang-data (tip `de1635d1ca8227288ed2bac989da88a2e29e8c8d`, verified with `git ls-remote`). A zip with the same commits (git bundle + instructions) is also being sent as a backup only. Fetching the branch is the primary route.
- **PALASH-004 (earlier diagnostics, kept for reference):** Diagnostics, credentials redacted:
  - Environment: Claude Code cloud session (remote container, not the desktop app). The session's configured repository is `patelpalash/aim_project`. Destination branch: `codex/umang-data`. The session also lists `claude/trusting-brahmagupta-mikj60` as its default branch; a dry-run push there fails identically.
  - Command `git push -u origin codex/umang-data` (normal push, no force) returns: `remote: Claude doesn't have GitHub access to patelpalash/aim_project for your organization. An org admin can install the Claude GitHub App … or reconnect GitHub from claude.ai settings …` followed by `fatal: unable to access 'https://github.com/patelpalash/aim_project/': The requested URL returned error: 403`.
  - The GitHub API through the same Claude integration can read: listing branches works and showed `main` = `codex/palash-integration` = `2ccc5c8`. Writing is refused: `POST /repos/patelpalash/aim_project/git/refs` → `403 Resource not accessible by integration`.
  - Conclusion: the collaborator's own Write access is not what fails. The **Claude GitHub App installation lacks write (contents) permission on this repository**, or the claude.ai account is linked to a GitHub identity without it. Fix: in claude.ai, reconnect GitHub with the account that has Write access, and install/authorise the Claude GitHub App on `patelpalash/aim_project` with repository contents write access (an org/repo owner may need to approve).
  - All work is preserved as local commits, and a git bundle of `codex/umang-data` is kept in the session scratchpad. Nothing was force-pushed or discarded.
- **PALASH-002 -> Palash: ready (pushed).**
  - Code commit: `97e3e43ea02442e0930aa23db9b740ef74e29b21` on `codex/umang-data`. It builds on U1 `eb5db20` (aim adapter) and U2 `832d3f6` (experimenta, Haus der Familie and IPAI adapters), plus merge `bb9c08b`.
  - Scope: `GET /api/offers`, `/api/taxonomy` and `/api/providers` are validated with the shared `validateCatalogResponse`, `validateTaxonomy` and `validateProvidersResponse` before they are sent.
  - `/api/offers` also returns `sourceStatuses` for all four providers and `cache`.
  - Pending scraped candidates never appear on `/api/offers`. Only approved records with `verifiedAt` do; U4 approval will write `data/catalog/published-offers.json`.
  - Configuration faults return a 500 `{ error: { code: "INVALID_CONFIGURATION" } }` envelope.
  - First real source-backed staged record: aim `271420SG` "Talking Plants – Programmiere deine Pflanze, bis sie spricht (12–16 Jahre)", https://www.aim-akademie.org/kurse/kurs/Talking-Plants-Programmiere-deine-Pflanze-bis-sie-spricht-1216-Jahre/271420SG. 10.03.2027, 16:00–19:15, free, available, `ageEvidence: range "12–16 Jahre"`. Field evidence is in `data/source-runs/aim-latest.json`; the local review read is `GET /api/admin/source-runs/aim/latest` with `INTEREST_ATLAS_LOCAL_DESK=1`.
  - Checks run:
    - `npm run check`: typegen and `tsc` clean, 95/95 tests.
    - `tests/catalog-api.test.ts` feeds the three handlers into the shared `loadCatalog` and asserts provider/taxonomy identities, pending-record exclusion, a simulated approved record, failed-refresh status, invalid configuration and disabled providers.
    - `npm run build` succeeds with no warnings.
    - `npm run start` with curl: `/api/offers` 200 (demo, 8 offers, 4 `sourceStatuses`: aim partial, experimenta/haus-der-familie/ipai review-needed), `/api/taxonomy` 200, `/api/providers` 200, `/api/admin/source-runs/aim/latest` 404 without the local flag.
  - Known gaps: no approval writer yet (U4), so `mode` stays `demo` and no real record is public. `lastReviewedAt` is always null until U4.
- **PALASH-003 -> Palash and Ishan: ready (backend; pushed).**
  - Code commit: `4016c3df75de3ad7578f11f66848e49f54f30c96` on `codex/umang-data`, on top of `97e3e43`.
  - Routes are local-only (404 unless `INTEREST_ATLAS_LOCAL_DESK=1`) and use the shared `ReviewSession`, `validateReviewPatch` and `validateReviewSelection`. See [UMANG_U3_U4.md](../handoffs/UMANG_U3_U4.md) for the route table, CSV columns and walk-through. Routes:
    - `GET /api/admin/import-template`
    - `POST /api/admin/uploads`
    - `POST /api/admin/imports/from-source`
    - `GET /api/admin/imports/:id`
    - `PATCH /api/admin/imports/:id/rows/:rowId`
    - `POST /api/admin/imports/:id/approve`
    - `POST /api/admin/scrape-runs` and `GET /api/admin/scrape-runs/:runId`
    - `POST /api/admin/reset`
  - Acceptance, actually run against `next start` with `data/demo-upload.csv` (fictional):
    - Upload: 18 `ready-new` and 2 `blocked`.
    - Inline fix of `aim-demo-csv-07` (`startDate`): 19 ready, revision 2.
    - Approve: 19 published, `catalogueVersion 1`. A repeat returns the identical result.
    - `/api/offers` shows 8 + 19; `aim-demo-csv-15` is not published.
    - Re-import: 18 `unchanged`, 2 `blocked`, no duplicates.
    - Reset restores the 8 fixtures.
    - Source refresh: `POST /api/admin/scrape-runs {"providerId":"ipai"}` returned 202, then `done`/`needs-review`. An arbitrary URL is rejected with 400.
  - Tests in `tests/review-service.test.ts` cover the same flow plus:
    - stale revision → 409, stale catalogue → 409, expired session → 404
    - non-allowlisted patch, wrong provider and duplicate identity
    - a source URL off the allowed hosts
    - a real `aim-271420sg` record reaching `/api/offers` only after approval, with `verifiedAt` set
  - Checks: `npm run check` (typegen + `tsc` clean, 102/102 tests) and `npm run build` (succeeds, no warnings).
  - For Ishan (I5): the session JSON includes `notes[rowId]` (reviewer notes) in addition to the shared fields. Field evidence for source rows stays server-side and can be read via `GET /api/admin/source-runs/:providerId/latest`.
  - Known gaps:
    - Sessions and refresh status live on local disk and in memory, so they suit the localhost demo only.
    - `lastReviewedAt` in `sourceStatuses` is still null.
    - No desk UI from my side; Ishan owns it.

## Ready slices

All on `origin/codex/umang-data` (verified 2026-11-14T16:47Z).

| Slice | Task IDs | Commit | Paths | Checks actually run |
| --- | --- | --- | --- | --- |
| aim adapter, normalization core, first real record | U1 | `eb5db20` | `src/server/scraping/{types,html,berlin-time,providers,fetcher,runner,cli}.ts`, `src/server/scraping/adapters/aim.ts`, `src/server/normalize/*`, `tests/aim-adapter.test.ts` | live aim run; 34/34 tests at that commit |
| experimenta, Haus der Familie, IPAI adapters; shared runner | U2 | `832d3f6` | `src/server/scraping/adapters/{experimenta,hdf,ipai,index}.ts`, `tests/source-adapters.test.ts`, `tests/fixtures/**` | live four-source run; 46/46 tests at that commit; records spot-checked against source pages |
| CSV intake, review sessions, selected publication, refresh, reset | U3/U4/U5, PALASH-003 | `4016c3d` | `src/server/review/*`, `src/app/api/admin/**`, `data/demo-upload.csv`, `tests/review-service.test.ts` | live `next start` walk-through; 102/102 tests; clean build |
| Public read API on the shared contract | U1/U5, PALASH-002 | `97e3e43` | `src/server/catalog/read.ts`, `src/app/api/{offers,taxonomy,providers}/route.ts`, `tests/catalog-api.test.ts` | as listed under PALASH-002 |

Refresh (staging only; nothing is published):

```bash
node src/server/scraping/cli.ts --provider all --window-days 180
```

Latest live run, 14 Nov 2026, 180-day window:

| Provider | Status | Staged | Ready | Blocked |
| --- | --- | --- | --- | --- |
| aim | partial (20-page cap) | 15 | 9 | 6 |
| experimenta | needs-review | 1 | 1 | 0 |
| Haus der Familie | needs-review | 11 | 7 | 4 |
| IPAI | needs-review | 4 | 0 | 4 |

Details: [UMANG_U1.md](../handoffs/UMANG_U1.md) and [UMANG_U2.md](../handoffs/UMANG_U2.md).
