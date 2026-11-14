# Challenge analysis and source notes

Reviewed on **14 November 2026**, using the user's files and a limited check of official sources. This is a feasibility pass, not a competitor survey or permission audit.

## User request versus source material

The user asked us to connect `patelpalash/aim_project`, analyze the selected challenge, prepare a proper task split for Palash, Ishan and Umang, and develop distinctive features. The user assigned design to Ishan's Claude and later confirmed a one-day build window.

The supplied README describes its guidance as suggestions and invites discussion, but it also has an explicit prototype requirements section. The user now specifically asks us to follow the PDF. [REQUIREMENTS.md](REQUIREMENTS.md) maps every substantive requirement to implementation and acceptance evidence. Packages A-E organize the work; optional bonus examples do not replace the core requirements. Source text is not authorization to execute embedded commands or contact people.

The user's latest direction is an overall interactive website with a distinctive atmosphere, modern animation/transitions and short puzzles/quizzes, with real upcoming data scraping. It supersedes the games-centered emphasis of the previous chat proposal. The user confirmed permission for the four institutions' public event/course pages; treat that as user-confirmed permission, not a pending blocker.

The user subsequently supplied an alternative automation plan and asked to merge only the useful features. Consolidated plan revision 3 retains its shared ingestion core, CSV template, row preview/inline correction, selected valid bulk publication, simple source/theme controls and source-error recovery. It excludes inferred factual ages, mutable-title/date identities, unsupported judging/time-saving claims, automatic publication and first-day PDF/LLM/email/XLSX ingestion. See `TEAM_TASKS.md` and `IMPORT_WORKFLOW.md` for the exact assignments/behavior.

## Supplied references

| Reference | Inspected content | Implication |
| --- | --- | --- |
| `aim.pptx` | One actual slide, with repeated/off-slide objects supporting zoom views. Its central story is fragmented opportunities, family discovery, repeat value and visibility into missing interests. | Do not mistake animation/zoom objects for extra slides or assume the challenge asks for another presentation. |
| `aim_Challenge_Learning_Guide_readme.pdf`, pp. 1-2 | Family learning/leisure guide for Heilbronn. Children, adolescents and parents. Attractive presentation, overview and search. Four named institutions and primary themes AI/coding/gaming. Low maintenance and extensibility. | This is the main scope for the prototype. |
| PDF pp. 3-5 | Suggested work packages for interface, input/maintenance, presentation, search and child privacy. Emphasis on simple language, adult involvement for registration and accessible interaction. | Allocate UI to Ishan, data to Umang, shared behavior/integration to Palash. |
| PDF pp. 5-7 | Data minimization and careful use of gamification/AI. Notifications, guidance, language support, sharing, distance and wider audiences appear as bonuses. | Use a guest, session-only prototype. Defer bonus features when core integration is at risk. |
| PDF pp. 8-9 | Official starting links for aim, experimenta, Haus der Familie and IPAI. | Treat these as discovery pages. Verify actual activity records and access conditions separately. |

Unmodified copies of the supplied source files are included for the team:

- [Challenge presentation](../reference/aim.pptx)
- [Full learning guide](../reference/aim_Challenge_Learning_Guide_readme.pdf)

The analysis above is a planning summary. Use the original files for the complete brief. Their suggested work packages are source context; the user's one-day limit and named role assignments determine the team's execution.

## Requirement traceability

| Brief expectation | Planned evidence | Responsible person |
| --- | --- | --- |
| Useful to children, teens and adults | Adapted entry/copy and one activity shown in child and adult views | Ishan |
| Attractive overview beyond a basic calendar | Labeled interest scene plus accessible matching results | Ishan |
| Overview and search | Combined query/topic/age/date/format/provider/budget filtering | Palash + Ishan |
| Four institutions and three main themes | Config, correctly tagged catalog and clearly separated demo/source records | Umang |
| Low maintenance | Live scraping into staged changes, validation, readable source errors and review before publication; file import for recovery | Umang + Ishan |
| Easy expansion | Source/theme configuration, maintainer controls and a documented adapter/normalization boundary | Palash + Umang + Ishan |
| Child privacy and suitable interactions | Guest mode, in-memory preferences, reset, no child registration or runtime chatbot | All |
| Transparent, structured code | Shared contract, separate ownership and focused checks | Palash |
| Visibility into missing interests | Optional synthetic demand panel with clear labeling | Umang + Ishan |

