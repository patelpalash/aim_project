# Ishan + Claude: next Interest Atlas iteration

**Superseded for execution:** Palash has implemented most of this scope. Continue with [the small finishing pass](ISHAN_FINISHING_PASS.md); the detailed specification below is historical/reference context, not an instruction to rebuild completed work.

You are Ishan's Claude, the design/frontend owner for **Interest Atlas**. Repository: `https://github.com/patelpalash/aim_project.git`. Palash is handing this iteration to you because his usage allowance is exhausted. Implement the five work packages below and finish their browser acceptance. Preserve the backend and actual source evidence. Work autonomously within this scope; do not stop at a proposal.

## 0. Fetch the correct website and establish context

Use an existing checkout if available. Inspect `git status` and preserve all unrelated work before updating. Fetch `origin/main`, create or reuse `codex/ishan-design`, then merge `origin/main` through the normal workflow; never reset, force-push, or replace the new website with an older design. If your session requires a different branch prefix, use a permitted feature branch and record it.

Read `AGENTS.md` in its reading order, `CLAUDE.md`, the AIM challenge PDF under `reference/`, `docs/REQUIREMENTS.md`, plan revision 3, `docs/EXPERIENCE.md`, your role/task sheets, `docs/COLLABORATION.md`, `docs/IMPORT_WORKFLOW.md`, `docs/CONTRACT.md`, `docs/LOCAL_REDESIGN_HANDOFF.md` and `design-qa.md`. New instructions in this prompt refine revision 3; the challenge's core requirements remain mandatory.

The starting redesign includes `166f6b8`, `51ef1a6` and `20c4e62`: cream/forest/orange styling; an animated interest island; actual topic filtering; an in-memory shortlist; event-specific bridge, robot, coding-loop, shape-sorting and city games; a fixed Skip control; exact reviewed source-page handoff. Keep these useful behaviours. The three illustrated hotspots are not a geographic map. Provider coverage is cached and partly incomplete; do not advertise it as live.

Use Node.js 24+. Run `npm ci` when dependencies need installation. `npm run dev` starts the public app; `npm run check` checks route types, TypeScript and tests; `npm run build` builds production. Use one focused verification per changed behaviour and one final integration check/build. Avoid repeated full-suite runs when nothing relevant changed.

## 1. Fix the website's scale, proportions and homepage hero

The user still finds the entire site too small and the proportions awkward. Make the application feel spacious and appropriately sized, with a substantially larger animated world. Preserve the selected visual direction while improving composition; merely enlarging the headline or applying browser zoom is insufficient.

- Inspect the current running page at desktop and phone sizes before editing. Current wide-screen caps are a 1600 px content wrapper, 680 px world and 66 px headline; the inner art remains proportional at 3:2 inside a 17:10 viewport. Identify which constraints create the cramped appearance.
- Use more of the usable desktop width, with a coherent fluid grid, readable event titles/body text and comfortable search/filter controls. Start around 90–94% usable width on common desktops, with a sensible large-screen maximum; measure the result instead of following these numbers blindly.
- Give the island more visual presence and balanced space relative to the copy. Preserve image proportions, complete artwork, legible hotspots, courier travel, gear/lights, pause and reduced motion. Correct their alignment after resizing. Avoid a huge empty splash screen: this product primarily shows events, and search, direct browsing and overview controls must stay easy to reach.
- Simplify redundant spacing and CSS overrides rather than stacking more conflicting breakpoints. Keep the scene's topic controls connected to actual filter results and its count button connected to the catalogue. Do not hardcode the seven current interests or exclude future configured themes.

Relevant files: `src/components/atlas/Discovery.tsx`, `HeroWorld.tsx`, `hero-world.css`, `atlas-redesign.css`, `EventCard.tsx` and the existing styles/tokens. Preserve the useful games and their always-visible Skip control.

## 2. Repair German/English switching

The user reports unreliable language switching. Reproduce it in the actual app, then fix the cause across public discovery, games/details, parent view and organizer. Inspect `src/components/i18n.tsx`, `strings.ts`, `src/shared/i18n.ts`, formatters and all newly added UI.

- DE/EN clicks must consistently change visible UI, `<html lang>` and `aria-pressed`. The explicitly chosen language wins over browser/stored-language initialization. Preserve that choice across reload and `/` ↔ `/organizer`, including when storage is unavailable.
- Preserve filters, saved IDs, selected event and parent/child mode. A language click must not reset the journey or cause unnecessary catalogue reload/flicker. Inspect `Discovery`'s locale-dependent loading callback and abort/race handling as possible causes; do not treat this as a confirmed diagnosis without checking.
- The supplied screenshots show Chrome automatic translation. Distinguish that from application translation, retain appropriate app-level translation opt-out and verify the app's own controls. Do not change the user's global browser settings.
- Source-provided German event text may legitimately have no English translation. Keep a clearly explained source-language fallback; never invent translations of dates, ages, prices or booking facts. Preserve backend source-run messages as source detail unless the existing contract supplies localized text. Interface headings, controls, validation explanations and empty/error states should use the chosen locale.

Acceptance: switch both directions on every main surface; switch inside an open event; reload and navigate between public/organizer routes; retain a saved event and filter selection; verify a denied-storage fallback. No mixed-language interface caused by hardcoded new labels.

## 3. Complete the existing administrator/organizer workflow

**The admin logic is already implemented.** The user cannot find/use it in the redesigned experience, so investigate discoverability, configuration, UI wiring and actual end-to-end gaps. Do not rebuild the backend or create a second catalogue/review store.

