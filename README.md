# Interest Atlas: AIM Learning Guide

A one-day project for **Palash + ChatGPT, Ishan + Claude and Umang + Claude**. Families explore interests through an engaging website, discover upcoming activities in Heilbronn, and check practical details together.

**Latest direction:** follow the AIM challenge PDF; create a distinctive atmosphere across the whole website with useful animation/transitions, optional short puzzles/quizzes and genuinely scraped upcoming events. A standalone gaming area is optional. The user has confirmed permission for scraping the four named institutions' public course/event pages.

## Start here

- **[Ishan's small finishing pass](docs/prompts/ISHAN_FINISHING_PASS.md)** — parent/admin/language/logo/scale work is now implemented; only bounded visual/manual checks remain.
- **[Ishan's next iteration: scale/hero, language, admin, parent UI and logo](docs/prompts/ISHAN_NEXT_ITERATION.md)** — latest user continuation after the interactive redesign.
- [Redesign implementation and handoff](docs/LOCAL_REDESIGN_HANDOFF.md), [visual/browser evidence and limits](design-qa.md)
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
- [P1-P4 bootstrap, behavior and contract handoff](docs/HANDOFF_PALASH.md)

Agents begin with [AGENTS.md](AGENTS.md). Claude also has [CLAUDE.md](CLAUDE.md). **Consolidated plan revision 3** is the single merged plan. Read [the three-person execution board](docs/TEAM_TASKS.md) and [the shared CSV/import workflow](docs/IMPORT_WORKFLOW.md) alongside the existing requirement/experience/scraping documents.

| Person | Assistant prompt | Main responsibility |
| --- | --- | --- |
| Palash | [ChatGPT prompt](docs/prompts/PALASH_CHATGPT.md), [task sheet P1-P5](docs/tasks/PALASH.md) | App shell, shared behavior/model, matching, integration and verification |
| Ishan | [Claude prompt](docs/prompts/ISHAN_CLAUDE.md), [task sheet I1-I6](docs/tasks/ISHAN.md) | All design/frontend, motion, visitor journey and review/config controls |
| Umang | [Claude prompt](docs/prompts/UMANG_CLAUDE.md), [task sheet U1-U6](docs/tasks/UMANG.md) | Four adapters, CSV intake, common review API, cache/storage and source evidence |

Selected additions from the supplied plan: downloadable CSV template, row-level preview, inline corrections, selected valid bulk publication, simple source/theme controls and source-error recovery. Keep one ingestion core. The CSV/review services and UI are integrated; remaining controls and acceptance gaps are listed in `docs/STATUS.md`. PDF/LLM/email/arbitrary-link ingestion, XLSX parsing, automatic publication and heat maps are deferred.

## Languages

The interface is available in German and English. A DE/EN switch sits in the header of both `/` and `/organizer`; the choice is stored in that browser only and also sets `<html lang>`. German is the source language, so anything without an English translation appears in German rather than as a placeholder. Interface copy lives in `src/components/strings.ts`; record content (offer titles, summaries, taxonomy labels, quiz and puzzle text) is bilingual in the shared contracts and read with `pick()` from `src/shared/i18n.ts`. Status messages produced by a source run stay German by design and are shown as extra detail under a translated status line.

## Implemented versus planned

Implemented and integrated: Ishan's discovery/detail/map/shortlist/parent/quiz/puzzle frontend, audience/topic controls and organizer maintenance forms; Umang's four adapters, reviewed baseline, public APIs, CSV/review/publication/refresh/configuration services; Palash's shared contracts/state and integration fixes. Final integration and demo rehearsal (temporarily run by Umang while Palash's session was unavailable) passed **`npm ci`, `npm run check` (123/123 tests) and `npm run build`** on Node.js 24.22.3 in a clean worktree, plus browser and API rehearsals; see [STATUS.md](docs/STATUS.md). Ishan's final frontend acceptance (`c072a22`: phone-width and 200 %-text layout fixes) is integrated and re-checked on the merge. Read current catalog counts from `GET /api/offers` (at the final rehearsal: 27 offers = 19 reviewed real + 8 labelled fictional examples).

Initial read-only source probes informed the scraping plan. Implemented adapters and the later reviewed records now have separate evidence in `data/source-runs/` and `data/catalog/`. Source coverage remains partial where indicated; general adult IPAI records and unsupported online venues remain held.

Not done: hosted deployment, contrast/large-text and slow-network/offline checks, and a usability check with an actual nontechnical organizer. Remaining open items are listed in [DEMO_CHECKLIST.md](docs/DEMO_CHECKLIST.md). Original challenge files and the eight demo fixtures remain unmodified.

## Run and check the bootstrap

Use Node.js 24 or newer. Open http://127.0.0.1:3000 (visitors) and http://127.0.0.1:3000/organizer (local maintenance desk).

```powershell
npm ci
npm run dev
```

Demo with the maintenance desk enabled (PowerShell):

```powershell
npm run build
$env:INTEREST_ATLAS_LOCAL_DESK = "1"; npm run start
```

macOS/Linux shell:

```bash
npm run build && INTEREST_ATLAS_LOCAL_DESK=1 npm run start
```

For verification and the production server:

```powershell
npm run check
npm run build
npm run start
```

`dev` starts the app on loopback port 3000. `check` regenerates route types and runs type/test checks; `build` creates the production app; `start` serves that build. For `/organizer` maintenance, set `$env:INTEREST_ATLAS_LOCAL_DESK = "1"` before starting; leave it unset for the public read-only configuration. Scraping CLI: `node src/server/scraping/cli.ts --provider all --window-days 180` stages records, never automatically publishes them; after a refresh, `node src/server/review/apply-review.ts --dry-run` reconciles the recorded review decisions (changed rows are held for a fresh review). `POST /api/admin/reset` with body `{"resetDemo":true}` (local desk only; there is no reset button in the UI) restores the committed reviewed baseline. The original fixtures and source documents are preserved.

## Product rules

Keep direct overview/search, the four institutions and AI/coding/gaming scope. Use German copy first, simple labels, keyboard/touch access and reduced motion. Child preferences remain in memory and can be reset. No child account or runtime AI API is needed.

Keep fictional fixtures separate from reviewed source records and cached snapshots. Unknown price/date/age/access is not a confirmed fact. Registration stays with the institution through the adult/practical flow. The maintenance desk should make refresh, review and expansion understandable to a nontechnical person.

### Hosted demo admin (password-protected)

To use `/organizer` on a hosted deployment (e.g. Vercel), set `INTEREST_ATLAS_ADMIN_PASSWORD` (at least 8 characters) in the hosting project's environment variables and redeploy. Never commit the password or share it in chat.

- Organizers sign in at `/organizer` with that shared password; the browser gets a signed, HttpOnly, SameSite=Strict cookie valid for 8 hours. "Sign out" clears it. Wrong passwords are slowed down; writes must come from the same site.
- On Vercel (`VERCEL=1`) the file system is read-only, so the desk works on a temporary copy of `data/` in `/tmp`. Uploads, publications and theme/source edits are **temporary**: they reset on the next deployment or instance restart and are not shared between server instances. The desk shows this notice.
- Source refresh (scraping) is local-only in the hosted demo (`409 REFRESH_LOCAL_ONLY`); stored source runs can still be reviewed.
- This is a demo safeguard with one shared password, not individual accounts or production authentication. Without the variable (and without `INTEREST_ATLAS_LOCAL_DESK=1`) every maintenance route stays 404.
