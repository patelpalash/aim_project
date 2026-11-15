# Local redesign QA — 15 November 2026

Scope: the selected first design direction, adapted to the user's event-first requirement, plus topic-related hands-on games. This is local preview evidence, not a claim of deployment or full accessibility certification.

## Design reference and result

Reference: `C:\Users\acer\.codex\generated_images\01a1db5a-4cfe-7f30-8d81-b7cf645a54ff\exec-0873185f-d210-41e2-a42d-0000b4733de8.png`.

The prototype retains the reference's cream/forest/orange palette, miniature discovery world, rounded cards and calm typography. It intentionally puts real catalogue controls ahead of extra games. Games now use visible boards, placeable pieces, command queues and immediate feedback instead of the earlier A/B/C answers. Touch and keyboard controls share the same actions. Decorative animation is not needed to solve a puzzle.

## Observed evidence

- `http://127.0.0.1:3002`: 25 family-visible offers, with the full catalogue status still stating 19 reviewed and 8 fictional offers. The extended audience filter preserves access to the other two records.
- LEGO bridge: placed four bricks, solved staggered joints, saw success, saved the event. Chrome opened the exact experimenta First Lego League page, including its `termin` query, in a new tab. The original details and source link stayed available.
- Robot: queued seven commands, saw the animated path end at column 4, row 1 and successful feedback. Reset removed both the programme and success state. This fictional offer exposed no booking link.
- Coding: the five-block solution with two repeat blocks produced success feedback. The route evaluator separately checks loops, limits, obstacles and boundaries.
- Shape lab: sorted all six tiles with the actual UI; success appeared. At the mobile override, measured viewport width was 488 CSS px and the document/dialog width 469 px, without horizontal overflow. Keyboard Enter closed the detail sheet.
- Saved screenshot files: `.local-analysis/bridge-game.jpg`, `.local-analysis/robot-game.jpg`, `.local-analysis/interactive-atlas.jpg`. These local proof images are ignored by Git.
- Production build and TypeScript passed. Eight relevant evaluator/source-link cases passed, with only the initially failing harder-bridge case repeated after its fix.

## Requirements preserved

R1/R4/R6/R8: combined source catalogue, four provider identities, AI/coding/gaming topics and direct browse/search remain. R5/R7/R9/R10: existing configurable intake, review and source evidence are retained without backend changes. R11/R13: provider-only registration, adult handoff, no child account and in-memory visitor state remain. R3/R14: optional, contextual, interactive games and purposeful motion. R12: labelled buttons, non-drag controls, hints, reset and reduced-motion handling.

## Limits

The mobile screenshot API timed out; the mobile DOM measurements and sorting interaction succeeded, but a mobile visual capture is not claimed. A screen-reader/contrast audit and every viewport/level combination were not repeated. City placement and both difficulties were checked by the pure evaluators and production type checking; the city UI has not had a complete browser playthrough. Source freshness and current ticket availability are provider-owned; opening the source page is not a reservation.