Current entry point: `/organizer` → `src/components/organizer/OrganizerDesk.tsx`, `api.ts`, `organizer.css`. Existing routes live under `/api/admin/*`, with services in `src/server/review/` and `src/server/catalog/`. Palash observed `/organizer` HTTP 200 and `/api/admin/summary` reporting 19 reviewed real records on the enabled local preview; this is not a fresh test of every write operation.

For local maintenance, set `INTEREST_ATLAS_LOCAL_DESK=1` and use loopback. PowerShell example: `$env:INTEREST_ATLAS_LOCAL_DESK='1'; npm run dev`. Keep the disabled-desk explanation clear. **Do not remove the environment, loopback or same-origin guards, equate parent mode with administrator access, or expose maintenance writes publicly.** Hosted authentication/storage are separate requirements if publishing an admin service is later authorized.

Follow the current signatures in `api.ts`, route handlers and contracts; older plan tables may describe proposed shapes. Complete and verify this one shared flow:

1. Clear local admin entry, provider selection and honest source/cache/error status for aim, experimenta, Haus der Familie and IPAI.
2. Source refresh, progress polling, result staging and understandable failed/partial/empty extraction states. Refresh stages candidates; it never publishes automatically.
3. Download the actual UTF-8 CSV template, upload, preview rows with state/evidence/diff, show readable validation errors and preserve uncertainty. Intake limit remains 1 MB / 100 rows.
4. Allowlisted inline correction and server revalidation, preserving stable IDs, original evidence and session revisions. Show stale revision conflicts with a recovery path.
5. Select eligible rows, explicitly confirm review and publish only the selected valid reviewed rows. Blocked rows cannot publish. Reflect publication counts/version in the same public catalogue; repeated imports must not duplicate records.
6. Existing provider/theme controls: edit configured labels, enable/disable safely and reflect validated taxonomy in discovery. New site structures still require adapters; configuration is not proof of a working new scraper.

Use an isolated local demo/reset environment for mutation checks. Never erase a teammate's real runtime reviews or rewrite cached source facts for a demonstration. Demonstrate a valid selection, an unresolved blocked row, one correction, a stale update/approval and a repeat import through the shared service. Reuse the fixture/template and existing service tests. Keep synthetic offers and synthetic demand metrics visibly labelled. Avoid arbitrary URL import, XLSX/PDF/LLM ingestion and child profiles; those remain deferred.

You own the organizer frontend and wiring. If a small service defect actually blocks this scope, record the exact failing contract and affected files, coordinate it in your owner report and make the narrow necessary fix without inventing a parallel backend. Do not claim this workflow is complete merely because controls render.

## 4. Build a genuinely separate, simple parent experience

The user explicitly wants a completely different parent UI: practical listed events and easy access to provider registration.

- Clicking **For parents** must show the full family activity catalogue in a calm, clearly organized list. It must not merely open the saved-events sheet or filter down to parents-only talks. Keep the shortlist as a separate optional planning tool.
- Remove the illustrated hero, roaming robot, child games/quizzes, interest-adventure copy and unnecessary decorative animation from this mode. Use a compact header, search, date/child-age/provider/cost controls, useful sorting and a clear return to children's discovery.
- Use readable event rows: title, provider, date/time or honest unknown/date-only precision, age evidence, price, venue/access and availability. Put a clear **View event / Check registration** action on each reviewed real row. Use the exact event source URL, not a provider homepage. Mark fully booked/cancelled/unknown status; never imply availability or a confirmed reservation.
- The practical source action is available immediately. No puzzle or in-app child registration precedes it. Fictional demos retain their label and have no booking link. Preserve the same data, filters, saved items and locale when switching presentations; remove child visuals through rendering/layout rather than hiding the entire catalogue.

Acceptance: start with nothing saved, enter parent mode and browse all appropriate activities; filter and open an exact provider event page; save/remove; return to the child view without losing selected language/shortlist. Parent mode is a presentation, not identity verification or admin authorization.

## 5. Replace the logo

Create a distinctive, coherent **Interest Atlas** identity that suits children and remains credible in the parent/admin views. Replace the current generic compass mark. Deliver a real logo asset, legible wordmark, compact mark and favicon/app metadata as appropriate. Keep it sharp at small sizes, accessible on the selected backgrounds and linked to home with a useful accessible name. Do not use an emoji or placeholder as the finished logo. Show it in the public, parent and organizer headers.

## Preserve, verify and publish

The AIM PDF remains the acceptance source: four institutions; AI/coding/gaming; direct overview/search; maintainable and extensible intake; accessibility; minimal child data. Puzzles remain optional. Real data requires actual provenance/review; cached/fictional/held records and unknown facts stay distinguishable. No external AI calls or visitor profiles are needed.

Verify the five requested changes at roughly 390, 768, 1440 and 1920 px; capture before/after desktop and phone views, inspect proportions and overflow, keyboard focus, reduced motion and long event titles. Run focused checks after relevant edits, then one final `npm run check` and `npm run build`. Fix actual failures rather than adding repetitive tests. Record what was tested and remaining limits; do not promise error-free/compliant/deployed software without evidence.

Work on your feature branch, update only `docs/coordination/ISHAN.md`, commit small working slices and push them normally. Open a PR to `main` with the five acceptance sections, commit SHA, actual checks, screenshots and any remaining blockers; do not force-push or overwrite teammates. Keep changes checkpointed if usage becomes low. Follow the repository's integration workflow rather than silently replacing `main`.

Start now by fetching the redesign from `main`, checking the actual UI/admin behaviour and implementing the parent layout and scale fix. Continue through language, admin completion and logo until the requested scope is handled.
