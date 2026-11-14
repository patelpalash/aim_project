# Interest Atlas: consolidated one-day project plan, revision 3

Updated 14 November 2026. This is the single consolidated plan for Palash + ChatGPT, Ishan + Claude and Umang + Claude. It combines the whole-website discovery/motion experience with the useful bulk-import and maintainer workflow from the supplied alternative plan. It supersedes earlier planning versions. Follow the AIM challenge PDF and the user's direction: a modern interactive website, optional short puzzles/quizzes, real upcoming-event scraping, child privacy and manageable maintenance. Scraping permission for the four institutions is user-confirmed.

## Product outcome

Help children and adolescents discover activities they want to try in Heilbronn, help parents check practical suitability, and give institutions a manageable way to maintain their offerings. Keep the working name **Interest Atlas**. Games are an optional part of a broader interactive experience.

The core experience is a coherent visual learning space. Selecting interests changes the scene and actual matching events. Opening an event preserves context through a detail transition. Saving it gives visible feedback. A short puzzle or quiz provides another route into relevant opportunities. Direct overview and search remain available without playing anything.

The governing requirement map is [REQUIREMENTS.md](REQUIREMENTS.md). [EXPERIENCE.md](EXPERIENCE.md) describes interaction/motion; [SCRAPING_PLAN.md](SCRAPING_PLAN.md) describes live extraction; [IMPORT_WORKFLOW.md](IMPORT_WORKFLOW.md) describes CSV upload and reviewed publication. [TEAM_TASKS.md](TEAM_TASKS.md) assigns concrete work packages. Ishan owns the final art direction and all frontend code.

## Selected features from both plans

- Keep one lively, coherent website: visual interest selection/vision board, upcoming results, purposeful transitions, an optional quiz and small contextual puzzles.
- Keep useful family tools: direct search, practical filters, session shortlist and an adult handoff to the original provider.
- Keep one ingestion core for all four source adapters and a simple CSV upload. Normalize, identify, validate and preview once, regardless of input path.
- Add a downloadable CSV template, row-level status, inline correction, explicit selection and bulk publication of valid reviewed rows. Reuse the current shared offer model rather than introducing a second event schema.
- Add source/theme maintenance forms, clear source-error alerts and last-good-catalog recovery. These controls edit configuration; they do not make arbitrary website formats automatically compatible.
- Keep passport/wish information as optional session/demo features. Do not collect raw child searches to make an analytics dashboard.

Defer PDF/LLM parsing, email ingestion, arbitrary URL import, remembered custom column mapping, automatic publication, geographic heat maps, professional mode and multiple interface languages. XLSX support can follow the first-day CSV path. No unsupported time-saving percentage or judging weight belongs in the pitch.

## Required visitor journey

1. Arrive at an inviting discovery screen and choose to explore interests, get suggestions, or browse upcoming activities.
2. Select interests through labeled objects/chips or an optional three-question visual quiz.
3. Browse source-backed upcoming events with practical search and filters. A compact readable results view is always available.
4. Optionally try a 30-90 second puzzle beside a relevant topic. Feedback offers a route to related activities.
5. Open details, save a few choices for this visit, and show the same activity to an adult.
6. An adult can open the original provider page to check current details and register there. The prototype itself does not book events.

Use child/teen/adult presentation of one catalog, retaining selected interests and event context. Keep preferences, quiz answers and shortlist IDs in memory. A visible reset clears them. No child account is needed.

## Features and owners