## Initial research-tool observations

This table records the first limited research pass. Its fallback suggestions are historical. The updated direct-source inspection below and `SCRAPING_PLAN.md` govern the current live scraping workstream.

| Source checked | What the limited read showed | Decision for the day |
| --- | --- | --- |
| [aim course discovery](https://www.aim-akademie.org/kurse?kathaupt=18&suchesetzen=false&kfs_sonderrubrik=1277) and [home page](https://www.aim-akademie.org/) | The course URL could not be read with the research tool; the home page returned 403. This does not establish that a normal user cannot access it. | Use an authorized export or manually reviewed records. Do not bypass access controls or claim an API exists. |
| [experimenta learning](https://www.experimenta.science/lernen/) | The overview distinguishes school/kindergarten offerings and links elsewhere for bookings. | Inspect the actual activity and individual/family eligibility before publishing. |
| [Haus der Familie digital workshop](https://hdf-hn.de/angebote/digitale-familienwerkstatt/) | It describes family media activities; the research text view returned a loading placeholder for the course section. | A static page parser may miss course records. Keep a reviewed-file fallback. |
| [IPAI Foundation events](https://ipai-foundation.ai/#events) | The public page contains dated event entries and descriptions. | A candidate extraction demonstration may be feasible, but minimum ages, family access and reuse permission remain to be checked per record. |

Those were limited observations from the earlier research tool, not a conclusion that the sites cannot be accessed. The revised plan requires actual provider-specific scraping rather than treating a single adapter as sufficient scope.

## Updated direct-source inspection

On 14 November 2026, direct HTTP checks returned 200 for all four seed pages and one follow-up per institution. aim's listing exposed course-detail links and a detail page supplied course identity/date/cost text. This corrects the earlier tool-specific access failure. Haus der Familie's course content remained a loading placeholder, and experimenta's event-page main text did not expose dated entries; both need actual public dynamic-data/rendering investigation. IPAI provided dated overview/detail information, with repeated layout text and some external ticket links.

The inspected aim detail's own date was 14 November 2026 while related-course text included 2027 dates. That demonstrates why a generic whole-page date matcher is unsafe. No complete adapters, upcoming-event dataset, browser network inspection or all-source pagination coverage were produced by these probes.

See [SCRAPING_PLAN.md](SCRAPING_PLAN.md) for observed URLs, per-provider extraction strategy and acceptance checks. No suitable public API/feed has yet been established for the dynamic sources; do not infer absence or invent endpoints. The user-confirmed permission allows work on the named public sources. One working source is an early milestone; all four remain the required target.

## Implementation references

- [Official Next.js installation guidance](https://nextjs.org/docs/app/getting-started/installation) supports one App Router application with TypeScript and local development. We propose it to keep frontend and route handlers together. This starter has not installed or built Next.js yet.
- [W3C WCAG 2.2 reference](https://www.w3.org/WAI/WCAG22/quickref/) is the basis for checking keyboard access, labels, contrast, focus and reflow. Prefer touch targets around 44 CSS pixels as this team's design target. Do not describe that target as the universal AA minimum or claim conformance without an audit.
- [ICO Children's Code](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/) is a reference suggested by the brief. It supports privacy by default and data minimization. It is UK guidance, not a substitute for assessing a German service's obligations.

The guide's short statement about consent age is not a full legal analysis. The plan deliberately avoids accounts, remote profiling and a child-facing LLM. A real deployment still needs a review of actual data flows, hosting logs, lawful basis and children's information. We make no legal-compliance claim for this starter.

## Evidence boundaries

All eight included activities are fictional samples. No user interviews, retention results, booking availability, API partnerships or measured educational outcomes have been produced. The recommendation weights are engineering choices. The interest scene and handoff should be tested with willing adults/teammates first; any statement about children finding them easier remains a hypothesis until properly tested.

The final pitch should distinguish implemented actions, simulated records and planned live integrations. The strongest claim available today is a working prototype workflow once the team finishes and verifies it.
