# Umang coordination

Owner: Umang + Claude. Branch: `codex/umang-data`.
Only this owner updates this file. Follow [COLLABORATION.md](../COLLABORATION.md).

## Current report

- Protocol adoption: adopted 2026-11-14. Read PALASH.md from `origin/codex/palash-integration`. `origin/codex/ishan-design` did not exist on the remote at this checkpoint, so Ishan's report is **not reported**.
- Last updated (UTC): 2026-11-14T16:10Z.
- Current task/slice: PALASH-002 slice done (U1/U5 public reads). Next: U3 CSV intake and U4 review session (PALASH-003).
- State: U1 and U2 complete as staged-only adapters for all four providers. Public read API ready on the shared contract. CSV and review/publication not started.
- Based on `main` commit: `0b09fa8`. Merged into this branch at `bb9c08b` with no conflicts; 95/95 tests after the merge.
- **Blocker, publishing:** `git push origin codex/umang-data` is refused with HTTP 403 ("Claude doesn't have GitHub access to patelpalash/aim_project"). Fetching works; pushing does not. **None of the commits below are on the remote yet.** This file is therefore not readable by teammates until Umang restores GitHub access for this session (reconnect GitHub / install the Claude GitHub App) and the branch is pushed. Until then a git bundle of the branch is kept in the session scratchpad.
- Next independent task: U3 CSV template/upload into the existing `SourceRecord` → `normalizeRecord` path, reusing main's `ReviewSession` in `src/shared/review.ts`.

## Requests to teammates

- **UMANG-001 -> Palash (shared model):** please decide each of the following. Until then the adapters keep the conservative behaviour described.
  1. Online events. `venue.city` is required, so Haus der Familie "LIVE ONLINE" parent talks are blocked. Needed: an online venue representation.
  2. English text. Real records copy German into `en`, with a "translation pending" review note. Needed: an explicit pending-translation representation, or confirmation that copying is acceptable.
  3. Grade-based audiences. experimenta publishes "5. – 10. Klasse" with no ages, so age stays `unknown`. Confirm no grade-to-age mapping.
  4. Adult events. All four IPAI events have a general adult target group and are blocked as non-family. Confirm whether reviewers may tag such events `parents`.
  Acceptance: a written decision in PALASH.md. Continuing with U3/U4 meanwhile.

## Replies to teammates

- **PALASH-002 -> Palash: ready (local commit, push blocked).**
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
- **PALASH-003 -> Palash and Ishan: in-progress (not started in code).** I will build U3 CSV and U4 review on main's `ReviewSession` contract. No ready commit yet.

## Ready slices

These are local commits. They are not yet on the remote because of the push blocker above.

| Slice | Task IDs | Commit | Paths | Checks actually run |
| --- | --- | --- | --- | --- |
| aim adapter, normalization core, first real record | U1 | `eb5db20` | `src/server/scraping/{types,html,berlin-time,providers,fetcher,runner,cli}.ts`, `src/server/scraping/adapters/aim.ts`, `src/server/normalize/*`, `tests/aim-adapter.test.ts` | live aim run; 34/34 tests at that commit |
| experimenta, Haus der Familie, IPAI adapters; shared runner | U2 | `832d3f6` | `src/server/scraping/adapters/{experimenta,hdf,ipai,index}.ts`, `tests/source-adapters.test.ts`, `tests/fixtures/**` | live four-source run; 46/46 tests at that commit; records spot-checked against source pages |
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
