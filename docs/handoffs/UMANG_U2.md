# U2 handoff (Umang + Claude): all four source adapters

Branch `codex/umang-data`, 14 November 2026. Follows [UMANG_U1.md](UMANG_U1.md). Everything is **staged for review only** (`reviewStatus: "pending"`, `verifiedAt: null`); nothing reaches `GET /api/offers` until the planned U4 approval step.

## Live run results (180-day window, 20-page cap per provider)

```bash
node src/server/scraping/cli.ts --provider all --window-days 180
```

| Provider | Run | Status | Read | Staged (ready / blocked) | Not staged (examples of reasons) |
| --- | --- | --- | --- | --- | --- |
| aim | `aim-20261114T151220` | partial (page cap) | 3 listings, 17 details | 15 (9 / 6) | 18 staff training, 2 outside window, 3 not AI/coding/gaming |
| experimenta | `experimenta-20261114T151355` | needs-review | 1 listing (518 future occurrence cards), 11 details | 1 (1 / 0) | planetarium shows and teacher training (by published category), SkyNight, Maker Faire, FLL Explore: no explicit AI/coding/gaming wording |
| Haus der Familie | `haus-der-familie-20261114T151306` | needs-review | 3 seed pages, 3 JSON pages, 11 details | 11 (7 / 4) | 57 courses without AI/coding/gaming wording |
| IPAI | `ipai-20261114T151328` | needs-review | overview + 4 details | 4 (0 / 4) | none; all four are blocked because the published target group is a general adult audience |

Snapshots: `data/source-runs/<provider>-latest.json` (candidates, issues, review notes, field evidence, `skipped[]` with reasons, page log). A failed refresh writes only `<provider>-last-attempt.json` (git-ignored) and keeps the last good `-latest.json`.

### Spot-checked records (compared by hand with the pages)

- **Haus der Familie 261H304002**, https://hdf-hn.de/kurs/programmieren-lernen-scratch-261H304002/: "Programmieren Lernen - Scratch – Für Kinder von 8 bis 12 Jahren ohne Begleitperson", 28.11.2026, 12:30–15:30. Ages 8–12, fee 30,00 €, status "Ausgebucht" → full. Ready for review.
- **Haus der Familie 261H207007**: "Roboter – Verstehen, Programmieren, Entdecken – Stufe 2", 2 sessions (16.01. and 23.01.2027, 10:00–11:30), ages 4–7 with an accompanying adult → children + families, 10 €, full.
- **experimenta FLL Challenge**, https://www.experimenta.science/besuchen/veranstaltungskalender/first-lego-league-regionalwettbewerb-heilbronn/?termin=1796468400: 05.12.2026, 11:00–17:00. "Der Eintritt ist kostenfrei." → 0. Categories "5. - 10. Klasse, Jugendliche" → teens. No published age range, so age stays null.
- **IPAI 10379** "KI SALON WORKSHOP: Vibe Coding & KI-Agenten": 23.11.2026, 15:00–17:00, kostenfrei. Blocked: *Published target group "Alle interessierten KI-Nutzer:innen" is not a child/teen/family/parent audience.*

## How each adapter works

| Provider | Discovery | Evidence anchors | Cross-checks that block a record |
| --- | --- | --- | --- |
| aim | 3 configured listing pages | `#course-<KNR>`, `#coursesDateTable`, sidebar status after the Kursnummer, `Kosten:` | conflicting cost blocks, canonical/ID mismatch, title-vs-text age conflict |
| experimenta | `/besuchen/veranstaltungen/` cards (`data-event`, `data-groups`, `?termin=`) | `h1.entry-title`, `.post-kategorien`, content sentences (Zielgruppe, Eintritt/kostenfrei, Veranstaltungsort), schema.org `Event` JSON-LD | card time ≠ termin, JSON-LD startDate ≠ occurrence |
| Haus der Familie | Replays the page's own requests to `hdf-hn.de/kufer-api.php`. The query comes from the course-block config and the preselected search-form filter (`fachb=3`). Pages through results. | detail `/kurs/<slug>-<knr>/` h1/h2 and "Kursdaten" table (Status, Kursnummer, Termin, Gebühr, Ort) | Kursnummer mismatch, JSON vs detail fee, first date/time mismatch, title drift |
| IPAI | overview `/event/<slug>/` links | `post-<id> event` (stable WordPress ID), hero h1 + category, `cruise-event-informations` (rendered twice, must agree), Keyfacts (Wann/Teilnahme/Zielgruppe) | duplicated blocks disagree, Keyfacts "Wann" ≠ header |

Identity: `aim-<Kursnummer>`, `haus-der-familie-<knr>`, `ipai-<post id>`, and `experimenta-<event id>-<termin>` (one row per occurrence). None of these depend on the title or a hash.

**Found and fixed during U2:** experimenta's `?termin=` is the Berlin wall-clock time encoded as if it were UTC. The first run read it as a real UTC instant, so it showed 12:00 instead of 11:00. The card-time cross-check blocked that record before anyone could approve it.

Privacy: the Haus der Familie JSON contains tutor names and e-mails (`dozenten`). They are never read into records, and the detail page's "Leitung" row is skipped. The test fixtures are scrubbed and a test asserts that no tutor data appears.

## For Palash (shared model)

Adds to the U1 list:
1. **Online events:** `venue.city` is required, so Haus der Familie "LIVE ONLINE" parent talks are blocked. Please decide on an online venue representation.
2. **Grade-based audiences:** experimenta publishes "5. – 10. Klasse" rather than ages. Age stays null, and the audience is `teens` from the "Jugendliche" category.
3. **Adult events:** IPAI's general-adult events need a decision. Either they stay out of the family guide, or reviewers may tag them `parents` with a note. The adapter never does this automatically.
4. **Keyword rules:** topic and interest rules miss some relevant events, e.g. FLL Explore and Data Literacy for Kids. Reviewers can see them in `skipped[]`. Configurable taxonomy/rules (U5 with Palash) should make this editable.

## Remaining

- **U3:** CSV template/upload into the same `SourceRecord` → `normalizeRecord` path, plus the 20-row fictional demo.
- **U4:** review sessions, inline correction, revision checks, selected publication into `data/catalog/published-offers.json`.
- **U5:** cross-provider status summary for the desk, retry of a single failed provider, config controls.
- aim still hits the 20-page cap with a 180-day window. Raise the cap in config, or rely on the 90-day default, which uses 16 pages.
