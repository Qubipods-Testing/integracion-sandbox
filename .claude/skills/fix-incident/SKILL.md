---
name: fix-incident
description: Diagnose and fix a reported bug red-first, leaving a permanent regression test and a knowledge-base entry.
---

# fix-incident

Fix a reported incident (a QA or production bug). Diagnose from the report, the
code and past incidents, then fix it test-first, leaving a permanent regression
guard so the bug can never come back silently.

## Steps
1. Read the incident: reproduction, expected vs actual, severity, affected area.
   Read `docs/incidents/` for similar past incidents (the knowledge base) and
   reuse known root causes.
2. Reproduce the bug with a FAILING test (red) whose name carries the incident
   code (e.g. `INC-2026-001: ...`) so it is traceable and runs on every future PR.
3. Implement the minimum fix to make that test pass (green); do not weaken or
   skip other tests.
4. Write `docs/incidents/<INC-code>.md` — frontmatter (code, severity, area,
   root-cause category, test path, date) + a short body (root cause, repro, fix,
   the regression test that covers it). This is the knowledge base.
5. Run the FULL test suite and type checks.
6. Open a pull request against the base branch the instruction names under "Rama base" (the
   repository's default branch when it names none; see the hard rules). A `release/*` base that
   does not exist yet is created from the default branch
   and pushed before opening the pull request; release branches are integrated with
   merge commits, never squash.
   Never merge — the AI Architect signs off.

## Hard rules
- The regression test is permanent, carries the incident code, and MUST fail
  before the fix and pass after — that is the proof the diagnosis was right.
- If the bug reveals the spec itself was wrong, STOP and propose an OpenSpec
  change (a request) instead of silently changing specified behavior.
- PR-only: never push to the default branch, never merge your own PR.
- No secrets in any file; synthetic data only.
- Base branch: take it from the instruction's "Rama base" block. When the instruction names
  none, use the repository's default branch, resolved with
  `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` (or
  `git symbolic-ref --short refs/remotes/origin/HEAD` without the `origin/` prefix).
  Never assume it is `main`.
- Tests never use the repository's connection strings or real services (databases, queues,
  third-party APIs): `web.config`, `app.config`, `appsettings*.json`, `.env*` and similar files
  may point to production. Isolate the configuration BEFORE starting the host or any app factory
  (`WebApplicationFactory`, `TestServer`, the app bootstrap in tests): override connection strings
  and environment variables with an unreachable target, an in-memory database or a test container.
  Overriding them after startup is too late: startup may already have connected and migrated.
  Treat any connection string that points to a non-local host (anything but localhost, 127.0.0.1 or
  host.docker.internal) as production and never connect to it, not even to read. If a test cannot run
  without a real service, do not connect it: say so in the summary and the pull request.
