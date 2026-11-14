# Umang coordination

Owner: Umang + Claude. Branch: `codex/umang-data`.
Only this owner updates this file. Follow [COLLABORATION.md](../COLLABORATION.md).

## Current report

- Protocol adoption: adopted 2026-11-14. Owner reports are read from their remote branches: PALASH.md from `origin/codex/palash-integration`, ISHAN.md from `origin/codex/ishan-design` (present since this checkpoint, tip `a1826f2`).
- Last updated (UTC): 2026-11-14T19:10Z. Checkpoint: `origin/main` = `5045d03` (already merged here); `origin/codex/ishan-design` = `7aa6ae5`. No new requests to Umang except ISH-REQ-3, now done.
- Current task/slice: ISH-REQ-3 done (`796e438`). Remaining U6: re-apply the review after the next source refresh and support final acceptance.
- State: U1–U6 backend done. The public catalogue has **19 evidence-reviewed real events** (aim 8, experimenta 1, Haus der Familie 10) plus the 8 labelled demo examples; the homepage shows "19 geprüfte Angebote · 8 Demo-Beispiele (erfunden)".
- Based on `main` commit: `5045d03` (merged).
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

- **ISH-REQ-3 -> Ishan: done.** Code commit `796e438e7df6f7b25027092c67397f8b85a5f135`.
  - `sourceStatuses[].message` is now German, built from the structured run and review data. Example (aim): "15 Angebote zur Prüfung bereitgestellt (9 prüfbereit, 6 mit Korrekturbedarf). Abdeckung unvollständig: Seitenlimit erreicht. Prüfung: 8 nach menschlicher Prüfung veröffentlicht, 3 bereitgestellt, aber nicht veröffentlicht (wartet auf Prüfung oder zurückgestellt), 4 blockiert." The English technical log stays in the run files.
  - Two data fixes found while checking your panel:
    - `rejectedCount` no longer counts rows that were corrected and published in review. aim goes 6 → 4 and Haus der Familie 3 → 1, so "N Einträge werden noch korrigiert" is now true.
    - `status` becomes `reviewed` only when the run was fully read, nothing awaits review, nothing is blocked and something was published. Currently only experimenta qualifies; partial coverage stays `partial`.
  - Checks: `npm run check` 123/123 and `npm run build` clean. With `next start`, the opened "Woher die Angebote kommen" panel shows "aim Teilweise übernommen … 4 Einträge werden noch korrigiert", "experimenta Geprüft", "Haus der Familie … 1 Eintrag" and "IPAI … 4 Einträge", plus the German detail line, with no English text.

- **UMANG-003 -> Palash: closed.** Observed in a browser on the merged build: the status line reads "19 geprüfte Angebote · 8 Demo-Beispiele (erfunden)" from the actual catalogue counts. No backend change was needed.
- **UMANG-004 -> Palash: done.** Code commit `213635acb0096b477193d7a0ee7c5d987a9412de`.
  - Both courses were re-checked on their own pages (date, time, title, fee) and approved with interests quoted from the source:
    - `aim-271430cyc1` "Craft Your City" → `build-worlds` ("…eine nachhaltige und smarte Stadt in der Sandbox-Welt von Luanti (ähnlich wie Minecraft)")
    - `aim-271420fe` "Code your Chat" → `build-apps` ("…baust deine eigene Messenger Web-App"); its AI topic is genuine ("KI-Verständnis")
  - The baseline now holds 19 real records at catalogue v2.
  - `apply-review` now builds on the committed baseline, so the 17 earlier records keep their original review time (17:41:56Z). Only aim's `lastReviewedAt` moved, to the new approval (18:48:52Z). Re-applying is idempotent (dry run: no change).
  - Future runs tag these interests from source wording.
  - Checks: `npm run check` 120/120; `npm run build` clean. Live `next start`: `/api/offers` returns 27 offers (19 real), and both courses and the "Welten bauen" / "Apps bauen" tiles render on `/`.
  - Still held (12), with reasons in `data/catalog/review-decisions.json`: running series with registration closed, online events, IPAI adult events, and one out-of-scope lecture.

