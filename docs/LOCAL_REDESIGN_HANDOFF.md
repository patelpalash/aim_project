# Local Interest Atlas redesign

**Current continuation:** the parent/admin/language/logo/scale implementation has progressed beyond the original redesign. Use [Ishan's small finishing pass](prompts/ISHAN_FINISHING_PASS.md) and the top of STATUS; the earlier larger prompt is superseded for execution.

The redesign was developed locally on `codex/local-atlas-redesign`, based on Ishan's `f76de4c`. On 15 November the user explicitly authorized publishing this version to main so teammates can fetch it, superseding the earlier local-only instruction. Publication uses `codex/atlas-redesign-handoff` and the normal PR/integration workflow. The original shared working tree is preserved. The next implementation is assigned through [Ishan's five-part prompt](prompts/ISHAN_NEXT_ITERATION.md).

## Preview

- Redesigned site: http://127.0.0.1:3002
- Separate committed-main comparison: http://127.0.0.1:3003 (`334c5e2`).
- Work folder: `C:\Users\acer\Documents\ChatGPT\Interest Atlas local redesign`.
- Start here with `npm run start -- --port 3002` after `npm run build`, or use `npm run dev -- --port 3002` when editing. Stop only this preview's listener before changing servers.

## What changed

The selected Little Big Atlas direction uses cream, forest green, orange, library icons and the generated miniature-world illustration. The catalogue remains the main journey. A more compact desktop introduction brings the event cards closer to the first screen. The existing search, configurable themes, provider/date/age/cost/type filters, list/map views, shortlist, parent view, source coverage and organizer are retained. Audience selection and ages 3–17 are available in the extended filters. Reviewed events precede fictional fixtures in the recommended ordering.

Event tasters now use actual playable interactions instead of multiple-choice answers:

| Subject | Game | Completion rule |
| --- | --- | --- |
| LEGO | Place and remove two sizes of brick in a bridge | Fill both rows and stagger their joints; limited brick supply |
| Robotics | Assemble directional commands and watch the robot move | Reach the flag without a rock or boundary collision |
| Coding / game programming | Programme a rocket using movement and repeat blocks | Reach the flag using a loop within a block budget |
| AI / data literacy | Move numbered shapes between sorting boxes | Every shape satisfies the visible grouping rule |
| World building / Craft Your City | Place parks, solar panels and a pond | Balance the four plots and give every home an adjacent park |

The bridge, route and sorting games have two levels. All games have hints and reset; the city has one deliberately small puzzle. Controls work through buttons rather than requiring dragging. Motion respects reduced-motion preferences. Puzzles are editorial topic tasters, not descriptions of the provider's actual programme, and cannot change event facts or eligibility. The sorting model is explicitly a fixed rule, not real AI.

## Source handoff

Success is reported only after the final game animation finishes. It then opens the exact approved real event source URL in a new tab, once per mounted event detail. The same URL remains available in the detail footer and beside the game without solving anything. Some browsers can block an opening after playback; the visible source link remains the fallback. Booking and availability are handled by the provider, with an adult reminder and full/cancelled notices; there is no in-app ticket purchase or child registration. Fictional and unreviewed records never get this handoff.

Visitor game state stays in memory. Backend adapters, APIs, stored data, shared contracts and review services are unchanged. Cached source coverage limitations are still displayed; this work did not run a fresh scrape.

## Checks and next handoff

`node --test tests/event-games.test.ts` covered eight focused cases. Its first run found an impossible harder bridge inventory; that inventory was corrected and the failed case alone rerun successfully. The other seven passed initially. `npm run build` passed, including TypeScript. The broad existing suite was deliberately not repeated at the user's request.

The browser verified the real LEGO handoff to experimenta, a complete robot run, coding-loop success feedback, shape sorting, save, reset and keyboard close. See `design-qa.md` for visual evidence and limits. Do not treat the earlier main-branch accessibility checklist as proof of every redesigned game at every viewport.

If continuing: use the role branch/PR workflow, focused verification for actual new changes and saved checkpoints at substantial handoffs. The agent cannot read the user's five-hour quota percentage. The original local-only restriction was lifted explicitly for this publication.

## Motion and game follow-up

The 15 November follow-up fixes premature success/source navigation, inaccurate click targets while entrance animations move, and an off-screen Skip control. Event games use cancellable playback, highlighted command steps, a visible Stop action for routes, reset, staggered-joint brick placement with remaining-supply selection, flying shape tiles and a city check animation. Reset/skip/close/level change cancel pending completion. Skip is available in the fixed detail footer as well as beside difficulty options, and moves focus to event facts. Background scrolling is locked during a sheet and restored on close.

Search typing commits immediately. Filters/results use interruptible View Transitions; sheets use stable fade entrances and short exits so interactive controls do not move away from a click. Discovery links scroll smoothly, while programmatic focusing and game control targeting remain stable. Reduced motion bypasses playback delays and decorative movement. No runtime dependency was added for these changes.

## Larger layout and animated homepage world

The next local slice raises the desktop content width from 1320 to 1600 px, headline cap from 43 to 66 px and world width from 410 to 680 px on wide screens. Search, event titles, provider labels, filters and touch controls are larger. The world uses a wider 17:10 viewport around a proportional 3:2 artwork canvas, preserving the artwork's proportions rather than stretching it.

`HeroWorld.tsx` replaces the static hero image wrapper. It layers the retained island illustration, a generated transparent courier robot, a rotating workshop gear, responsive lights and pointer tilt. The robot patrols, then travels to a chosen workshop. Those topic controls call the existing catalogue filter; the match-count control scrolls to events. All configured topics remain reachable, including future topics beyond the three scene hotspots. Pause freezes animated scene elements; device reduced-motion preferences stop automatic motion and pointer tilt. The scene is an imaginary interest world, not a location map or claim of live source freshness. `public/art/atlas-rover.png` is a local generated asset; Next Image serves appropriately sized variants.

Observed before final handoff: scene width 680 px, headline 66 px and content width 1600 px on the wide desktop preview. Coding selection produced 20 rendered cards, the robot arrived at the greenhouse and Pause became pressed. No backend, data or shared contract changes are part of this slice.