| Priority | Feature | Concrete acceptance target | Owner |
| --- | --- | --- | --- |
| P0 | Interactive discovery | One coherent topic scene with working selection, meaningful labels, direct overview/search and touch/keyboard access | Ishan UI, Palash state |
| P0 | Motion and transitions | Selection feedback, animated result changes, event/detail continuity, shortlist feedback and contextual view switching, with reduced-motion equivalents | Ishan |
| P0 | Upcoming-event explorer | Combined query/topic/age/date/format/provider/budget filters using actual fields; unknowns remain explicit | Palash logic, Ishan UI |
| P0 | Four-source scraping | Implement provider-specific extraction for aim, experimenta, Haus der Familie and IPAI; validate source outcomes and retrieve eligible upcoming records where available | Umang |
| P0 | Source-backed details | Exact source link, retrieved/reviewed status, published time/age/cost/location/availability; synthetic fixtures stay separate | Umang data, Ishan UI |
| P0 | Discovery quiz | Three short preference questions; editable results; skip/back/reset; no aptitude or personality claim | Palash behavior, Ishan UI |
| P0 | Compact puzzle | One polished pattern or sequence puzzle, with real evaluation, explanation, retry and related events; shared shell supports a second | Palash evaluation, Ishan UI |
| P0 | Parent handoff/shortlist | Save a few event IDs and open a calm practical view of the same activity; no child-facing booking action | Ishan UI, Palash integration |
| P0 | CSV bulk import | Download one template, upload, see row status, correct cells inline and publish selected valid reviewed rows; blocked rows remain unpublished | Umang service, Ishan screen |
| P0 | Maintenance desk | Refresh/status, source-error alerts, new/changed records and controlled publication in one compact organizer route | Umang service, Ishan screen |
| P0 | Expansion demonstration | Configuration for sources and themes, simple maintenance controls/template, and a demonstrated extra theme without rewriting UI components | Palash schema, Umang config, Ishan controls |
| P1 | Discovery passport | Small session-only record of explored topics, puzzle completion and saved activities | Palash state, Ishan UI |
| P1 | Second puzzle | Add the other pattern/sequence interaction after the complete visitor and maintenance flows work | Palash evaluation, Ishan UI |
| P1 | Missing-opportunity wishes | Fixed choices with clearly labeled demo/session aggregate counts | Umang data, Ishan UI |
| P2 | Extra content | One tiny game, additional puzzles, English interface toggle or cross-device sharing | Only after P0 |

All four institutions are in the required scope. One live adapter is an early vertical-slice milestone, not completion of the four-source requirement. A successfully checked source may genuinely have no upcoming matching activity; show that honestly. A failed or unfinished adapter remains an incomplete item, not proof of no events.

## Live data and maintenance

The user's scraping permission is recorded. Proceed with the named public sources; do not treat permission as pending. Prefer usable structured data or a public data response actually observed in the provider's listing flow, otherwise scoped HTML parsing, with public-page rendering for dynamically loaded records.

Planning probes on 14 November returned HTTP 200 for all four seed pages. aim exposes course links in HTML; Haus der Familie's course area and experimenta's events page need dynamic-data investigation; IPAI exposes dated detail links. These establish entry points, not finished adapters or validated child eligibility.

Run scraping separately from visitor requests. Fetch, normalize, validate, stage changes, review, then publish a cached catalog. Retain the last good catalog on failures. Repeated imports must not duplicate events. An empty result must be distinguished from a changed/broken page layout. See the scraping plan for evidence and date rules.

CSV and scraping feed the same draft/review service. A draft can be corrected without changing the published catalog. Revalidate and recalculate changes after each edit; publish only selected eligible rows against the current catalog/session versions. Unknown price/age stays unknown. Extracting "ab 10 Jahren" never creates an invented upper age. A title change or reschedule never creates a new identity merely because its text/date changed.

Use source facts and deterministic reviewed topic rules. Topic illustrations come from Ishan's design system. A short child-facing summary may be edited by a maintainer, with its provenance preserved. A runtime LLM and automatic factual enrichment are unnecessary.

A nontechnical maintainer should be able to refresh a source, understand errors, review field changes and add a theme/source configuration. A completely different website structure may still need a developer to write an adapter. Demonstrate this distinction rather than promising that every URL works automatically.

## Responsibilities and boundaries

| Person | Deliverables | Files |
| --- | --- | --- |
| **Palash + ChatGPT** | App shell, shared discovery state, quiz/puzzle evaluation, filtering/matching, taxonomy/date/age contract coordination, integrated verification | `src/shared/`, root package/lockfile/config, final integration |
| **Ishan + Claude** | All design, atmosphere, frontend, motion, responsive discovery, puzzle interfaces, details, parent view and desk appearance | UI pages/layout, `src/components/`, `src/styles/`, public artwork |
| **Umang + Claude** | Four adapters, normalization/upcoming rules, CSV/template/row-edit service, shared draft/review API, source configuration, cache/storage and service tests | `src/server/`, `src/app/api/`, `data/`, scraper/service tests |

