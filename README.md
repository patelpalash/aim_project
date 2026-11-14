# Interest Atlas: AIM Learning Guide

A one-day project for **Palash + ChatGPT, Ishan + Claude and Umang + Claude**. Families explore interests through an engaging website, discover upcoming activities in Heilbronn, and check practical details together.

**Latest direction:** follow the AIM challenge PDF; create a distinctive atmosphere across the whole website with useful animation/transitions, optional short puzzles/quizzes and genuinely scraped upcoming events. A standalone gaming area is optional. The user has confirmed permission for scraping the four named institutions' public course/event pages.

## Start here

- [AIM PDF requirements and acceptance map](docs/REQUIREMENTS.md)
- [Revised one-day plan and task split](docs/PLAN.md)
- [Whole-website interactions and motion](docs/EXPERIENCE.md)
- [Four-source scraping and maintenance plan](docs/SCRAPING_PLAN.md)
- [Shared data and planned API contract](docs/CONTRACT.md)
- [Source research and evidence limits](docs/RESEARCH.md)
- [Branch workflow and ownership](CONTRIBUTING.md)
- [Final checks and demonstration](docs/DEMO_CHECKLIST.md)
- [Original challenge files](reference/README.md)
- [Current implementation status and bootstrap handoff](docs/STATUS.md)
- [P1/P2 contract handoff and examples](docs/HANDOFF_PALASH.md)

Agents begin with [AGENTS.md](AGENTS.md). Claude also has [CLAUDE.md](CLAUDE.md). **Consolidated plan revision 3** is the single merged plan. Read [the three-person execution board](docs/TEAM_TASKS.md) and [the shared CSV/import workflow](docs/IMPORT_WORKFLOW.md) alongside the existing requirement/experience/scraping documents.

| Person | Assistant prompt | Main responsibility |
| --- | --- | --- |
| Palash | [ChatGPT prompt](docs/prompts/PALASH_CHATGPT.md), [task sheet P1-P5](docs/tasks/PALASH.md) | App shell, shared behavior/model, matching, integration and verification |
| Ishan | [Claude prompt](docs/prompts/ISHAN_CLAUDE.md), [task sheet I1-I6](docs/tasks/ISHAN.md) | All design/frontend, motion, visitor journey and review/config controls |
| Umang | [Claude prompt](docs/prompts/UMANG_CLAUDE.md), [task sheet U1-U6](docs/tasks/UMANG.md) | Four adapters, CSV intake, common review API, cache/storage and source evidence |

Selected additions from the supplied plan: downloadable CSV template, row-level preview, inline corrections, selected valid bulk publication, simple source/theme controls and source-error recovery. Keep one ingestion core. PDF/LLM/email/arbitrary-link ingestion, XLSX parsing, automatic publication and heat maps are deferred. These workflow additions are specifications, not implemented endpoints or files yet.

## Implemented versus planned

Implemented: the Next.js shell/alias, configurable taxonomy, date-only/DST and age-evidence behavior, filtering/matching/handoff/import preview, catalog/review types and pure guards, validated fictional examples and focused tests. See [STATUS.md](docs/STATUS.md) and [HANDOFF_PALASH.md](docs/HANDOFF_PALASH.md). Actual backend routes and atomic publication are not implemented by those helpers.

Read-only source checks on 14 November 2026 returned public HTML for all four seed pages and inspected one follow-up page per provider. They informed the scraping plan. **They are not finished adapters, a real event dataset or proof of current child eligibility.**

Still to build: Ishan's interactive website/motion, quiz/puzzle interfaces, Umang's live adapters and normalization/review services, configuration controls and deployment. The raw probe cache is ignored. Original challenge files remain unmodified under `reference/`.

## Run and check the bootstrap

Use Node.js 24 or newer:

```powershell
npm ci
npm run dev
```

For verification and the production server:

```powershell
npm run check
npm run build
npm run start
```

`dev` starts the local shell on loopback port 3000. `check` regenerates route types and runs type/test checks; `build` creates the production app; `start` serves that build. Proposed scrape commands in the plan do not yet exist. The shared starter, fixtures and source documents are preserved.

## Product rules

Keep direct overview/search, the four institutions and AI/coding/gaming scope. Use German copy first, simple labels, keyboard/touch access and reduced motion. Child preferences remain in memory and can be reset. No child account or runtime AI API is needed.

Keep fictional fixtures separate from reviewed source records and cached snapshots. Unknown price/date/age/access is not a confirmed fact. Registration stays with the institution through the adult/practical flow. The maintenance desk should make refresh, review and expansion understandable to a nontechnical person.
