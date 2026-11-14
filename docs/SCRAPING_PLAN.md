# Upcoming-event scraping and maintenance plan

Consolidated plan revision 3, 14 November 2026. Scraping is core. Palash confirmed permission from the four institutions for public event/course information. Record it as **user-confirmed permission** and proceed within that scope. This is not a claim that the repository stores a written agreement or that adapters are implemented. The four adapters and CSV upload converge on [one shared draft/review workflow](IMPORT_WORKFLOW.md).

## Source inspection and adapter decisions

Read-only direct HTTP probes were run on the four seed pages and one follow-up page per provider. All eight returned HTTP 200. This corrects the earlier observation that aim could not be read through the research tool. No browser rendering, complete pagination or production extraction was run.

| Provider | Observed entry points | What the probes established | Planned adapter |
| --- | --- | --- | --- |
| aim | [Digital education](https://www.aim-akademie.org/kurse?kathaupt=18&suchesetzen=false&kfs_sonderrubrik=1277), [coding](https://www.aim-akademie.org/kurse?kathaupt=18&suchesetzen=false&kfs_kursbereich=1278&kfs_sonderrubrik=1277), [holiday/leisure](https://www.aim-akademie.org/kurse?kathaupt=18&suchesetzen=false&kfs_sonderrubrik=1264) | Listing HTML contains course-detail links; one detail exposes a course ID, date and cost text. Listing structured data inspected was navigation metadata, not Event records. | Parse listing/pagination and scoped course-detail HTML; use course identity and actual session data. Inspect calendar/download links if useful. |
| experimenta | [Learning](https://www.experimenta.science/lernen/), [events](https://www.experimenta.science/besuchen/veranstaltungen/), [youth research](https://www.experimenta.science/lernen/jugendforschungszentrum/) | Learning page links to school/group contexts and a public booking subdomain. The inspected events HTML did not expose dated event entries in the extracted main text. | Inspect the rendered public event flow and any public data response it actually uses. Use that response if suitable, otherwise rendered DOM parsing; follow relevant public details. |
| Haus der Familie | [Digital family workshop](https://hdf-hn.de/angebote/digitale-familienwerkstatt/), [course search](https://hdf-hn.de/kurse/), [children/youth](https://hdf-hn.de/kinder-jugendliche/) | The workshop page contains a course-loading placeholder; the inspected course-search HTML did not supply real course-detail links. | Inspect public rendering/network responses. Extract actual returned records, not loading placeholders; retain a permitted file export as recovery. |
| IPAI Foundation | [Event overview](https://ipai-foundation.ai/#events) and linked `/event/` details | Overview exposes dated event links; one detail repeats a specific date/time and venue. Some links point to an external ticket service. | Parse scoped overview/detail HTML. Deduplicate repeated desktop/mobile text. Verify audience and topic per event rather than treating every public AI event as a child workshop. |

No suitable public API/feed has yet been established for the dynamic sources. Do not invent endpoint paths. Inspect requests made by the actual public UI. Do not use login-only, checkout or private endpoints. External ticket-service permission is not assumed from permission for the four institutional websites; retain an institution's own detail URL and do not crawl an unrelated host automatically.

## A concrete parser trap found during inspection

The aim detail inspected had course ID `262410KIDT` and an event date of 14 November 2026. Its surrounding related-course area contained dates in 2027. A parser that selects the first or latest date from the whole page can assign the wrong date to the current course. Extract from the identified course/detail section and verify the course ID. The inspected registration text also did not establish an available upcoming booking.

IPAI detail text repeated the same schedule in multiple layout sections. Duplicate text is not an additional occurrence. A dated event with no published child age/eligibility cannot silently become a child recommendation.

## Proposed modules and commands

Umang owns `src/server/scraping/` with a shared runner, source-specific adapters, normalization, evidence handling and fixtures/tests. Palash coordinates any changes to shared types. Source settings live in `data/providers.json`; taxonomy should become a separate configuration rather than hardcoded component lists.

Proposed commands, **not currently implemented**:

```text
npm run scrape -- --provider aim --window-days 90
npm run scrape -- --provider all --window-days 90
```

The 90-day horizon is a demo default, not a restriction in the PDF. Support a configurable horizon and label bounded coverage. Start with at most 20 public pages per provider per run, one in-flight request per host, about one second between requests, a 20-second timeout and at most two retries with backoff. Record when a page cap makes coverage partial.

Use the simplest appropriate transport: ordinary HTTP plus scoped HTML parsing for static pages; public structured data/feed or an observed public response where available; public-page rendering for dynamic records. Use the team's approved browser/runtime workflow for rendered inspection. Do not disguise a failed response, a CAPTCHA or a placeholder as an empty event list.

## Pipeline

1. Load enabled provider configuration, seed URLs, exact allowed hosts, bounds and user-confirmed permission status.
2. Fetch only listing/detail resources needed for the task. On aim, follow actual `/kurse/kurs/` records, not cart links such as `knradd`, account pages or registration submission actions.
3. Store retrieval status and source evidence separately from public catalog data. Avoid copying unrelated staff contacts or raw page scripts into public responses.
4. Extract provider identity, source record ID, exact detail URL, title, description, topic evidence, audience/age, schedule, venue, cost and availability when actually stated.
5. Normalize into the common contract. Keep raw evidence for uncertain fields; do not fill missing facts with guesses. Team translations must be identifiable as translations.
6. Apply topic and audience rules, parse actual occurrences, and identify upcoming/ongoing/undated records honestly.
7. Validate, detect stable-identity collisions and compare substantive changes. Stage new/changed records and rejected/uncertain rows.
8. A maintainer reviews changes. Publication updates the cached catalog atomically. Fetch timestamps may refresh independently; human-review timestamps cannot be fabricated by a scraper.
9. Record per-provider outcome and retain the last good published catalog if any source fails. Visitor browsing never waits for scraping.

The same normalization/identity/validation/publication code is used for CSV rows. Source facts may be corrected in a server-stored draft with provenance and revalidation; the published record changes only after explicit selected approval. Rule-based topic tagging and maintainer-written simple copy are sufficient. Do not generate factual age/cost/date limits through an LLM, and do not auto-publish after a single clean source run.

## Meaning of upcoming and eligibility

- Compare explicit timestamps to the actual current time and display in Europe/Berlin, including daylight-saving changes.
- A future session is upcoming; a session currently in progress belongs in a separate labeled state. A course starting in the past may have future occurrences, so parse supplied session dates rather than discarding or guessing the whole series.
- When only a local date is supplied, retain date-only precision and say the time is not provided. Do not invent midnight or a workshop hour. The existing shared type needs the planned precision extension before such records can be filtered correctly.
- Missing or ambiguous schedules go to review or a clearly separate undated section; they are not silently labeled upcoming.
- Preserve free versus unknown price, full/cancelled versus unknown availability, school-group versus individual/family access and parent-only versus child offerings.
- Classify AI/coding/gaming from explicit source text or reviewed rules. Broad digital-family activities may require review; unrelated activities must not fill apparent coverage gaps.
- A published minimum age without an upper bound needs explicit bound semantics; do not turn an omitted maximum into an invented number. Coordinate age-evidence behavior with Palash.

## Stable identities and update policy

Use provider ID plus provider course/event identity and occurrence identity. Keep recurring sessions separate, preserve a known occurrence ID when the same session is rescheduled, and flag ambiguous reschedules for review. Canonicalize tracking fragments/parameters without merging genuinely distinct events. Same course names at different institutions are not automatically duplicates.

Missing from one run is not deletion. A run with zero extracted records must pass source/layout checks before it can be called a valid empty result. A failed run or page cap cannot remove records. Explicit source cancellations can be staged for review. Unchanged records do not require duplicate publication.

## Maintainer experience and scheduling

The compact desk should offer source refresh, progress/status, readable errors, field-level changes, approval, retry of one failed provider, and a file-import recovery route. Provide source/theme configuration through simple controls or a documented template. Adding another provider with an existing supported format is configurable; a new website structure may require a new adapter.

For the hackathon, manual **Refresh sources** plus a cached startup load demonstrates the workflow. A scheduled backend job, for example every six hours, is a planned extension after the adapters work. No recurring desktop automation is created by this plan. Scheduled runs should stage changes while publication follows the agreed review policy.

## Per-run evidence and statuses

Each provider result should include run ID, adapter version, attempt/success times, source URLs, page count, coverage window, partial-coverage flag, extracted/rejected/staged counts and a readable error. Distinguish `not-run`, `running`, `needs-review`, `reviewed`, `empty`, `partial` and `failed`.

An initial one-source scrape-to-app success is the H3 milestone. Final target is working extraction/qualification for all four sources. If any adapter remains incomplete, record the gap against PDF requirements R4/R9. Never label "failed" as "no events available."

## Meaningful verification

- Golden parsing fixtures from each actually observed format, including dynamic payloads if used.
- Source-specific identity/date extraction that ignores navigation, related-course dates and duplicate layout sections.
- Date-only precision, Europe/Berlin/DST handling, recurrence and past/current/future boundaries.
- Full/cancelled/unknown availability, missing prices/ages and school/parent-only eligibility.
- Duplicate and repeated-run behavior, reviewed changes, invalid rows and ambiguous reschedules.
- Failure, changed layout, valid empty result, page cap and stale cache behavior.
- A small human spot-check of real normalized records against exact source detail pages, plus one complete refresh-to-publication demonstration.

Keep a reviewed source snapshot for offline demonstration, labeled with its retrieval date. Keep fictional fixtures in a separate demo mode. Do not describe a saved snapshot as a current live fetch.
