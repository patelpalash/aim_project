# Local redesign QA — 15 November 2026

## Parent and organizer integration

The parent mode now renders a separate practical list: 25 family activities, 19 exact reviewed provider links, no child hero and no event games. Save and DE/EN were exercised. The implementation keeps filters/session in the same discovery owner; locale switching no longer triggers its catalogue-loading effect. Language controls were added inside modal sheets so switching does not click the backdrop behind them. Logo/favicon and parent/admin branding are consistent. Desktop content/world limits increased to 1840/840 px.

Admin verification used a separate temporary worktree/data catalogue on port 3004. CSV intake through the HTTP API staged 18 ready and 2 blocked rows. The UI loaded that session by ID, showed disabled blocked-row checkboxes, required explicit review confirmation before enabling Publish, preserved confirmation through DE/EN, and published one chosen row. It then showed 1 published, 2 blocked and version 3. The isolated catalogue had 28 offers, its blocked IDs were absent, and normal port 3002 remained at 27 offers. Native browser file upload was blocked by the extension's file-URL setting; that picker needs a manual check. No access setting was changed.

Validation: 132 tests/TypeScript passed, and production builds passed. The new parent/admin views still need broader screen-reader, measured-contrast, larger-text and multi-width judgement checks. Local proofs: `.local-analysis/parent-integration.jpg`, `.local-analysis/admin-publication.jpg`.

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

The mobile screenshot API timed out in the first pass; mobile DOM measurements and interactions succeeded, but a mobile visual capture is not claimed. A screen-reader/contrast audit and every viewport/level combination were not repeated. Source freshness and current ticket availability are provider-owned; opening the source page is not a reservation.

## Follow-up: game behaviour and motion

The user reported games not working properly and requested animation plus an always-available Skip. Inspection found success/source navigation before route playback finished, a fixed-distance bridge crossing, moving click targets caused by stacked entrance/smooth-scroll animations, and Skip outside the visible part of a long game.

Changes: completion follows the last animation; timelines cancel on reset/skip/unmount; robot/rocket motion uses transforms with correct shortest turns and current-command highlighting; Stop preserves the editable command queue; bridge movement scales to the board width and the next available brick is selected automatically; shapes animate between boxes; city homes show whether a park is adjacent and animate their check. Game controls and sheets fade in without translated hit targets. Sheets lock background scrolling and fade out before unmounting. Filters/results transition separately from modal changes. Search keystrokes update immediately. Footer Skip remains visible and keyboard focus goes to event facts.

Observed in the browser: complete robot and five-block coding playback, correct final north orientation, reset/stop/skip, level change, four-brick bridge placement and post-crossing experimenta tab, six-shape sorting success, and a complete city build followed by the exact aim course tab. At 390×844 CSS pixels, the document width was 390 and footer Skip was 362 px wide at y=743–785, within the viewport. Mobile skip exposed event facts and keyboard Escape restored body scrolling. Source links remain available throughout. New proof: `.local-analysis/games-motion-shapes.jpg`.

Checks are limited to the changed behaviour: one new command-to-animation trace regression, TypeScript, final production build and these browser interactions. The full existing suite was not repeated.

## Larger layout and animated world

The user's small-scale homepage screenshot is the reference for this adjustment. The existing cream/forest/orange design is preserved while increasing the desktop content, illustration, text and control sizes. Measured before/after limits: content 1320 → 1600 px, headline 43 → 66 px, world 410 → 680 px on wide screens. The wider 17:10 scene viewport keeps its inner art canvas at 3:2 to avoid distortion.

The island now has independently moving elements: a generated courier cutout patrols the island and travels to a selected workshop, a gear rotates, lights animate and the scene gently responds to mouse position. Topic buttons filter actual catalogue results and the match count leads to them. Pause and reduced motion are supported. In Chrome, selecting Coding produced 20 event cards and an arrived rover; Pause became pressed. This is a layered interactive illustration, not a 3D simulation. Data remains the same reviewed/cached catalogue.

Final responsive check: at a 390 px CSS viewport, document width was 371 px with a scrollbar and all three scene controls were 47 px tall, with left/right edges between 20 and 361 px. Gaming selection produced five cards; the scene's match-count button scrolled to the five-offer catalogue. No new unit tests or full-suite runs were needed for this visual slice; production build and TypeScript passed. Final screenshot: `.local-analysis/hero-world-final.jpg`.
