# U3/U4/U5 handoff (Umang + Claude): CSV intake, review service, publication, refresh

Branch `codex/umang-data`. Answers PALASH-003. All routes are local-only: they return 404 unless `INTEREST_ATLAS_LOCAL_DESK=1`.

## Routes (shared `ReviewSession` from `src/shared/review.ts`)

| Route | What it does |
| --- | --- |
| `GET /api/admin/import-template` | UTF-8 CSV template (fixed columns, one demo row) |
| `POST /api/admin/uploads` | multipart `file`, `providerId`, `mode=source\|demo` → 201 `ReviewSession` (+ `notes` per row) |
| `POST /api/admin/imports/from-source` | `{ providerId }` → review session from the latest stored source run |
| `GET /api/admin/imports/:importId` | current session |
| `PATCH /api/admin/imports/:importId/rows/:rowId` | `{ revision, changes }` (allowlist = `validateReviewPatch`) → revalidated session, revision +1; stale → 409 |
| `POST /api/admin/imports/:importId/approve` | `{ approve: true, rowIds, revision }` → `{ approved, publishedCount, blockedCount, unchangedCount, catalogueVersion }`; blocked → 400, stale → 409, repeat → same result |
| `POST /api/admin/scrape-runs` | `{ providerId \| "all" }` → 202 `{ runId, status: "queued" }`; one run at a time (409) |
| `GET /api/admin/scrape-runs/:runId` | per-provider result of that refresh (kept in memory) |
| `POST /api/admin/reset` | `{ resetDemo: true }` → clears published reviewed records and sessions |

CSV columns: `externalId,title,titleEn,description,descriptionEn,topics,interests,audience,ageText,date,startTime,endTime,venue,city,priceEur,format,availability,sourceUrl`.
- `topics`, `interests` and `audience` take semicolon-separated IDs from the taxonomy.
- A blank time keeps the record date-only. A blank price means unknown. "ab 12 Jahren" becomes `minimum-only`.
- Demo mode drops `sourceUrl`. Source mode requires a URL on the provider's allowed hosts.
- I added `interests`, `titleEn`, `descriptionEn` and `city` to the proposed column list, because the shared validator requires interests, English text and a city.

Storage: the published catalogue is `data/catalog/published-offers.json`, and sessions are `data/review-sessions/*.json` with a 30-minute expiry. Both are git-ignored runtime state, written atomically. `GET /api/offers` reads the published file.

## Demo walk-through (actually run against `next start`)

```bash
curl -F file=@data/demo-upload.csv -F providerId=aim -F mode=demo http://127.0.0.1:3000/api/admin/uploads
```

1. Upload: 18 `ready-new`, 2 `blocked`. `DEMO-CSV-07` has no date; `DEMO-CSV-15` has the unknown topic "quantum".
2. Inline fix: `PATCH …/rows/aim-demo-csv-07 {"revision":1,"changes":{"startDate":"2026-12-20"}}` gives 19 ready, revision 2.
3. Approve 19: `publishedCount 19, blockedCount 1, catalogueVersion 1`. Repeating the request returns the identical result.
4. `/api/offers`: 27 offers (8 demo fixtures + 19 CSV demo rows). `aim-demo-csv-15` is absent.
5. Re-import the same file: 18 `unchanged`, 2 `blocked`, no duplicates.
6. Reset: `/api/offers` is back to the 8 fixtures.

Real source record through the same service: `aim-271420sg` is `needs-review` (translation pending / derived city). After approval it appears on `/api/offers` with `verifiedAt` set to the approval time.