- **PALASH-007 -> Palash: ready.** Code commit `7fa9631d7a695b5ab7756c096a6c128aabbd9e82` on `codex/umang-data`.
  - `sourceStatuses[].lastReviewedAt` is the latest `source.verifiedAt` of that provider's approved real records. That value is set by `approve()` at the moment of human approval; runs and staging never set it. It is `null` where nothing was approved (currently IPAI).
  - The status message states published / not-yet-published (awaiting or held) / blocked counts. It does not claim that every staged update was reviewed.
  - Checks:
    - `tests/source-review.test.ts`: staging alone leaves the value unchanged, a new approval moves it to that approval time, and IPAI stays null.
    - `npm run check` 116/116; `npm run build` clean.
    - Live `next start`: `/api/offers` returns 25 offers (17 real); `lastReviewedAt` is set for aim, experimenta and Haus der Familie, and null for IPAI.
- **Source-data review (task 7) -> Palash: ready**, same commit.
  - Every staged row of the fresh 2026-11-14 runs has a decision with reason and quoted evidence in `data/catalog/review-decisions.json`: 15 approved, 2 corrected and approved, 14 held.
  - Each approved record's provider page was re-fetched and found to contain its own date, start time, title and fee (17/17).
  - Corrections, from quoted source text only: the two Haus der Familie "Data Literacy for Kids" workshops get interest `solve-puzzles`. The story rule now recognises "eine Geschichte", "Märchen" and "Trickfilm", so ScratchJunior "Märchenhaft…" gets `tell-stories`.
  - Held:
    - three aim series already running with registration closed
    - aim "Craft Your City" and "Code your Chat": no fitting discovery interest
    - aim "Digitale Spielewelten" and the Haus der Familie LIVE ONLINE talk: online, per UMANG-001(1)
    - all four IPAI events: general adult audience, per UMANG-001(4)
    - one out-of-scope tax lecture
  - Applied with `node src/server/review/apply-review.ts` through the same review service; a row whose source facts changed is held, never approved. The result is in `data/catalog/reviewed-offers.json`.
  - The public read and `/api/admin/reset` use or restore this committed baseline. The runtime catalogue stays git-ignored.
  - Browser check of `/`: "Talking Plants", "Programmieren Lernen - Scratch", "First Lego League", "Spieleentwicklung mit Unity" and "Data Literacy" render; interest tiles count the real events.

- **ISH-REQ-1 -> Ishan: ready.** `/api/offers`, `/api/taxonomy` and `/api/providers` are on `codex/umang-data` (code `97e3e43`, current tip `8a75c3b`), validated with the shared validators.
  - Checked against your branch: in a local merge of `codex/umang-data` (`8a75c3b`) with `codex/ishan-design` (`a1826f2`), with no conflicts, `/` loads the bundle from the real API through `loadCatalog`.
  - The status line still reads "Demo-Daten…" because the catalogue contains the 8 demo fixtures, so `mode` is `demo`. It switches to "Geprüfter Katalog" only once no demo records remain.
- **ISH-REQ-2 -> Ishan: ready.** Admin review routes are on `codex/umang-data` (code `4016c3d` + `8a75c3b`). They are local-only: start the app with `INTEREST_ATLAS_LOCAL_DESK=1`, otherwise they return 404 and your desk shows "not built yet".
  - Checked in headless Chromium against your `/organizer` page on the merged build:
    - The CSV upload shows 20 rows: 18 selectable, 2 blocked.
    - The row editor date fix on `aim-demo-csv-07` makes 19 selectable ("Zeile gespeichert und neu geprüft").
    - "Ausgewählte veröffentlichen (19)" publishes: `/api/offers` returns 27 offers at `catalogueVersion 1`, and `aim-demo-csv-15` is not public.
  - Integrated `npm run build` is clean.
  - Two server fixes were made for your editor's simple fields (`8a75c3b`):
    - a date edit on a timed row now moves the session and keeps its times (previously it blocked the row)
    - editing ages re-derives `ageEvidence` (previously a mismatch blocked the row)

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

