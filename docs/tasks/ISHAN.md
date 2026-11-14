# Ishan + Claude: design and frontend assignment

Use plan revision 3 and task IDs **I1-I6** in [TEAM_TASKS.md](../TEAM_TASKS.md). Read [EXPERIENCE.md](../EXPERIENCE.md), [IMPORT_WORKFLOW.md](../IMPORT_WORKFLOW.md), [CONTRACT.md](../CONTRACT.md) and the PDF requirement map. This is an implementation assignment, not a completed design.

## Own all design and frontend

Choose the final palette, typography, illustration language, layout and motion system. Own UI pages/layout, `src/components/`, `src/styles/`, public artwork and the organizer UI. Palash supplies shared behavior/root setup; Umang supplies source/CSV/review APIs. Coordinate dependencies/schema instead of building a parallel server.

## Build in this order

1. One cohesive discovery/vision-board experience with direct explore/search entry and labeled interest selection.
2. Upcoming results with actual combined filters, source status and loading/empty/error/cached states.
3. Event-to-detail continuity, session shortlist feedback and a practical parent view that preserve selected context.
4. Optional three-question preference quiz and one polished compact pattern/sequence puzzle with real evaluator feedback, retry and keyboard/touch controls. Add the second only after core public/import flows work.
5. One organizer route: Review/Upload plus Sources/Themes. Provide CSV template download, upload/preview, readable row states, inline correction, selection and **Publish selected valid rows**. Blocked rows stay visibly unpublished.
6. Review interaction quality at phone/laptop widths, larger text and reduced motion; preserve focus and accessible labels.

Use motion across useful state changes, not only the hero. Games/puzzles are supporting discovery routes. A child can always browse without playing. German copy first; teenager/adult presentation uses the same data with appropriate emphasis.

## Concrete acceptance

Use one fixture/API loader and consume real endpoints as Umang delivers them. Show source facts/unknowns and distinguish synthetic offers from reviewed records. A saved activity changes actual session state. Inline correction calls the server and shows revalidation; do not fake publication or success counts.

CSV demo target: 20 clearly fictional rows, two initially blocked, one corrected, 19 reviewed eligible rows published and one unresolved row left unpublished. Keep demo labels and disabled registration actions. Explain partial/failed source refresh honestly.

Keep any passport/wish panel optional. Do not spend the day on PDF import screens, email tools, heat maps, a full game editor or a separate admin product. Do not submit raw child searches or personal profiles.

## Handoff

Use `codex/ishan-design`. H1 visual/motion direction; H3-H5 public journey; H7-H9 compact organizer UI and accessibility; final hours fixes/rehearsal. Report task IDs, working commit, phone/laptop evidence, interaction checks actually performed and precise integration needs.
