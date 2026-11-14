# Interest Atlas: AIM Learning Guide

A one-day hackathon plan for **Palash + ChatGPT, Ishan + Claude, and Umang + Claude**.

Families explore what they want to make or try, discover suitable activities in Heilbronn, and check the important details together. Institutions can review incoming course data and see illustrative gaps in demand.

## Start here

- [The one-day plan and exact task split](docs/PLAN.md)
- [Challenge analysis and source research](docs/RESEARCH.md)
- [Shared data and planned API contract](docs/CONTRACT.md)
- [Branch workflow and file ownership](CONTRIBUTING.md)
- [Final checks and three-person demo script](docs/DEMO_CHECKLIST.md)
- [Original challenge files](reference/README.md)

Agents should begin with [AGENTS.md](AGENTS.md). Claude sessions also have a root [CLAUDE.md](CLAUDE.md) entry point. Both point to the shared plan, contract and the correct person's prompt.

Copy the matching prompt into your assistant:

| Person | Assistant | Prompt | Main responsibility |
| --- | --- | --- | --- |
| Palash | ChatGPT | [Palash's prompt](docs/prompts/PALASH_CHATGPT.md) | Shared logic, app setup, integration and verification |
| Ishan | Claude | [Ishan's prompt](docs/prompts/ISHAN_CLAUDE.md) | All visual design and frontend implementation |
| Umang | Claude | [Umang's prompt](docs/prompts/UMANG_CLAUDE.md) | Provider data, import workflow, API and organizer data |

## What exists now

The linked repository was empty when inspected on **14 November 2026**. This workspace is connected to `https://github.com/patelpalash/aim_project.git` through the `origin` remote.

This starter implements shared TypeScript types, import validation, combined search filters, explainable recommendation ordering, a parent handoff data object, and an import change preview. Eight fictional offers cover all four provider IDs, with a second file demonstrating an update and an addition. They are visibly marked as demo data and have no booking URLs.

**A running website, frontend, API server, live source adapters, import approval/persistence and demand dashboard still need to be built.** The plan and prompts identify their owners. There is no claim that data has been scraped or that the application is deployed. Clone or update the shared `main` branch to get this baseline and the original challenge references.

## Run the shared starter

Use Node.js 24 or newer.

```powershell
npm ci
npm run check
```

`npm test` runs meaningful checks for suitability, unknown fields, synthetic booking protection and import handling. `npm run typecheck` checks the shared TypeScript contract. Neither command starts a website.

Palash's first implementation step is to add a Next.js App Router shell in this same repository, retaining the starter and lockfile. See the plan before creating a new scaffold.

## Product decisions

- Use German interface copy first. Keep the existing German/English data fields so Ishan can add an English toggle if the core flow is finished.
- Keep visitor preferences in memory for the demonstration. Provide a visible reset. A simple adult-view switch demonstrates the handoff; it is not identity or parental-consent verification.
- Use transparent local matching for recommendations. ChatGPT and Claude help the team develop the project; the prototype does not need a paid AI API.
- Distinguish demo records, reviewed source facts and missing information everywhere.

The supplied presentation and learning guide are challenge references. Their suggested work packages informed the plan; the user's one-day limit, named owners and design assignment determine this team's execution.
