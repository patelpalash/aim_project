# Ishan + Claude: small finishing pass

Palash implemented most of the five-part assignment because both assistants were nearing their allowance. **Do not restart the larger assignment in `ISHAN_NEXT_ITERATION.md`.** Fetch current main, preserve local work and merge it into your role branch. Read `AGENTS.md`, the AIM requirements and this file first.

## Already implemented

- A separate practical parent catalogue, with the same family events/session, readable rows, age/date/provider/cost filters, save, details and direct exact-source registration links. No child hero or games in parent mode; an empty shortlist does not hide the catalogue.
- Language changes no longer reload the public catalogue. Explicit choices take precedence over initialization; application translation opt-out is present. Details/shortlist have their own DE/EN controls. Source text without an English translation is labelled as German rather than fabricated.
- The existing organizer is integrated through visible Admin links, consistent branding/theme, runtime-enabled/disabled status, real connection/summary, workflow guidance and manual review-ID recovery. Publishing requires confirmation tied to the current session revision and selected row IDs. Locale changes do not reset that review selection. Server validation, local-only guards and one shared catalogue remain intact.
- New folded-map/path logo and favicon across public, parent and admin headers.
- A wider 1840 px desktop layout and up-to-840 px animated world, with actual topic filtering, actor motion, pause and reduced-motion handling.

Code checkpoints before this handoff: `0e59058`, `7205dd5`, `78292f7`; later finishing fixes and this prompt accompany them on main. Run locally with Node 24+; set `INTEREST_ATLAS_LOCAL_DESK=1` only for the local organizer. Read `docs/LOCAL_REDESIGN_HANDOFF.md` and `design-qa.md` for evidence and limits.

## Your limited task

1. Spend a short visual pass at phone and desktop sizes on hero proportions, parent rows, new logo and organizer. Fix an actual layout defect if found; avoid another wholesale redesign or new backend.
2. Manually exercise the native CSV file picker on your laptop. Automation here could not upload through Chrome's extension because its file-URL access was disabled. API intake and browser review/publication were verified in an isolated catalogue; the native picker itself remains unverified. Use a disposable local catalogue, not a teammate's real runtime reviews.
3. Spot-check DE/EN using the switch **inside** an open event/shortlist, plus admin review labels. Preserve saved IDs/filters and the existing session. Check a source link from a parent event row. Correct missing interface translations; retain honest German provider text.
4. If time remains, check keyboard/reduced-motion and larger text in the new parent/admin layouts. Report anything untested; do not repeat the whole existing suite without a relevant change.

Work on `codex/ishan-design` (or your connection's permitted feature branch), update your coordination report, commit useful changes before your allowance gets low, push and open a PR. If the pass finds no issue, say so and stop. The user requested checkpoints before 5%; do not claim to read a quota you cannot access. No new deployment, auth system, scraping expansion or child account is part of this finishing pass.
