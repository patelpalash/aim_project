# Whole-website experience and motion brief

Follow [REQUIREMENTS.md](REQUIREMENTS.md), consolidated plan revision 3 and [TEAM_TASKS.md](TEAM_TASKS.md). The product is an engaging learning/event discovery website with optional short puzzles/quizzes. Keep its useful maintainer features too: [IMPORT_WORKFLOW.md](IMPORT_WORKFLOW.md). Ishan owns all final art direction/frontend.

## Identity and meaningful interaction

Use one coherent visual world: related interests, illustrations and event objects should belong together. Choosing an interest changes both its selected appearance and matching activities. An event opens with a clear contextual transition. A saved activity visibly joins the session shortlist. A puzzle leads back to related real opportunities.

Keep event facts readable and make the parent view calm and practical. The interest scene is a discovery metaphor, not a geographically accurate city map. Palette, typography, artwork and illustration style are Ishan's decisions. The atmosphere should come from consistent design and useful responses throughout the website.

## Screens and behavior

| Surface | Content and real actions | Required states |
| --- | --- | --- |
| Discovery home | Topic scene, explore/get-suggestions/upcoming entry points; labeled interest selection changes actual results | Initial, selected, catalog loading, cached data, failure |
| Upcoming explorer | Real event dates, Today/This weekend/Coming soon shortcuts, query and practical filters; open details and clear/reset filters | Results, none matching, unknown facts, stale source, no verified data |
| Discovery quiz | Three visual preference questions; choose/change/back/skip; editable result interests | Partial, completed, skipped, reset |
| Puzzle moment | One small relevant challenge; evaluate, explain, retry, skip and view related activities | Ready, attempted, helpful correction, completed |
| Event details | Exact source-backed facts; open/close without losing filters; save/remove and show an adult | Reviewed source, unknown fields, full, cached/stale, clearly demo |
| Parent view/shortlist | Practical summary, a few saved alternatives, provider details link and return to child view | Empty shortlist, unknown age/cost, outdated record, no booking for demo |
| Local maintenance desk | Review/Upload plus Sources/Themes: source status, CSV template/preview, inline correction, selected valid publication and expansion controls | Running, needs review, ready-new/update, blocked/unchanged, published, valid empty, failed, stale |

Users can always reach overview/search without a quiz or puzzle. A preference is not an aptitude diagnosis. Preserve selected event, filters and interests across detail and presentation changes. No permanent child profile is needed.

## Quiz and puzzles

The quiz asks three short visual preference questions: which project to try, which task looks enjoyable and what to explore next. Map choices to the existing interests (`build-games`, `robots`, `make-art`, `solve-puzzles`, `tell-stories`). Results say what the user selected and remain editable. Skipping opens discovery. Do not infer intelligence, ability or a psychological category.

**Pattern puzzle:** choose a missing item in a short pattern from three or four labeled options. Evaluate against a puzzle definition, explain the rule, allow retry, and offer related activities. Provide a text/shape alternative; color alone cannot encode the rule. Use a few small preset variations.

**Sequence puzzle:** repair or arrange a short instruction sequence, run it and see the result. A small path/robot may illustrate execution. Highlight each step, explain a failed attempt and support reset/retry. Provide move-left/move-right controls as alternatives to dragging. Evaluate only a fixed command vocabulary; no user-supplied code execution is required.

Both use one lightweight shell and should take roughly 30-90 seconds. Deliver one polished puzzle first; add the second after the public and maintenance journeys work. Ask whether the user enjoyed it before applying a suggested interest. Do not use performance to hide courses. A full game builder or classifier training lab is optional later.

## Compact maintenance interaction

CSV and source refresh lead to the same preview. Show counts, source evidence, row states and before/after facts. Inline editing sends an allowlisted patch to the server and displays revalidation. The publication action names the selected eligible count, not an unconditional "Publish all". A blocked row remains visible and unpublished after other rows are accepted. Distinguish validation status from the organizer's explicit approval.

Template download, upload and source/theme maintenance should be understandable without code editing. A new source may need a compatible adapter. Keep this one organizer route, not a separate large administration product. Optional insight counts are clearly demo/session data.

## Motion specification

These are team design targets, not measured performance claims or universal accessibility timings.

| Trigger | Intended response | Approximate target | Reduced-motion equivalent |
| --- | --- | --- | --- |
| Interest choice | Tactile feedback and selected state; matching collection changes | 150-220 ms feedback, 200-300 ms results | Immediate selection and simple fade |
| Event open/close | Event expands into details with a clear return path | 220-350 ms | Immediate change or short fade |
| Shortlist save/remove | Visible saved state and brief response toward shortlist | 150-250 ms | Text/icon change and status announcement |
| Quiz step | Predictable next question after a visible choice | 180-250 ms | Content change with predictable focus |
| Puzzle attempt | Explain the chosen sequence/pattern and result | Short user-triggered sequence | Static trace and explanation |
| Success | Brief localized acknowledgement | Usually under 600 ms | Status text |
| Child/teen/parent view | Preserve current activity and filters while emphasis changes | 200-300 ms | Immediate change |
| Refresh/load | Honest status independent of decorative effects | Start immediately | Static status text |

Decorative motion never blocks another action. Preserve focus and reading order. Avoid scroll hijacking, flashing effects, automatic sound and essential hover-only information. Keep any parallax minimal and removable. A failed request must not produce a success animation.

## Accessibility, content and state

- German copy first; retain German/English data fields. A full English interface toggle is optional.
- Short concrete child labels, calmer teen treatment, and practical adult information use the same functional catalog.
- Give all controls meaningful labels and keyboard paths; aim around 44 CSS pixels for touch targets as a team design choice.
- Display dates in Europe/Berlin. Unknown dates do not appear in upcoming groups. Unknown price, age and access are explicit.
- Separate school-only, parent-only and family eligibility. Adult presentation for choosing a child's activity does not turn that course into a parents-only activity.
- Preserve demo/source labels and show source timestamps in practical details. Browsing uses the cached catalog when refresh fails, with a visible status.
- Keep preferences, quiz answers, puzzle progress and saved IDs in memory; reset clears them. No real-name leaderboard, daily-login rewards or forced completion.

Palash owns shared state/evaluation. Ishan owns components, assets, motion and responsive interaction. Umang owns catalog/run/review data. Use one data loader/API wrapper rather than multiple hardcoded event arrays.

Verify actual interactions at phone/laptop widths with keyboard, touch, larger text, reduced motion, slow loading and failed refresh. Screenshots alone do not verify transitions or state continuity.

References: [Motion for React](https://motion.dev/docs/react) for layout/presence options; [W3C animation guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) for user control over nonessential motion. These guide implementation; the planning update installs no library.
