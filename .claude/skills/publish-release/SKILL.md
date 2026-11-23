---
name: publish-release
description: Write the client-facing release notes for a release branch into .agentos/pr.json; AgentOS opens or updates the release pull request into the default branch with them.
---

# publish-release

The portal is publishing a release. Your job is to write the release notes for this
repository. The run works read-only on the release branch: AgentOS opens or updates the
pull request from the release branch into the default branch with the title and body you
leave in `.agentos/pr.json`; the lead merges it and a kit workflow creates the tag and the
GitHub release with those notes.

## Steps
1. Read the instruction: release branch, default branch, title, the release objective and
   every request of the release (those of this repository are marked) with its DERCAS
   (expected outcome and scope) and OpenSpec package.
2. Write the release notes for the client, in the language the instruction gives: what
   changed in this repository, in business language, from the code and the OpenSpec
   packages. No internal data and no costs (no tokens, QPU, branch names, run ids or amounts).
   End as the instruction asks: the objective verdict (met / partially met / not met, with
   the reason) when the release touches one repository, or this repository's contribution
   to the objective when it touches several. If you cannot write them, use the template the
   instruction gives, unchanged.
3. Write `.agentos/pr.json` with `{ "title": <exactly the title the instruction gives>,
   "body": <the notes> }`. The body becomes the GitHub release notes.

## Hard rules
- Do not commit, do not push and do not call GitHub: AgentOS opens or updates the pull request.
- Do not merge the default branch into the release branch: the kit's integration workflow does it.
- Do not change code, do not merge, do not tag.
- The notes are client-facing: no internal data, no costs.
