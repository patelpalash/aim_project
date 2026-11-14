# Recover the Claude GitHub write connection

## Confirmed failure

The user supplied:

```text
failed to create branch: POST https://api.github.com/repos/patelpalash/aim_project/git/refs: 403 Resource not accessible by integration []
```

GitHub describes this error as an integration/token with insufficient permissions. Creating a branch requires repository **Contents: write**. See [GitHub's error explanation](https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api#resource-not-accessible) and [Create a reference permissions](https://docs.github.com/en/rest/git/refs#create-a-reference).

Repository-side checks already confirm Write/push access for `ishankanani` and `umangprojectwork1204`, no pending invitations and no active rulesets. This does not establish the permissions of the integration credential used by Claude. The reported error is not evidence of a branch-name restriction.

## Restore the connection

1. **Keep the existing work.** Preserve local commits, including Ishan's reported `43d8357`, and uncommitted changes. Export/retain the work before replacing a session; starting another cloud session does not upload the old session's local commits.
2. **Identify the failing GitHub connection.** Have Claude report which connector/tool or Claude Code environment made the failing API call. Never print its token. Repository collaborator access and GitHub App/token permissions are separate checks.
3. **Palash, as repository owner:** open [GitHub installed apps](https://github.com/settings/installations). For the actual app used by the failing connection, choose Configure and ensure `aim_project` is included. Review any pending permission update: writing code/branches requires Contents read and write. An installation can only receive permissions that its app requests; if that app supports only reading, a repository role change cannot turn it into a write connection.
4. **Each teammate:** reconnect/reauthorize that GitHub connection using the intended account above and select/attach `patelpalash/aim_project`. For Claude Code cloud setup, use the [official GitHub authentication options](https://code.claude.com/docs/en/claude-code-on-the-web#github-authentication-options). If the current connector is only for repository context, use a write-capable Claude Code connection or authenticated Git in your own local clone. Keep existing session work until the transfer is verified.
5. **Retry the actual working-slice push.** Use your owner branch from `CONTRIBUTING.md`, subject to any explicit environment policy. Do not force-push, write another owner's branch or change main. Updating branch names alone does not correct this token-permission error.

Do not paste or commit credentials, and do not disable repository protections to address missing integration permissions. No token, installation or access setting has been changed by publishing this guide.

## Verify recovery and hand off

The supplying agent must verify that its actual commit is on GitHub, not just local. Check the destination branch with `git ls-remote --heads origin <actual-branch>`, compare its full SHA with the local code commit and report the commit URL. If a later coordination-only commit is the branch tip, verify that the code commit is an ancestor of that remote tip.

Update only your own coordination file with the actual branch, full code SHA, ready features and checks. Push that report too. Palash will fetch, review and integrate the retrievable slice. Until this succeeds, publication remains pending; keep local code safe.

## Prompt for either teammate's Claude

```text
Preserve all current commits and uncommitted work. Read
docs/GITHUB_PUSH_RECOVERY.md from the shared baseline. Our GitHub
accounts already have Write access, but branch creation fails with
403 Resource not accessible by integration. Identify the connector or
Claude Code connection making that call, and check its repository
selection and Contents write authorization without exposing credentials.
If the owner must approve installation access or you must reconnect,
state the precise required action. If this connector cannot write, use
a supported write-capable Claude Code/local Git workflow while retaining
the current work. Retry a normal push to your own branch, verify the
remote full SHA, update only your own coordination report, and provide
the actual GitHub commit link. Do not claim success after a failed push.
```
