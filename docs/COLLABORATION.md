# Parallel work and agent handoffs

This protocol implements the user's request for Palash, Ishan and Umang to work simultaneously, exchange context, request dependencies and publish usable slices. It supplements plan revision 3 and [CONTRIBUTING.md](../CONTRIBUTING.md); it does not change task ownership or the AIM requirements.

## Separate workspaces, shared context

Run the three assistant sessions in separate clones or worktrees. Never switch branches, install packages or run builds in another active agent's working directory. Each agent owns its branch and its coordination file:

| Owner | Branch | Coordination file |
| --- | --- | --- |
| Palash + ChatGPT | `codex/palash-integration` | [PALASH.md](coordination/PALASH.md) |
| Ishan + Claude | `codex/ishan-design` | [ISHAN.md](coordination/ISHAN.md) |
| Umang + Claude | `codex/umang-data` | [UMANG.md](coordination/UMANG.md) |

Continue independently using the agreed shared contracts and clearly labeled examples. Do not wait for the whole frontend/backend before starting your own assigned work. Do not replace a teammate's implementation because a dependency is still pending.

The repository is the common communication channel. Separate Claude and Codex sessions do not gain a direct connection, automatic wake-up or continuous background monitoring from this document. The protocol works while each session is running, can access GitHub and actively checks updates. A paused/offline session needs its owner to resume it. No scheduler, messaging bridge or background process is installed by these rules.

## Read updates at checkpoints

At session start, before a dependent slice, after publishing a slice and before declaring a dependency blocked:

1. Inspect the current branch and working tree; preserve all local work.
2. Fetch the remote branch updates. Fetching does not merge another branch into your files.
3. Read each owner's coordination file **from that owner's remote branch**. A copy on `main` or your own branch may be older.
4. Read new requests addressed to you, replies to your requests, ready code commits and relevant contract/handoff changes.
5. Incorporate `origin/main` into your own role branch only at a clean, safe checkpoint, following the merge workflow in `CONTRIBUTING.md`. Never discard work to update.

Example read commands, run in your own clone:

```powershell
git status --short --branch
git fetch origin
git show origin/codex/palash-integration:docs/coordination/PALASH.md
git show origin/codex/ishan-design:docs/coordination/ISHAN.md
git show origin/codex/umang-data:docs/coordination/UMANG.md
```

A missing branch/file means **not reported**, not proof that work is unfinished. A stale timestamp or absent reply also does not establish completion or failure. Report access/authentication errors explicitly instead of treating them as task status.

## Ask for a specific dependency

Write requests in your own coordination file and publish that file on your branch. Use a stable request ID such as `PALASH-001`. Include:

- Recipient and task/slice, for example Ishan, I2 result cards.
- The exact component, export, endpoint or contract needed and how you will use it.
- The acceptance example/check and any needed-by checkpoint; do not invent another person's ETA.
- What independent work you will continue while waiting.

The recipient acknowledges the same request ID **in their own coordination file**, with `in-progress`, `ready` or `blocked`, scope and any actual blocker. If ready, supply a pushed code commit and handoff evidence. Do not edit the requester's file or claim to have contacted another session merely by writing a request. Acknowledgement establishes that the other agent has read it.

Example exchange:

```text
PALASH.md: PALASH-001 -> Ishan: Need I2 results-list slice with shared
Offer IDs and an onSelect handler. Is a checked slice ready? If so,
push it and reply with the code commit and integration example.
Continuing: shared filter edge cases while waiting.

ISHAN.md: PALASH-001 -> Palash: in-progress; selection works, keyboard
check pending. No ready commit yet.

ISHAN.md: PALASH-001 -> Palash: ready; code commit <full SHA>, branch
codex/ishan-design; checks <actual commands/results>; example <path>.

PALASH.md: PALASH-001: integrated at <commit>; checks <actual results>.
```

These are examples, not actual task reports or messages already delivered.

## Publish small, verified slices

Do not wait until every assigned task is finished. As soon as a coherent slice passes its relevant checks:

1. Review and commit only that slice's intended files on your own branch. Do not include another agent's work, unrelated edits or secrets. Never use a broad staging command without inspecting its contents.
2. Push the code commit to your role branch using a normal push and confirm the remote contains it. Local commits and an attempted/rejected push do not establish availability; report any failure.
3. Record `ready`, the **code commit SHA**, task IDs, changed paths, working example/import instructions, checks actually run, known gaps and required dependencies in your coordination file. A full task may remain in progress even when one slice is ready.
4. Commit and push that coordination update separately so it can name the preceding code commit without a self-referencing SHA. Confirm the remote coordination file contains the handoff; until then the request remains unanswered remotely.
5. Check for new requests, then continue your next independent task.

Coordination-only requests/replies may be committed and pushed without waiting for feature completion. Keep updates concise; do not publish whole chat transcripts. Share decisions, contracts, changed paths, evidence and blockers.

Do not force-push. A rejected push requires inspecting the remote changes and resolving them while preserving work. Do not push directly to another owner's branch. Palash remains the final integrator for `main` through the agreed reviewed workflow.

## Work while waiting

When a dependency is pending, record the blocker and choose another task in your ownership: shared behavior/checks for Palash, an independent screen/accessibility state for Ishan, or another adapter/service check for Umang. Use the agreed fixtures where appropriate and label them honestly.

While an active session is waiting for a dependency, check remote updates about every two minutes, or at the next short task checkpoint. Avoid tight polling and waits longer than 60 seconds per call. This is an instruction for an active session, not a claim that checks continue after it stops.

If no independent work remains, publish the precise dependency and last observed state, report that you are waiting and keep checks bounded by the session's available runtime. If the session must end, leave a resumable handoff. Do not pretend a wait or request completed, invent a response, silently take over another owner's task or install a background watcher.

## Integrate the advertised code

Palash fetches the supplying branch, inspects the advertised code commit and its dependencies, then merges a reviewed coherent slice into `codex/palash-integration` from a clean working tree. Do not blindly pull a teammate's branch into ongoing edits or merge unrelated unfinished work. Agree a smaller handoff with its owner if the advertised slice cannot be incorporated safely.

Run relevant integration checks plus `npm run check` and `npm run build` before publishing a working shared baseline. Verify the actual connected behavior as required; library tests alone do not prove the frontend, scraping or review service works. Record the integrated source commit and remaining acceptance gaps, then publish the baseline through the existing `main` workflow. The consuming agent fetches that baseline at its next safe checkpoint.

Only the owner writes their coordination file. Palash records integration in `coordination/PALASH.md` and the normal project handoff/status documents; other owners update their own acknowledgements when they observe it. This avoids three agents repeatedly editing one status log.

## Adopt this protocol in an existing session

Give each already-running session this instruction once after these files are published:

```text
Fetch the latest shared baseline while preserving local work. Read
AGENTS.md and docs/COLLABORATION.md. Adopt the parallel handoff protocol
on your assigned role branch. Read all three owners' coordination files
from their remote role branches. Update only your own coordination file.
Publish checked working slices promptly, with code commit IDs and actual
checks. Acknowledge requests addressed to you, continue independent work
while blocked, and check updates at the documented checkpoints. Preserve
ownership; Palash integrates main. Do not claim communication, availability
or background monitoring without evidence.
```

Publishing these rules makes them fetchable; it does not establish that another agent has read or adopted them. Initial coordination templates are not evidence of task progress. Each owner replaces their own report with actual requests, acknowledgements and checked code references. Current product evidence remains in [STATUS.md](STATUS.md).
