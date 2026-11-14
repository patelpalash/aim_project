# One-day build plan

## Decision

Build **Interest Atlas**, a family learning guide for Heilbronn. A child starts with a concrete intention such as "Build a game" or "Try a robot". An interactive interest view reveals relevant activities. A parent can open the same activity in a practical view with age information, cost, date, provider and source status. A local organizer desk demonstrates how records get updated with human review.

The distinctive combination is exploratory discovery, a useful child-to-parent handoff and visible data maintenance. These are product hypotheses to demonstrate and test. We have not established that no other product offers them.

The team has **one day**, as confirmed by the user. This schedule assumes **12 focused working hours within that day**, about 36 person-hours across three people. Breaks and the remaining calendar time provide buffer. It is an estimate, not an event schedule supplied by the organizer. If only eight working hours are available, use the cut plan below.

## Scope and priorities

| Priority | Feature | Concrete behavior | Owner and budget |
| --- | --- | --- | --- |
| P0 | Shared application shell | One local app, stable imports and a common contract. The current core starter remains intact. | Palash, H0-H1 |
| P0 | Child, teen and parent entry | Same catalog, short child copy, calmer teen treatment and practical adult details. No account required. | Ishan, first UI pass H1-H4 |
| P0 | Interest Atlas and overview | Five labeled interest choices grouped into a navigable visual scene. Choosing one updates real catalog matches. A normal accessible results view remains available. | Ishan UI; Palash matching, H1-H6 |
| P0 | Useful search | Query, topic, age suitability, date range, format, provider and budget. Combine constraints rather than resetting previous selections. Show unknown fields honestly. | Palash shared logic; Ishan controls, H1-H6 |
| P0 | Parent handoff | "Show an adult" opens a readable summary on the same device. Adult view can visit a reviewed provider record. Demo offers cannot book. | Ishan UI; Palash data object, H3-H7 |
| P0 | Four-provider catalog | aim, experimenta, Haus der Familie and IPAI are represented in configuration and clearly labeled demo data. Add real, reviewed offers where verifiable. | Umang, H1-H4 |
| P0 | Review desk | Upload a normalized JSON file, preview added/changed/invalid records, then approve or reject. Published data changes only on explicit approval. Re-import is idempotent. | Umang service; Ishan screen, H3-H8 |
| P0 | Visible provenance | Demo/source badge, retrieval and review times where applicable, unknown price/date/access labels, and pending records hidden from discovery. | All, H4-H9 |
| P1 | Demand gaps | An empty result can show fixed topic choices. Demonstrate organizer totals using synthetic counts in memory. Label them as demonstration data, never resident research. | Umang data; Ishan small desk panel, H7-H9 |
| P1 | Continue exploring | Session-only shortlist and "try a related interest" suggestion. Reset removes the state. This is the proposed reason to return; retention remains unvalidated. | Ishan UI; Palash logic, only after P0 |
| P2 | English interface toggle | Reuse localized fields and a small interface dictionary. | Ishan, only after integrated checks |

In the starter, filters, heuristic matching, the handoff object and preview logic already work as a library. Visual discovery, server endpoints, persistent approval and every screen are still planned. The review desk is a **semi-automated import demonstration**. A JSON upload is not evidence of a live website integration.

## What makes the features specific

### 1. Intentions before institutional categories

"I want to make a game" connects gaming and coding activities from several providers. Child mode uses short labels and recognizable illustrations or icons. Teen mode uses the same intentions without a childish visual treatment. The parent can switch to a compact practical view without losing the chosen activity.

Keep the interaction simple: interest selection, matching activities, detail. Do not spend the day implementing a physics simulation or a 3D world. Keyboard users must be able to reach the same offers. Ishan decides the visual system and the exact scene.

### 2. A clear explanation beside every suggestion

Examples: "Matches game building", "Age 12 is within the published range", "Within your €10 budget". Explanations come from actual record fields. The existing score gives 20 points per matching topic and 15 per matching interest, then sorts ties by date and ID. It is a transparent heuristic, not AI confidence, educational quality or measured suitability.

