---
name: verify-change
description: Independently verify a construction pull request against the change's acceptance criteria, with reproducible evidence per criterion.
---

# verify-change

You are the QA of the cycle, independent from whoever built the change. For every
acceptance criterion you deliver a verdict backed by reproducible evidence — or you
say plainly that it cannot be verified automatically. You never mark PASS by reading
code.

## Inputs (from the instruction)
- The OpenSpec change id(s) and the construction pull request (URL, number, head commit).
- The DERCAS baseline (expected outcome, scope) and its "Interfaz" section when present.

## Steps
1. Check out the pull request branch at the head commit given.
2. Collect the criteria: the acceptance table in `openspec/changes/<id>/proposal.md`
   (source `proposal`, ids `AC-n`) and every `#### Scenario:` in
   `openspec/changes/<id>/specs/**/spec.md` (source `spec`, ids `<capability>/<n>`).
   Add one criterion for each approved decision in `openspec/changes/<id>/design.md`
   (source `design`, id = the decision code). PASS requires evidence from a
   static check or a test you ran that demonstrates the approved decision.
   When the repository has `.ai-stack/contracts/index.json`, add one criterion per contract
   (source `contract`, id `<slug>@<version>`). Run `node .ai-stack/contracts/check.mjs --role <role>`
   for its role; PASS only with that command and its output as evidence of kind `command`.
3. Run the repository's full test suite and type checks; record the command and totals.
4. For each criterion decide:
   - `PASS` — only with reproducible evidence: a test that covers it (name + file),
     a command with its relevant output, or a static check (grep/lint) you ran.
   - `FAIL` — the evidence shows the behavior is missing or wrong; cite it.
   - `MANUAL` — it cannot be verified automatically (visual rendering, UX judgement,
     external systems). Say what a human must check and how.
   - `N/A` — the criterion belongs to a series this pull request does not deliver
     (see `tasks.md` and the PR description). Give the series or reason in `reason`.
     Never mark FAIL for code the pull request does not intend to include; the
     change-level gate in the portal requires every criterion to PASS in some PR.
   - Scenarios carried in a `## MODIFIED` block are regression criteria of this change: verify them
     with the existing tests (PASS/FAIL with evidence), never N/A. Use N/A only for a criterion that
     another series or pull request of this same change delivers, and say which in `reason`.
   - When the change has `openspec/changes/<id>/mockup.html`, add one visual-fidelity criterion per screen
     the pull request touches (source `proposal`, ids `UI-n`, text "Pantalla <name> sigue el mockup").
     PASS or FAIL when you rendered the screen and compared structure, hierarchy, copy and states
     (evidence: the capture and the comparison); MANUAL only when you could not render the screen — then
     name the mockup and the screen a human must compare.
5. Write `openspec/changes/<id>/verification.json` with EXACTLY this shape:
   `{ "changeId": string, "headSha": string, "pullRequests": [string], "ranAt": ISO-8601, "suite": { "command": string,
   "passed": int, "failed": int }, "criteria": [ { "id": string, "source": "proposal"|"spec"|"design"|"contract",
   "text": string, "verdict": "PASS"|"FAIL"|"MANUAL"|"N/A", "reason"?: string, "evidence"?: { "kind":
   "test"|"command"|"static"|"manual", "detail": string, "ref"?: string } } ] }`
   `pullRequests` lists the GitHub PR URLs this verification covers (normally the one
   you verify; after a merge, every PR of the change contained in `headSha`).
6. Commit that file to the pull request branch (never to the default branch) with the attribution the
   "## Entrega" block names (a Co-Authored-By trailer only when it says so; without the
   block, add it), and push. Do not change anything else in the repository.
   If the instruction says the pull request is ALREADY MERGED: verify the merge commit it
   names on the base branch (default or release), set `headSha` to that merge commit, list ALL the change's
   pull requests in `pullRequests`, and deliver the file through a separate pull request
   from the run's work branch: `$AGENTOS_RUN_BRANCH` when set (or the branch
   `$AGENTOS_BRANCH_TEMPLATE` resolves to), else the work branch the "## Entrega" block
   names, else `qa/<id>-verification`, into the base branch the instruction names
   (the release branch when there is one, otherwise the repository's default branch). Never push
   to the merged branch.

## Hard rules
- No PASS without evidence of kind test, command or static. A PASS with kind manual is invalid.
- Never weaken, skip or add trivial tests to make a criterion pass (Constitution Art. 3).
- Do not fix the code you are verifying: report FAIL; the fix is someone else's change.
- Synthetic data only; no secrets in evidence.
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
