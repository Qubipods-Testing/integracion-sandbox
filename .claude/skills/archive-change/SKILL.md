---
name: archive-change
description: Archive an accepted OpenSpec change and update the living specs, as a PR.
---

# archive-change

Archive the OpenSpec change(s) the instruction names, after the client has accepted
the delivery. Archiving folds the accepted change into the living specs and moves it
out of the active set — the formal close of the ADD cycle.

## Steps
1. For each change id in the instruction, confirm its work is merged to the default
   branch and live (the client accepted it). Do not archive unfinished work.
2. Run `npx openspec archive <change-id> --yes` for each — this moves
   `openspec/changes/<change-id>/` into `openspec/changes/archive/<date>-<change-id>/`
   and updates `openspec/specs/` (the living specs).
3. Run `npx openspec validate --strict` (or `npx openspec list`) to confirm the
   living specs are consistent after the archive.
4. Open a pull request against the base branch the instruction names under "Rama base" (the
   repository's default branch when it names none; see the hard rules). Never merge — the AI Architect merges it
   in GitHub (separation of duties).

## Hard rules
- Archive ONLY the change id(s) the instruction names; touch nothing else.
- PR-only: never push to the default branch, never merge your own PR.
- No secrets in any file; synthetic data only.
- Base branch: take it from the instruction's "Rama base" block. When the instruction names
  none, use the repository's default branch, resolved with
  `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` (or
  `git symbolic-ref --short refs/remotes/origin/HEAD` without the `origin/` prefix).
  Never assume it is `main`.