Unknown age bounds or prices do not satisfy a specific age/budget constraint. A full event may remain visible with its status but must not appear as an immediately bookable recommendation. Cancelled, ended and pending records stay out of public discovery. Do not infer availability just because a page was retrieved.

### 3. One activity, two useful views

The child sees the activity and what they will try. The parent sees practical details and a clearly labeled source status. "Show an adult" is a same-device presentation handoff. It does not authenticate a parent, provide consent or create a registration.

For demo activities, display "Demo activity: not a real listing" and disable provider registration. For reviewed records, use "View provider details" because actual registration and availability remain with the institution. Cross-device QR sharing and calendar export are optional future work.

### 4. Show the maintenance problem being solved

Demonstrate a file containing one price change and one new occurrence. The organizer sees what changed before accepting it. Invalid records show readable reasons. A repeat import produces no duplicate. A failed retrieval never deletes existing activities. Source links and timestamps let the organizer identify information requiring attention.

The proposed future pipeline is provider-approved feed/API where available, otherwise a permitted site adapter, otherwise a staff-managed file. A universal autonomous scraper is outside the one-day scope. Never promise that robots.txt alone grants permission to extract or republish.

### 5. Make a missing activity useful

If "robots + free + age 12" gives no suitable bookable result, offer a few fixed interest choices and a clear alternative to change filters. The organizer's sample panel can show that an interest lacks matching catalog coverage. Use synthetic counts in this prototype. A real anonymous analytics service needs a separate decision about collection, retention and aggregation.

## Exact division between three people

| Person | Owns | Must deliver | Must coordinate |
| --- | --- | --- | --- |
| **Palash + ChatGPT** | `src/shared/`, root tooling, app bootstrap, integration, end-to-end checks and final packaging | Next.js shell, stable contract, working client/server connection, filter/recommendation behavior, final demo and fallback | Freeze contract by H1. Review server inputs with Umang. Take all visual decisions from Ishan. |
| **Ishan + Claude** | All visual design, `src/components/`, `src/styles/`, UI pages/layout and public artwork | Responsive child/teen/parent journey, Interest Atlas, filters, details/handoff, organizer desk UI and accessible states | Consume shared types and Umang's routes. Ask Palash before changing root config or contract. Design the desk; do not build a competing server. |
| **Umang + Claude** | `src/server/`, `src/app/api/`, provider configuration, fixtures, import pipeline and server tests | Validated catalog loader, agreed APIs, import preview/approval, simple persistence/reset, provenance and sample gap totals | Feed Ishan the agreed JSON shape by H2. Use Palash's matching/preview functions. Do not redesign the UI or silently alter shared types. |

Each person owns implementation and verification in their area. Ishan's ownership includes **design and frontend code**, so his work is not limited to a mockup. Umang owns the organizer service and data. Ishan owns how that service appears. Palash integrates and checks the whole application.

## Twelve-hour working schedule

| Time from start | Palash + ChatGPT | Ishan + Claude | Umang + Claude | Checkpoint |
| --- | --- | --- | --- | --- |
| H0-H1 | Bootstrap Next.js in place, retain starter, publish agreed baseline, freeze v1 | Read brief, sketch child/teen/adult paths, choose tokens and layouts | Inspect types, validate fixtures, decide file-backed demo store | Everyone uses the same commit and contract |
| H1-H3 | Connect shared logic to a catalog client; add targeted tests for integration risks | Build responsive entry, interest view, results and detail using fixtures | Build catalog loader and read endpoints; review available provider records | All teammates can load identical offers |
| H3-H5 | Wire search/recommendations and handoff with Ishan; reconcile errors | Connect real endpoints; implement filter and handoff states | Build JSON import preview and approval service | First complete public journey works |
| H5-H7 | Integrate both branches; run the actual phone-width journey | Build organizer desk screen and empty/loading/error states | Finish import idempotence, persistence/reset and per-record rejection | Import change becomes visible only after approval |
| H7-H9 | Resolve integration defects; add optional shortlist only if stable | Polish accessibility and responsive layout; add P1 panel if time | Feed provenance, sample gap totals and reset path to desk | Feature freeze at H9 |
| H9-H11 | Run checklist, verify build, prepare local fallback and demo | Fix only visual/usability defects; capture screenshots | Fix data defects and support repeatable demo reset | All P0 acceptance checks pass |
| H11-H12 | Rehearse together and package the repository | Explain discovery and design decisions | Explain data update and limits | No new features |

