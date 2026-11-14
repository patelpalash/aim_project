# U1 handoff (Umang + Claude): source inspection, adapter boundary, first real record

Branch `codex/umang-data`, 14 November 2026. Covers task **U1** only. *The committed aim snapshot has since been refreshed by U2 (`aim-20261114T151220`); see [UMANG_U2.md](UMANG_U2.md) for current counts.* Nothing here is published to the public catalogue: scraped records are staged with `reviewStatus: "pending"` until the U4 review/approval service exists.

## What works now (checked by an actual run)

- **aim adapter** (`src/server/scraping/adapters/aim.ts`): three configured listing seeds → course cards → scoped detail pages → `SourceRecord` with field evidence → shared normalization → `Candidate` (`ready-for-review` / `blocked` / `out-of-scope`).
- Live run `aim-20261114T145135` (window 180 days, page cap 20): 40 listed, 17 staff-only/out of scope, 2 beyond window, 17 extracted, **10 ready for review, 7 blocked with readable reasons**, 0 failures. Status `partial` because the 20-page cap was reached; this is recorded, not hidden. Snapshot: `data/source-runs/aim-latest.json`.
- Read handlers (`src/server/catalog/read.ts`) mounted as Next-style route files:
  - `GET /api/offers` → `{ schemaVersion: 1, mode, offers, generatedAt, catalogueVersion }`; approved, not cancelled, not ended only. Today it returns the 8 demo records (`mode: "demo"`); staged scraped candidates do **not** appear.
  - `GET /api/admin/source-runs/:providerId/latest` → staged run with counts, page log, candidates, issues, review notes and field evidence. Returns 404 unless `INTEREST_ATLAS_LOCAL_DESK=1`.

Refresh (staging only):

```bash
node src/server/scraping/cli.ts --provider aim --window-days 180
```

Reset: `git checkout data/source-runs/aim-latest.json` restores the reviewed snapshot; delete the file to return the desk read to `not-run`.

## First genuine upcoming record

| Field | Value | Evidence (locator → source text) |
| --- | --- | --- |
| Source URL | https://www.aim-akademie.org/kurse/kurs/Talking-Plants-Programmiere-deine-Pflanze-bis-sie-spricht-1216-Jahre/271420SG | canonical link + `div.course_detail#course-271420SG` |
| externalId / id | `271420SG` / `aim-271420sg` | "Kursnummer: 271420SG" |
| Title | Talking Plants – Programmiere deine Pflanze, bis sie spricht (12–16 Jahre) | `div.course_detail h1` |
| Date | 2027-03-10T16:00:00+01:00 – 19:15:00+01:00 | `table#coursesDateTable`: "10.03.2027 \| 16:00 - 19:15 Uhr \| Bildungscampus" |
| Age | 12–16 | title "12–16 Jahre"; Teilnehmen: "im Alter von 12 bis 16 Jahren" (consistent) |
| Price | 0 (explicitly free) | "Kosten: keine" |
| Availability | available | sidebar status "frei" |
| Topics / interests | ai, coding / robots, tell-stories | rule hits "KI", "Programmier" / "sensor", "Charakter" |
| Venue | Bildungscampus, Heilbronn, access unknown | city **derived** from the printed address "Bildungscampus 7 74076 Heilbronn"; flagged for review |
| Review | `pending`, `verifiedAt: null` | scraper never approves |

## Source inspection results (all four)

| Provider | Finding | Adapter route for U2 |
| --- | --- | --- |
| aim | Static Kufer HTML. Listing cards carry course number, status and audience badges; detail has one `#coursesDateTable`. **Traps confirmed:** related-course dates/status badges on the same page; footer address "74076 Heilbronn" is the provider address, not the venue; "ab 10 Jahren" title vs "10–15" URL slug (title wins, minimum only); cart links `?knradd=` never followed. | Done (U1). Improve page budget (skip ended cards earlier) in U2. |
| IPAI | Static WordPress. Home lists 4 `/event/<slug>/` links; detail has a "Keyfacts" block (Wann/Wo/Teilnahme/Zielgruppe) plus a duplicated date in two layout sections. Example: "KI SALON WORKSHOP: Vibe Coding & KI-Agenten", 23 November 2026, 15:00–17:00, kostenfrei, Zielgruppe "Alle interessierten KI-Nutzer:innen" → general adult audience, **not** a child offer. One link goes to eventbrite (not followed). | Scoped Keyfacts parser; dedupe repeated date block. |
| experimenta | **Correction to SCRAPING_PLAN:** the events page HTML (1.6 MB) does contain dated links `/besuchen/veranstaltungskalender/<slug>/?termin=<unix-seconds>` (e.g. planetarium shows, FIRST LEGO League, ESP32 teacher training, Maker Faire). Most are dome shows, not AI/coding/gaming. | Parse listing links + detail; `termin` gives occurrence identity; strict topic filter. |
| Haus der Familie | Course block is a loader placeholder ("Kurse werden geladen…"). The public page's own script requests **`https://hdf-hn.de/kufer-api.php?keyword=digitale+medien&keyword_relation=or&kategorie_id=0&page=1&limit=120&endpoint=/kurse/`** (same allowed host, JSON array with `knr`, `haupttitel`, `hauptuntertitel`, dates…). Observed in a headless browser; e.g. "Programmieren Lernen - Scratch, Für Kinder von 8 bis 12 Jahren", Sa 28.11.2026 12:30, knr 261H304002. | JSON adapter on that observed public endpoint; never treat the placeholder as empty. |

## Requests for Palash (shared model/tooling)

1. `tsconfig.json` includes only `src/shared` and `tests`; `src/server` is checked only through test imports and `src/app/api/**` is not checked. Please widen `include` to `src/**/*.ts` (verified clean with the same options).
2. Next.js shell: route files import with `.ts` extensions; Next needs `allowImportingTsExtensions` support (or Palash's preferred alias) when the shell lands.
3. `LocalizedText` requires English. The adapter copies German into `en` and adds a review note. Prefer an explicit "translation pending" representation over copying.
4. `venue.city` is required, so records without a published city are blocked (e.g. aim `262430DSW`, `271470IN`). Confirm that is the intended behaviour or allow unknown city.
5. Already-planned extensions still needed: date-only precision (one test shows a date-only session stays `startsAt: null` and is blocked), age kind (`minimum` vs `range`; evidence already records it), configurable taxonomy.
6. Optional npm script for Palash to add: `"scrape": "node src/server/scraping/cli.ts"`.

## Remaining (by task / requirement)

- **U2 / R4, R9:** experimenta, Haus der Familie and IPAI adapters (entry points above). aim page budget/pagination audit.
- **U3:** CSV template/upload into the same `SourceRecord` → `normalizeRecord` path; 20-row fictional demo.
- **U4:** server-stored review sessions, inline edits, revision checks, selected approval writing `data/catalog/published-offers.json` (the public read already loads that file if present).
- **U5:** multi-provider run status/summary, last-good-cache recovery, config controls.
- Interest/topic rules are keyword rules with visible evidence; reviewers must confirm them. No translation, access or city is invented.
