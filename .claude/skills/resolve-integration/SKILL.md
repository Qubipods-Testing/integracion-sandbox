---
name: resolve-integration
description: Resolve a failed automatic merge of the default branch into a release branch, preserving both sides' intent.
---

# resolve-integration

The kit's integration workflow could not merge the default branch into a release branch.
You resolve that conflict as a pull request against the release branch.

## Steps
1. Read the instruction: release branch, default-branch commit that caused the conflict,
   conflicting files and the release's requests (with their OpenSpec packages).
2. Create the run's work branch (`$AGENTOS_RUN_BRANCH`, or the one the "## Entrega" block
   names; otherwise a new branch) from the release branch and merge the default branch into it with a
   merge commit (never squash, never rebase). Resolve each conflicting file preserving
   the intent of BOTH sides: the default-branch change and the release's requests.
3. Run the FULL test suite and type checks; both sides' tests must pass. Do not weaken
   or skip tests to make the merge green.
4. Open ONE pull request against the release branch (the base the instruction names),
   explaining per file how each side was preserved. Never merge it.

## Hard rules
- PR-only: never push to the default branch or directly to the release branch.
- If a conflict cannot be resolved without changing agreed behavior, stop and report it:
  that is a decision for the AI Architect, not for you.
- Tests never use the repository's connection strings or real services (databases, queues,
  third-party APIs): `web.config`, `app.config`, `appsettings*.json`, `.env*` and similar files
  may point to production. Isolate the configuration BEFORE starting the host or any app factory
  (`WebApplicationFactory`, `TestServer`, the app bootstrap in tests): override connection strings
  and environment variables with an unreachable target, an in-memory database or a test container.
  Overriding them after startup is too late: startup may already have connected and migrated.
  Treat any connection string that points to a non-local host (anything but localhost, 127.0.0.1 or
  host.docker.internal) as production and never connect to it, not even to read. If a test cannot run
  without a real service, do not connect it: say so in the summary and the pull request.
