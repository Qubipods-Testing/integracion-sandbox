---
name: implement-change
description: Apply an approved OpenSpec change red-first, as pull requests only.
---

# implement-change

Apply an OpenSpec change whose proposal the lead has already merged (that merge is
the authorization to apply). Work in small series, tests first.

## Steps
1. Read `openspec/changes/<change-id>/` — proposal, design, tasks, specs.
2. For the next series in `tasks.md`:
   - If the instruction names a series ("Serie a implementar: B"), implement ONLY
     that series: do not start tasks of other series. Series listed as already
     merged are in the base branch — build on them, do not redo them.
   - Write the failing tests first (red) that encode the acceptance criteria.
   - Implement the minimum to make them pass (green).
   - Screens: build them against `openspec/changes/<change-id>/mockup.html` (or the
     Figma the `## UI` section links) — same structure, hierarchy, copy and states.
     Before opening the pull request, render each touched screen with sample data, capture it and compare it with the mockup in
     structure, hierarchy, copy and states. The pull request body lists the compared screens and every difference with its reason; a
     differences from the mockup are recorded in `design.md`, never decided silently.
   - Keep the diff to one intent.
3. Run the build and test commands listed in the instruction, plus the full test
   suite and type checks; do not weaken or skip tests. If a command is denied,
   missing, or cannot run because of the environment, say which command and why
   in the first line of your summary and pull request description. Leave the related tasks unticked.
   Never claim that code builds or tests pass without having run them. Writing
   red-first tests or reviewing code manually is not execution evidence.
   The platform independently verifies every delivery with its own steps; its
   result determines whether the delivery is ready for review.
4. Tick the tasks before you push. In `openspec/changes/<change-id>/tasks.md`, change
   `- [ ]` to `- [x]` for every task of the series you implemented and whose build and
   tests you ran green, and commit it in the same pull request. A repair or continuation on an
   existing pull request also ticks the tasks it left unticked once their commands pass. A pull
   request that implements a series with no ticked task looks unimplemented to the reviewer and
   to the archive step. In the pull request description, list the tasks you left unticked and why.
5. Open a pull request against the base branch the instruction names under "Rama base" (the
   repository's default branch when it names none; see the hard rules). A `release/*` base that
   does not exist yet is created from the default branch
   and pushed before opening the pull request; release branches are integrated with
   merge commits, never squash.
   Never merge — the lead signs off and
   merges each series.
6. Do NOT archive the change here. Archiving happens after the client accepts the
   delivery (the `archive-change` skill), so the living specs are updated only once
   the cycle is formally closed.

## Hard rules
- Approved decisions are binding, including the DERCAS and the package design.
  Preserve their codes, paths, names and values. Never implement an alternative
  without the architect's approval, even if you document it. Leave dependent work undone
  and continue with independent work. Record each blocked decision in `.agentos/report.json`:
  `{"blockedDecisions":[{"code":"ADR-05","reason":"why it cannot be fulfilled","pending":"work left undone"}]}`.
  Do the same in a hybrid handoff (Qubipods Studio reads the file when the architect confirms the tests) and
  also state the blocker in the first line of the summary.
- `.agentos/report.json` and `.agentos/contracts/` are never committed: the platform or Studio reads them from
  the working tree, and the kit ignores them in `.agentos/.gitignore`. Never `git add -f` them. An
  `.agentos/report.json` you did not write in this run is stale: overwrite or delete it before you finish. If the
  repository already tracks it, remove it from git in your pull request (`git rm --cached .agentos/report.json`).
- Contracts between pods (the instruction's "Contratos que publica" and "Contratos que consume" blocks) are
  binding: same field names and casing, types, required fields, allowed values and statuses. Never edit
  `.ai-stack/contracts/` (the platform publishes it). As provider, write one test per contract example against
  the real HTTP pipeline that stores `{ "status", "body" }` in `.agentos/contracts/observed/<slug>/<example>.json`.
  As consumer, test with the fixtures in `.ai-stack/contracts/<slug>/fixtures/` (or `mock-server.mjs`), never
  hand-written ones, and store `{ "exercised": true, "test": "<name>" }` per fixture in the same folder. Run
  `node .ai-stack/contracts/check.mjs --role provider|consumer` before opening the pull request. If a contract
  cannot be met, do not work around it: record it in `.agentos/report.json`:
  `{"blockedContracts":[{"contract":"<slug>","version":"<x.y.z>","reason":"why","pending":"work left undone"}]}`.
- PR-only: never push to the default branch, never merge your own PR.
- No secrets in any file; synthetic data only.
- Tests never use the repository's connection strings or real services (databases, queues,
  third-party APIs): `web.config`, `app.config`, `appsettings*.json`, `.env*` and similar files
  may point to production. Isolate the configuration BEFORE starting the host or any app factory
  (`WebApplicationFactory`, `TestServer`, the app bootstrap in tests): override connection strings
  and environment variables with an unreachable target, an in-memory database or a test container.
  Overriding them after startup is too late: startup may already have connected and migrated.
  Treat any connection string that points to a non-local host (anything but localhost, 127.0.0.1 or
  host.docker.internal) as production and never connect to it, not even to read. If a test cannot run
  without a real service, do not connect it: say so in the summary and the pull request.
- Run the FULL test suite before opening the PR, not just your new tests. When you
  change the observable behavior of an existing operation or contract, UPDATE the
  existing tests that relied on the old behavior in the same PR — do not only add
  new ones. A red pre-existing test blocks the PR; migrate it (or justify) here.
- Discovered lessons become a proposed change to the kit, not a silent edit.
- UI follows `.ai-stack/design/` (the tenant's "Interfaz y diseño" rules) and the
  spec's `## UI` section. Do not invent components, colors or patterns; a missing
  rule is a proposed kit change, not a personal decision.
- Tests passing is not visual evidence: a screen change without captures compared
  with its mockup is not ready for review.
- Base branch: take it from the instruction's "Rama base" block. When the instruction names
  none, use the repository's default branch, resolved with
  `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` (or
  `git symbolic-ref --short refs/remotes/origin/HEAD` without the `origin/` prefix).
  Never assume it is `main`.
