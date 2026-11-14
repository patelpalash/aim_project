# PDF acceptance checks and demonstration

Consolidated plan revision 3. These checks apply to the application the team will build. Shared-library tests do not complete them. Use [REQUIREMENTS.md](REQUIREMENTS.md) for PDF references, [TEAM_TASKS.md](TEAM_TASKS.md) for owners and [IMPORT_WORKFLOW.md](IMPORT_WORKFLOW.md) for row behavior. Record actual evidence rather than assuming planned features work.

## Acceptance checks

- [ ] R1/R4: All four institutions are represented and their actual source outcomes are recorded. Failed/incomplete extraction is listed as a remaining gap, not no events.
- [ ] R1/R6/R9: Real source-backed upcoming AI/coding/gaming activities reach combined discovery results where available; a record can be traced to its exact provider page.
- [ ] R2: Child/teen/adult presentations serve the same selected activity, with understandable copy and useful practical adult details.
- [x] R3/R8: The interactive scene changes actual interests/results; direct overview/search works without playing or registering. Evidence: browser interest selection changed the displayed matches and preserved the selected offer through the parent handoff.
- [ ] R8: Query/theme/age/date/type/provider/budget constraints combine correctly. Unknown values do not become confirmed suitability or free cost.
- [ ] R9/R10: A fresh source refresh creates staged changes, readable errors and source evidence. Review/approval publishes accepted changes.
- [ ] R4/R9: Dynamic pages use actual rendered/public-response records, not loading placeholders. Page caps and partial coverage are visible.
- [ ] R10: Parsing selects the current event's dates, handles repeated layout text and recurrence, and preserves date-only precision and Europe/Berlin display.
- [ ] R5: A failed, malformed or empty scrape does not delete the last good catalog. A real empty source result is distinguished from failure.
- [ ] R5: Repeat scrape/import/approval does not duplicate events; stale approval is rejected and reset is repeatable.
- [ ] R5: CSV template download and fixed-column UTF-8 upload work, including quoted cells. Scraping and CSV share one normalization/draft/review service and catalog.
- [x] R5: Inline edits revalidate a server-stored draft and increment its revision; published events do not change before approval. Stale edit/publication is rejected. Evidence: 112-check integrated suite and browser date correction; public count stayed 8 during editing.
- [x] R5: A clearly fictional 20-row CSV starts with 18 valid and two blocked rows. After one correction, 19 explicitly reviewed eligible rows can publish; the unresolved row remains unpublished. Evidence: browser upload/inline fix/selection/publication; API 27 offers, `aim-demo-csv-15` excluded. Screenshot: local `.local-analysis/evidence/csv-publication.jpg`.
- [ ] R5/R10: Changed titles and reschedules preserve stable source/occurrence identity, and repeated import adds no duplicate. Unknown ages/costs remain unknown.
- [ ] R5: A nontechnical teammate can refresh a source, understand an error/change and publish a reviewed update without editing code.
- [x] R7: A theme can be added through configuration/controls without rewriting components. Explain configuration versus a new website adapter. Evidence: two `POST /api/admin/topics` additions produced taxonomy v3, with Welten bauen and Apps bauen visible in both public discovery and organizer controls; new providers are explicitly CSV-only until an adapter exists.
- [ ] R11: Child view cannot book in-app; the adult handoff is a practical view, not an identity/consent check. Demo fixtures never offer real registration.
- [ ] R12: Keyboard/touch alternatives, clear labels, visible focus, contrast, larger text and reduced motion work across the actual journey.
- [ ] R13/R14: No child name/email/address/birth date/profile or remote preference/search payload is required. Reset clears in-memory state. No real-name leaderboard or daily-login pressure.
- [x] R15: Clean-clone install/start, type checking, relevant tests and production build pass using documented commands; actual contribution boundaries are recorded. Evidence: fresh GitHub clone `c566abe`, Node 24.18.1/npm 11.4.2, install/118 checks/build passed, production APIs served the then-current 25-offer baseline and taxonomy v3 without runtime data, disabled maintenance returned 404, Git stayed clean. The latest integration also passed `npm ci`, 123 checks and production build; its running API serves 27 offers. See `STATUS.md` and the role reports.
- [ ] User direction: Interest, result, event-detail, shortlist and view transitions feel coherent and preserve context; decorative movement does not block actions.
- [ ] User direction: Optional quiz has skip/back/editable results. At least one polished pattern/sequence puzzle evaluates real input, explains outcomes, supports retry and leads to related events. A second puzzle is added only after core flows work.
- [ ] User direction: Phone/laptop, slow loading, empty results, source failures and cached status have been inspected in the running app.
- [ ] Evidence: Synthetic offers, reviewed source records, cached snapshots and live refresh outcomes are distinguishable. No unmeasured educational/retention or compliance claims.
- [ ] Operations: Writable desk routes are disabled in public configuration; local source refresh accepts configured providers only.
- [ ] Fallback: A reviewed cached snapshot, with retrieval date, supports repeating the journey without internet. It is not described as a fresh fetch.

## Approximately five-minute demonstration

| Time | Person | Actual screen/action | Point to explain |
| --- | --- | --- | --- |
| 0:00-0:30 | Palash | Interactive overview, direct search and provider context | Explain the family problem and actual source/demo mode. |
| 0:30-1:45 | Ishan | Interest/vision-board selection, changing results, one puzzle or quiz | Show coherent motion and useful interaction; play never blocks activities. |
| 1:45-2:30 | Ishan | Event-to-detail transition, shortlist and parent view | Explain practical/source facts and the institutional registration handoff. |
| 2:30-3:15 | Umang | Real source run/status and staged change | Show actual source evidence, four-provider outcomes, controlled updates and cached/live distinction. |
| 3:15-4:15 | Umang | CSV preview, one inline correction, selected publication, remaining blocked row | Demonstrate nontechnical maintenance and shared publication without inventing time-saving metrics. |
| 4:15-4:40 | Umang | Sources/Themes control and optional demo gap panel | Explain configuration and supported adapters honestly. |
| 4:40-5:00 | Palash | Return to discovery and name actual completed scope/gaps | Connect the experience and maintenance to requirements. |

Use only screens that actually exist at rehearsal. If refresh fails, explain the failure and show the labeled cached fallback rather than simulating success. If a source or required feature is unfinished, name it. Optional passport/wish counts must be labeled as session/demo information, not research on real families.

## Handover

Current rehearsal baseline: 27 API records (19 reviewed real offers + eight labeled examples). Reset restores this committed baseline. UMANG-003 keeps the mixed catalog with provenance-based wording; UMANG-004 re-reviewed and published Craft Your City and Code your Chat under the two new interests. The existing screenshot predates those two offers and shows the earlier 17/8 counts.

Provide run/build/check commands, source/theme config, adapter/run evidence, reviewed snapshot provenance, known limitations, a reset path and each person's actual contribution. The source documents contain no separate final submission checklist or official working schedule; add organizer-specific submission instructions when supplied.
