# Interest Atlas: one-day project plan, revision 2

Updated 14 November 2026. This revision supersedes the initial plan and the later games-centered proposal. Follow the AIM challenge PDF, then the user's additional directions: a modern, engaging website throughout, purposeful animation/transitions, short puzzles and quizzes, and scraping of upcoming activities. The user confirmed permission to scrape the four institutions' public course/event pages.

## Product outcome

Help children and adolescents discover activities they want to try in Heilbronn, help parents check practical suitability, and give institutions a manageable way to maintain their offerings. Keep the working name **Interest Atlas**. Games are an optional part of a broader interactive experience.

The core experience is a coherent visual learning space. Selecting interests changes the scene and actual matching events. Opening an event preserves context through a detail transition. Saving it gives visible feedback. A short puzzle or quiz provides another route into relevant opportunities. Direct overview and search remain available without playing anything.

The governing requirement map is [REQUIREMENTS.md](REQUIREMENTS.md). [EXPERIENCE.md](EXPERIENCE.md) describes interactions and motion; [SCRAPING_PLAN.md](SCRAPING_PLAN.md) describes the live data workstream. Ishan owns the final art direction and all frontend code.

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
| P0 | Compact puzzles | Pattern and sequence puzzles sharing one shell, with real evaluation, explanation, retry and a related-events action | Palash evaluation, Ishan UI |
| P0 | Parent handoff/shortlist | Save a few event IDs and open a calm practical view of the same activity; no child-facing booking action | Ishan UI, Palash integration |
| P0 | Maintenance desk | Inspect refresh status, errors and added/changed records; review and publish accepted changes; recover through file import | Umang service, Ishan screen |
| P0 | Expansion demonstration | Configuration for sources and themes, simple maintenance controls/template, and a demonstrated extra theme without rewriting UI components | Palash schema, Umang config, Ishan controls |
| P1 | Discovery passport | Small session-only record of explored topics, puzzle completion and saved activities | Palash state, Ishan UI |
| P1 | Missing-opportunity wishes | Fixed choices with clearly labeled demo/session aggregate counts | Umang data, Ishan UI |
| P2 | Extra content | One tiny game, additional puzzles, English interface toggle or cross-device sharing | Only after P0 |

All four institutions are in the required scope. One live adapter is an early vertical-slice milestone, not completion of the four-source requirement. A successfully checked source may genuinely have no upcoming matching activity; show that honestly. A failed or unfinished adapter remains an incomplete item, not proof of no events.

## Live data and maintenance

The user's scraping permission is recorded. Proceed with the named public sources; do not treat permission as pending. Prefer usable structured data or a public data response actually observed in the provider's listing flow, otherwise scoped HTML parsing, with public-page rendering for dynamically loaded records.

Planning probes on 14 November returned HTTP 200 for all four seed pages. aim exposes course links in HTML; Haus der Familie's course area and experimenta's events page need dynamic-data investigation; IPAI exposes dated detail links. These establish entry points, not finished adapters or validated child eligibility.

Run scraping separately from visitor requests. Fetch, normalize, validate, stage changes, review, then publish a cached catalog. Retain the last good catalog on failures. Repeated imports must not duplicate events. An empty result must be distinguished from a changed/broken page layout. See the scraping plan for evidence and date rules.

A nontechnical maintainer should be able to refresh a source, understand errors, review field changes and add a theme/source configuration. A completely different website structure may still need a developer to write an adapter. Demonstrate this distinction rather than promising that every URL works automatically.

## Responsibilities and boundaries

| Person | Deliverables | Files |
| --- | --- | --- |
| **Palash + ChatGPT** | App shell, shared discovery state, quiz/puzzle evaluation, filtering/matching, configurable taxonomy, integration and verification | `src/shared/`, root package/lockfile/config, final integration |
| **Ishan + Claude** | All design, atmosphere, frontend, motion, responsive discovery, puzzle interfaces, details, parent view and desk appearance | UI pages/layout, `src/components/`, `src/styles/`, public artwork |
| **Umang + Claude** | Four source adapters, extraction evidence, normalization/upcoming rules, APIs/cache, source configuration, review and persistence | `src/server/`, `src/app/api/`, `data/`, scraper/service tests |

Palash supplies behavior; Ishan designs and implements how it feels. Umang delivers real records early rather than building a large admin portal first. Root dependencies are integrated once by Palash. Coordinate the existing shared contract's required extension for configurable themes before either consumer forks its own schema.

## Twelve focused hours within the one day

| Time | Palash | Ishan | Umang | Checkpoint |
| --- | --- | --- | --- | --- |
| H0-H1 | Add app shell without overwriting starter; agree state and taxonomy extension | Choose one art direction, motion system and responsive layouts | Inspect all sources; start aim/IPAI parsing and dynamic-source investigation | One experience, one model, PDF checklist agreed |
| H1-H3 | Connect catalog/filtering; implement quiz and small puzzle evaluators | Build discovery, interest controls, results and details using fixtures | Deliver first real normalized upcoming record and read API | First live-source vertical slice |
| H3-H5 | Integrate interaction and recommendations with actual data | Connect puzzle feedback, saved state, source labels and parent view | Complete remaining adapters; distinguish valid empty results from failures | End-to-end child-to-parent journey |
| H5-H7 | Merge early; verify combined constraints and configurable themes | Apply coherent transitions; build compact maintenance/expansion controls | Finish refresh/status, validation, deduplication, review and storage | Refresh can be reviewed and published |
| H7-H9 | Fix integration; add passport only if stable | Refine phone/keyboard/reduced-motion and all feedback states | Audit all four source outcomes and source evidence | Feature freeze at H9 |
| H9-H11 | Run PDF checklist, checks/build and clean-clone/offline verification | Fix visible defects and capture actual screens | Check a real sample against source pages; verify failure recovery | Repeatable, honestly labeled demo |
| H11-H12 | Rehearse and package | Present interaction/design | Present scraping/maintenance | No new features |

This is a team estimate, not the official event timetable. If only eight hours are usable, shorten the quiz, keep one puzzle and omit passport/wishes/extra decorative effects. Preserve PDF requirements, source coverage, direct discovery/search, essential transitions and parent handoff. If required source integration is unfinished, state the remaining gap rather than calling the project complete.

## Architecture

Use one Next.js App Router + TypeScript app. Client memory holds preferences and puzzle state; server storage holds published event data and separate staged source evidence. Each provider adapter uses the same normalization boundary. Visitor browsing reads the cached catalog without fetching source websites.

Motion for React is a suggested tool for layout/presence transitions; CSS is sufficient for simple feedback. Ishan chooses implementation and Palash adds dependencies once. This planning revision does not install the animation library or create a website.

Keep the writable organizer desk local until appropriate access control/storage is added for hosting. A bounded local scrape worker/CLI may execute refreshes and expose status to the desk. No arbitrary URL fetching, child account, runtime chatbot or trained recommendation model is needed.

## Definition of done

A clean clone starts using documented commands; the complete journey works at phone/laptop widths; interest/quiz/puzzle actions change actual state; all four source outcomes are evidenced; qualifying source-backed upcoming events reach results; a source change can be reviewed/published; configuration expansion is demonstrated; failures preserve the last good catalog; accessibility/privacy checks are recorded; and an explicitly cached snapshot supports a repeatable offline demonstration.

The existing library is implemented. The website, live adapters, puzzle UI, review service and deployment remain to be built. Original synthetic offers remain labeled demo examples. Record final evidence in [DEMO_CHECKLIST.md](DEMO_CHECKLIST.md).
