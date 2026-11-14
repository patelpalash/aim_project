# AIM challenge requirements and project traceability

Primary source: [AIM Learning Guide PDF](../reference/aim_Challenge_Learning_Guide_readme.pdf), re-read in full on 14 November 2026. The supplied [presentation](../reference/aim.pptx) provides the challenge story. This map governs the revised team plan.

The PDF opens by describing its guidance as suggestions and its work packages as possible ways to organize the work. It nevertheless has an explicit prototype requirements section. The user now explicitly asks us to follow it. Treat the core requirements as the completion baseline; distinguish illustrative implementation ideas and optional bonuses.

## Core requirements

| ID | Requirement and PDF location | Planned implementation | Acceptance evidence | Owner |
| --- | --- | --- | --- | --- |
| R1 | Consolidate learning/leisure offers for Heilbronn families, pp. 1-2 | One catalog and common event model across the named providers | Trace displayed records to provider pages and inspect combined results | Umang + Palash |
| R2 | Useful to children/adolescents and appealing to adults, p. 2; Package A p. 3 | Child/teen/adult presentation, short labels, simple language and practical parent view | Complete the same journey in each presentation without losing the selected event | Ishan |
| R3 | Creative, appropriate presentation beyond a basic list/calendar, p. 2; Package C p. 4 | Coherent interactive interest scene, purposeful transitions and useful event explorer | Selections change real results; usable accessible overview remains available | Ishan + Palash |
| R4 | Focus aim, experimenta, Haus der Familie and IPAI, p. 2 and pp. 8-9 | Four configured sources and provider-specific extraction | Record a successful check or an explicit unfinished source issue for each; do not invent missing offers | Umang |
| R5 | Low maintenance, ideally manageable without IT expertise, p. 2; Package B p. 4 | Shared scraping/CSV pipeline, template, row statuses/inline correction, selected approval, readable errors and cached data | Nontechnical teammate refreshes a source and corrects/publishes valid selected CSV rows without code editing | Umang + Ishan |
| R6 | Primary themes AI, coding and gaming, p. 2 | Source classification and filters for all three | Inspect tags, sample matching results and reasons; unrelated events do not fill gaps | Umang + Palash |
| R7 | Easy extension to institutions and themes, p. 2; Package B p. 4 | Configurable source/theme definitions and simple edit/import controls; reusable adapter interface | Add a theme without rewriting UI; show how a provider using a supported format is configured | Palash + Umang + Ishan |
| R8 | Overview and search, p. 2; Package D pp. 4-5 | Direct overview, text search, themes/age/date/type filters, plus optional interests/quiz/puzzles | Browse/search without playing; combined filters work on actual data | Palash + Ishan |
| R9 | Demonstrate automated or semi-automated data input, Package B p. 4 | Live scrape, normalization, validation, review and publication | Follow one real record from source response to published result; cover all four adapters as the target | Umang |
| R10 | Human oversight and meaningful source fields, Package B p. 4 | Exact source URL, retrieved/reviewed times, field evidence, invalid/uncertain record quarantine | Inspect a changed date/cost and show approval before publication | Umang |
| R11 | Underage users should not self-register, Package A p. 3 | No in-app booking; child view hands details to an adult; provider link in practical view | Demo records cannot book; adult handoff is explicitly a view, not verified identity/consent | Ishan + Palash |
| R12 | Digital accessibility and understandable interaction, Package A p. 3 | Labels, keyboard paths, readable text, touch alternatives, contrast and reduced motion | Inspect the actual app with keyboard, touch, larger text and reduced motion | Ishan |
| R13 | Minimize children's personal data, guest use and deletion, Package E pp. 5-6 | No child account/name/email/address/birth date; memory-only preferences and visible reset | Inspect data flow and clear session state; separate server source records from visitor state | All |
| R14 | Gentle gamification; careful AI/external service use, Package E pp. 5-6 | Optional short puzzles, no real-name leaderboard/login streaks; no child-facing external AI service needed | Puzzles are skippable; no performance-based restrictions or remote child profiles | All |
| R15 | Verifiable design reasoning and transparent structured code, p. 2; strong-solution discussion p. 7 | Source notes, explicit assumptions, shared contracts, separate ownership and focused verification | Show requirement map, source evidence, module boundaries and checks actually run | Palash |

A failed adapter is a remaining R4/R9 gap, not proof of no upcoming events. A source checked successfully with no qualifying activities may legitimately contribute an honest empty result. All four providers must remain represented and investigated.

## Optional PDF bonuses

The PDF identifies these as bonuses on pp. 6-7: notifications/wishes or missing-demand information, additional guidance such as an AI assistant, multilingual/share/visibility measures, distance calculation and additional professional audiences. The introduction also invites reasons to return and insight into interests. The plan's session passport and demo gap panel address that ambition without making every bonus a required feature.

Do not displace required source/search/maintenance/accessibility work with a chatbot, detailed map, full game editor, email notifications or accounts. Mobile access, simple language and guest use remain sensible core design choices even though some appear among bonus examples.

## User and representative directions incorporated

- User: one day; Palash uses ChatGPT; Ishan and Umang use Claude.
- User: all design/frontend is Ishan's responsibility.
- User reports representative wants distinctive, interactive work, including games/quizzes.
- Latest clarification: the whole website should have an engaging atmosphere and modern motion/transitions; puzzles and discovery must not be overshadowed by games.
- User confirms permission to scrape the four institutions' public event/course pages. Permission is recorded as user-confirmed, not awaiting another approval.
- Latest consolidation: retain the useful shared-pipeline, CSV template/preview/inline-edit/selected-publication and maintainer-control features from the supplied plan. Combine them with the engaging discovery experience; defer complex ingestion channels. Exact task IDs and owners are in `TEAM_TASKS.md`.

These directions determine execution and creative emphasis while the PDF's functional scope remains intact. They do not establish that live adapters, interviews, user outcomes, legal compliance or deployment have already been achieved.

## Facts, assumptions and limits

Twelve focused working hours is a planning estimate, not a supplied organizer schedule. Puzzle/motion timings are design targets, not measured research. Existing sample offers are fictional. Legal references in the PDF require attention but do not amount to a complete legal assessment; guest mode alone is not proof of compliance. The prototype's actual information flows must be explained honestly.
