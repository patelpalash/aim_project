# Final checks and demo script

This checklist is for the application the team will build. It is **not marked complete by the shared library checks**. Record actual evidence at feature freeze rather than assuming a planned feature works.

## Acceptance checks

- [ ] A clean clone installs and starts using the documented commands.
- [ ] Type checking, shared tests, relevant server checks and the production app build pass.
- [ ] The catalog includes all four configured provider IDs and AI/coding/gaming themes, with an explicit explanation where no genuine matching record is verified.
- [ ] Demo records remain visibly labeled throughout results, details and handoff. No demo record offers real registration.
- [ ] Child, teen and adult presentations can reach the same selected activity without losing state.
- [ ] Choosing an interest changes actual results, including at phone width around 390px.
- [ ] Combined query/topic/age/date/format/provider/budget filters reflect real fields. Unknown price is not free. Unknown age does not become a suitability claim.
- [ ] School-only and parent-only activities do not appear in default family discovery. Full offers are labeled and excluded from bookable recommendations.
- [ ] Pending, cancelled and ended records stay out of public discovery.
- [ ] Parent handoff shows useful practical details. The adult-view switch makes no identity/consent claim. Only approved source data can link to provider details.
- [ ] Date/times display in Europe/Berlin without silently inventing missing times.
- [ ] Keyboard-only navigation reaches interests, results, details and every form action. Focus remains visible and can leave dialogs.
- [ ] Essential content reflows on a phone and at increased text size. Contrast and reduced-motion behavior have been checked.
- [ ] Empty, loading and failed-request states are readable and recoverable.
- [ ] The local organizer desk previews `data/demo-import.json`: one price change and one new occurrence. Nothing changes publicly before approval.
- [ ] Approval publishes accepted rows; invalid rows remain rejected. Reapproval and a repeated import do not duplicate records.
- [ ] A stale preview is rejected. A failed import does not erase the catalog. Reset restores a repeatable demo.
- [ ] A nontechnical teammate can understand the import errors and correction steps without editing code.
- [ ] New provider configuration can be added without rewriting results components. Explain that a new source mapping/review is still needed.
- [ ] No child names, birth dates, emails, exact addresses, raw search logs or remote AI requests appear in the demo data flow. Reset clears session preferences.
- [ ] Any gap totals are explicitly synthetic; any shortlist is session-only.
- [ ] Writable admin routes are inaccessible in the public configuration. The localhost demo boundary is documented.
- [ ] The public journey and review demonstration can be repeated using local fixtures without internet access.

Do not report a full accessibility, security or legal compliance audit from these checks alone.

## Three-person demonstration, approximately four minutes

| Time | Speaker | Screen and action | Suggested spoken line |
| --- | --- | --- | --- |
| 0:00-0:35 | Palash | Open entry screen and show the four provider labels | "Families currently have to search several institutions. We bring their activities into one place. The activities in this demonstration are labeled examples." |
| 0:35-1:35 | Ishan | Choose "Build a game", show matching results, open one activity | "A child can begin with something they want to try. This choice changes the results. The explanation shows which interests and practical constraints match." |
| 1:35-2:10 | Ishan | Open "Show an adult" and explain age, date and price | "The same activity now shows the details a parent needs. This is a handoff view. Real registration stays with the provider; our demo activity cannot be booked." |
| 2:10-3:15 | Umang | Open local review desk, upload sample JSON, inspect change, approve and refresh results | "This import proposes a price change and a new session. The organizer reviews them before they appear. Repeating the import does not create another copy. This demonstrates the maintenance workflow; it is not a live website feed." |
| 3:15-3:40 | Umang | Show source statuses and optional synthetic gap panel | "We preserve where facts came from and what still needs review. These sample gap totals illustrate how institutions could identify missing topics." |
| 3:40-4:00 | Palash | Return to discovery | "The prototype shows discovery, an adult handoff and controlled updates. Provider-approved live inputs and real-family usability evaluation are the next steps." |

Use only screens that actually exist at rehearsal. If the gap panel is cut, omit that action and describe it as future work. If genuine provider records are added, distinguish those from the fictional examples. Never describe a heuristic score as a measured likelihood of learning success.

## Fallback and handover

Keep the fixture catalog, a resettable import sample and screenshots of the completed journey locally. Run the fallback once before presenting. Keep an offline recording only if time allows; do not substitute it for a claimed live action without saying so.

Final repository handover should contain the run/build/check commands, the agreed source configuration, data provenance, a short architecture note, known limitations and each person's actual contribution. Add any event-specific submission rules when the organizer supplies them. No additional submission checklist, deadline or judging weights were provided in the files inspected.
