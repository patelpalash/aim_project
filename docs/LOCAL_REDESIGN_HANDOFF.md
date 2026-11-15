# Local Interest Atlas redesign

This is a local checkpoint on `codex/local-atlas-redesign`, based on Ishan's `f76de4c`. The shared checkout and GitHub have not been changed. Do not push without a new user instruction.

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

Successful evaluation calls `window.open` during the user's final click, before route-animation timers. It opens the exact approved real event source URL in a new tab, once per mounted event detail. The same URL remains available in the detail footer and beside the game without solving anything. A fallback link remains if popups are blocked. Booking and availability are handled by the provider, with an adult reminder and full/cancelled notices; there is no in-app ticket purchase or child registration. Fictional and unreviewed records never get this handoff.

Visitor game state stays in memory. Backend adapters, APIs, stored data, shared contracts and review services are unchanged. Cached source coverage limitations are still displayed; this work did not run a fresh scrape.

## Checks and next handoff

`node --test tests/event-games.test.ts` covered eight focused cases. Its first run found an impossible harder bridge inventory; that inventory was corrected and the failed case alone rerun successfully. The other seven passed initially. `npm run build` passed, including TypeScript. The broad existing suite was deliberately not repeated at the user's request.

The browser verified the real LEGO handoff to experimenta, a complete robot run, coding-loop success feedback, shape sorting, save, reset and keyboard close. See `design-qa.md` for visual evidence and limits. Do not treat the earlier main-branch accessibility checklist as proof of every redesigned game at every viewport.

If continuing: keep changes local, use focused verification for actual new changes, and save a local checkpoint at substantial handoffs. The agent cannot read the user's five-hour quota percentage.