Synchronize for five minutes at H1, H3, H5, H7 and H9. Share a working commit and one concrete blocker. Merge small changes early. There is no need for any AI assistant to edit the other person's area independently.

If the working day is only eight hours: reserve the last two hours for integration and rehearsal, use a simple interest scene, keep one JSON format, and drop P1/P2 features. Show gap data only as a labeled future direction. Keep search, all provider IDs, parent handoff and a real import preview/approval loop.

## Architecture and dependency rules

Use one **Next.js App Router + TypeScript** application with route handlers in the same repository. Use CSS or Tailwind according to Ishan's decision at H1. Avoid a separate frontend service, a vector database, authentication setup and a hosted database during the hackathon. A local file-backed demo store is sufficient for the review desk. Do not deploy that writable desk publicly without appropriate access control and durable storage.

```text
Ishan's UI -> agreed /api routes -> Umang's validated catalog/store
                     |                       |
                     +---- Palash's shared types and pure functions
                                             |
                          provider config + reviewed JSON inputs
```

The shared starter has no framework dependency. Palash adds Next.js and React without overwriting `data/`, `docs/`, `src/shared/` or tests. Adapt root TypeScript/build configuration deliberately. A shared contract change belongs to Palash and needs a small example for both consumers.

Dependencies are explicit: Ishan can design and build with fixtures immediately. Umang can build against the same fixtures immediately. Integration waits for the agreed routes rather than two competing data structures. See [CONTRACT.md](CONTRACT.md) for exact field semantics and proposed endpoints.

## Required data and privacy decisions

- Primary themes are AI, coding and gaming. Interests are friendly discovery tags, not permission to broaden to unrelated activities.
- Represent all four required institutions. Seek genuine family-eligible records, but state clearly when a source has no verified matching activity. Never fill a provider's apparent live inventory with invented events. Demo mode may use the supplied labeled examples.
- Preserve individual, family, parent and school-group audiences. The default family view excludes activities offered only to schools or only to parents.
- No child account, name, email, exact home address, birth date or chat input. An optional numerical age used for suitability remains in memory and is cleared by reset.
- No runtime LLM, remote profile, third-party analytics, advertising or map service is needed for the core flow. In-memory state is the deliberate prototype default.
- Render source descriptions as plain text. Umang's server must restrict provider IDs and exact source hosts, cap uploads and select known fields. The library's HTTPS check alone is not a full trust boundary or a fetch security policy.
- Keep the writable organizer desk local for this demo. Public deployment is a separate step. No claim of legal compliance follows from guest mode.

## What to cut first

1. English interface toggle, cross-device QR and calendar export.
2. Shortlist and related-interest path.
3. Gap panel, keeping a clear explanation in the pitch if it is not implemented.
4. Automatic website fetching, which already has a safe reviewed-file fallback.

Preserve accessible discovery, combined search, source honesty, the parent summary and the maintainable import workflow. Do not add a chatbot, social feed, streaks, leaderboards, automatic booking or a trained ML model during this day.

## Completion means

The app starts from documented commands on another machine; the public journey works at mobile and laptop widths; filtered results reflect actual data; no demo offer has a real booking action; an imported change can be reviewed and approved; repeat imports do not duplicate it; no pending activity leaks into discovery; and the demonstration can be reset and repeated without internet access.

These are acceptance targets, not current completion claims. Use [DEMO_CHECKLIST.md](DEMO_CHECKLIST.md) to record the final evidence.
