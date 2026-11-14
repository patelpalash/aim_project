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

Agents begin with [AGENTS.md](AGENTS.md). Claude also has [CLAUDE.md](CLAUDE.md). Plan revision 2 replaces the earlier planning emphasis; use the current documents together.

| Person | Assistant prompt | Main responsibility |
| --- | --- | --- |
| Palash | [ChatGPT prompt](docs/prompts/PALASH_CHATGPT.md) | App shell, shared state/quiz/puzzle logic, matching and integration |
| Ishan | [Claude prompt](docs/prompts/ISHAN_CLAUDE.md) | All design/frontend, atmosphere, transitions and responsive interaction |
| Umang | [Claude prompt](docs/prompts/UMANG_CLAUDE.md) | Four source adapters, actual upcoming records, APIs/cache and maintenance |

## Implemented versus planned

Implemented: shared TypeScript types, record validation, combined filtering, explainable heuristic matching, a parent handoff data object, import change preview, eight clearly fictional fixtures and focused tests.

Read-only source checks on 14 November 2026 returned public HTML for all four seed pages and inspected one follow-up page per provider. They informed the scraping plan. **They are not finished adapters, a real event dataset or proof of current child eligibility.**

Still to build: the website and motion system, quiz/puzzle interfaces, live source adapters, data normalization/review services, configuration controls and deployment. The raw probe cache is local and ignored. The original challenge files are included unmodified under `reference/`.

## Check the shared starter

Use Node.js 24 or newer:

```powershell
npm ci
npm run check
```

These check types and shared behavior; they do not start a website. Proposed scrape commands in the plan do not yet exist. Palash's first application step is an in-place Next.js shell that preserves the starter, source documents and lockfile.

## Product rules

Keep direct overview/search, the four institutions and AI/coding/gaming scope. Use German copy first, simple labels, keyboard/touch access and reduced motion. Child preferences remain in memory and can be reset. No child account or runtime AI API is needed.

Keep fictional fixtures separate from reviewed source records and cached snapshots. Unknown price/date/age/access is not a confirmed fact. Registration stays with the institution through the adult/practical flow. The maintenance desk should make refresh, review and expansion understandable to a nontechnical person.