Palash supplies behavior; Ishan designs and implements how it feels. Umang delivers real records early rather than building a large admin portal first. Root dependencies are integrated once by Palash. Coordinate the existing shared contract's required extension for configurable themes before either consumer forks its own schema.

Each assistant should read its prompt and assigned task sheet: [Palash](tasks/PALASH.md), [Ishan](tasks/ISHAN.md), [Umang](tasks/UMANG.md). Exact acceptance and handoffs are in [TEAM_TASKS.md](TEAM_TASKS.md). No assistant should interpret the alternative plan's final offer to scaffold as an instruction to implement every ingestion path.

## Twelve focused hours within the one day

| Time | Palash | Ishan | Umang | Checkpoint |
| --- | --- | --- | --- | --- |
| H0-H1 | Add app shell without overwriting starter; agree state and taxonomy extension | Choose one art direction, motion system and responsive layouts | Inspect all sources; start aim/IPAI parsing and dynamic-source investigation | One experience, one model, PDF checklist agreed |
| H1-H3 | Connect catalog/filtering; implement quiz and small puzzle evaluators | Build discovery/vision board, results and details using shared fixtures | Deliver first real upcoming record/read API; start CSV normalization into the same draft shape | First live-source vertical slice and stable review example |
| H3-H5 | Integrate interaction and recommendations with actual data | Connect puzzle feedback, saved state, source labels and parent view | Complete remaining adapters; distinguish valid empty results from failures | End-to-end child-to-parent journey |
| H5-H7 | Merge early; verify discovery, row correction, publication and configurable themes | Coherent transitions plus compact Review/Upload and Sources/Themes controls | Finish CSV preview/edit/selected approval, refresh status, deduplication and atomic storage | Source and file updates share one working publication flow |
| H7-H9 | Fix integration; add passport only if stable | Refine phone/keyboard/reduced-motion and all feedback states | Audit all four source outcomes and source evidence | Feature freeze at H9 |
| H9-H11 | Run PDF checklist, checks/build and clean-clone/offline verification | Fix visible defects and capture actual screens | Check a real sample against source pages; verify failure recovery | Repeatable, honestly labeled demo |
| H11-H12 | Rehearse and package | Present interaction/design | Present scraping/maintenance | No new features |

This is a team estimate, not the official event timetable. If only eight hours are usable, shorten the quiz, keep one puzzle and omit passport/wishes/extra decorative effects. Preserve PDF requirements, source coverage, direct discovery/search, essential transitions and parent handoff. If required source integration is unfinished, state the remaining gap rather than calling the project complete.

At H3, exchange a working catalog response and a sample review session. At H5, the visitor journey must work; at H7, source refresh and CSV corrections must reach reviewed publication. At H9 freeze features. Reserve H9-H12 for validation and rehearsal instead of adding new channels or admin dashboards.

## Architecture

Use one Next.js App Router + TypeScript app. Client memory holds preferences and puzzle state; server storage holds published event data and separate staged source evidence. Each provider adapter uses the same normalization boundary. Visitor browsing reads the cached catalog without fetching source websites.

Motion for React is a suggested tool for layout/presence transitions; CSS is sufficient for simple feedback. Ishan chooses implementation and Palash adds dependencies once. This planning revision does not install the animation library or create a website.

Keep the writable organizer desk local until appropriate access control/storage is added for hosting. A bounded local scrape worker/CLI may execute refreshes and expose status to the desk. No arbitrary URL fetching, child account, runtime chatbot or trained recommendation model is needed.

## Definition of done

A clean clone starts using documented commands; the complete journey works at phone/laptop widths; interest/quiz/puzzle actions change actual state; all four source outcomes are evidenced; qualifying source-backed upcoming events reach results; a source change can be reviewed/published; configuration expansion is demonstrated; failures preserve the last good catalog; accessibility/privacy checks are recorded; and an explicitly cached snapshot supports a repeatable offline demonstration.

The existing library is implemented. The website, live adapters, puzzle UI, review service and deployment remain to be built. Original synthetic offers remain labeled demo examples. Record final evidence in [DEMO_CHECKLIST.md](DEMO_CHECKLIST.md).