- **UMANG-002 -> Ishan (I5 desk, needed before rehearsal):** these came out of the integration check above.
  1. **Error messages.** `request()` in `src/components/organizer/api.ts` reads `body.message ?? body.error`, but the agreed envelope (CONTRACT.md) is `{ error: { code, message, issues } }`, so errors would display "[object Object]". Please read `body.error?.message` and show `issues[].message`.
  2. **Publish result disappears.** In `onApprove`, `adoptSession()` runs after `setApproveResult(result)` and resets it to null, so the "Veröffentlichung abgeschlossen" panel never stays visible, although publishing succeeded.
  3. **Newly available routes for "Quellen & Themen"** (all local-only):
     - `GET /api/admin/summary`: catalogue version, per-source status, synthetic demo gaps.
     - `GET /api/admin/scrape-runs/:runId`: poll after "Aktualisieren".
     - `POST /api/admin/imports/from-source {providerId}`: stage the last source run as a review session.
     - `GET /api/admin/source-runs/:providerId/latest`: field evidence for a row.
     - `GET/POST /api/admin/topics`, body `{kind:"topic"|"interest", id, label:{de,en}, enabled, topicIds}`.
     - `GET/POST /api/admin/providers`, body `{id, name, discoveryUrl, enabled}`. A new source is created CSV-only, `adapter: "none"`.
     - `POST /api/admin/reset {resetDemo:true}`.
  - Acceptance: the desk can refresh a source and see its status, review a source run, add or disable a theme, and add a CSV-only source, all without editing files. This is the PDF maintenance demonstration.
  - Continuing meanwhile: U6 rehearsal checks.

- **UMANG-003 -> Ishan, Palash decides (public status line, before final demo):** the public catalogue now mixes 17 reviewed real events with the 8 demo fixtures, so `mode` correctly stays `demo`. The status line on `/` still says "Demo-Daten: erfundene Beispiele, keine echten Termine", which is now false.
  - Option A (Ishan): word the mixed state honestly, e.g. "Geprüfte Termine und markierte Demo-Beispiele", and keep the per-card demo label.
  - Option B (Palash decision, Umang implements): drop the demo fixtures from the public catalogue now that real data exists, so `mode` becomes `reviewed`. The demo CSV flow still works through the desk.
  - Acceptance: no visitor-facing text claims there are no real events while real ones are shown.
- **UMANG-004 -> Palash/organizer (taxonomy):** two real aim courses are held only because no discovery interest fits: "Craft Your City" (building in the sandbox game Luanti) and "Code your Chat" (building a web app). If you want them, add an interest such as `build-worlds` / `build-apps` with `POST /api/admin/topics`, then I re-review and approve them.

## Ready slices

All on `origin/codex/umang-data` (verified 2026-11-14T16:47Z).

| Slice | Task IDs | Commit | Paths | Checks actually run |
| --- | --- | --- | --- | --- |
| aim adapter, normalization core, first real record | U1 | `eb5db20` | `src/server/scraping/{types,html,berlin-time,providers,fetcher,runner,cli}.ts`, `src/server/scraping/adapters/aim.ts`, `src/server/normalize/*`, `tests/aim-adapter.test.ts` | live aim run; 34/34 tests at that commit |
| experimenta, Haus der Familie, IPAI adapters; shared runner | U2 | `832d3f6` | `src/server/scraping/adapters/{experimenta,hdf,ipai,index}.ts`, `tests/source-adapters.test.ts`, `tests/fixtures/**` | live four-source run; 46/46 tests at that commit; records spot-checked against source pages |
| German status messages, accurate review-aware counts | U6, ISH-REQ-3 | `796e438` | `src/server/catalog/read.ts`, `tests/{source-review,catalog-api}.test.ts` | 123/123 tests; clean build; browser check of the source panel |
| Re-review under taxonomy v3 (2 more real records) | U6, UMANG-004 | `213635a` | `data/catalog/*`, `src/server/review/apply-review.ts`, `src/server/normalize/rules.ts`, `tests/source-review.test.ts` | 2 pages re-verified; 120/120 tests; clean build; browser check of `/` |
| Reviewed real records + lastReviewedAt | U6, PALASH-007 | `7fa9631` | `data/catalog/{reviewed-offers,review-decisions,review-report}.json`, `src/server/review/apply-review.ts`, `src/server/catalog/read.ts`, `src/server/review/service.ts`, `tests/source-review.test.ts` | 17/17 source pages re-verified; 116/116 tests; clean build; browser check of `/` |
| Desk summary, theme/source maintenance, desk-compatible edits | U5 | `8a75c3b` | `src/server/config/maintenance.ts`, `src/server/review/{http,service}.ts`, `src/app/api/admin/{summary,topics,providers}`, `data/demo-gap-requests.json`, `tests/maintenance.test.ts` | 106/106 tests; integrated build with Ishan's branch; headless desk flow |
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
