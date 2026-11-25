---
name: generate-spec
description: Turn an approved DERCAS into an OpenSpec change proposal.
---

# generate-spec

Turn an approved DERCAS (the client-facing definition) into an OpenSpec change
proposal, ready for the AI Architect to review in Qubipods Studio. Governance rule:
no code without an approved proposal.

## Steps
1. Read the DERCAS handed to you: expected outcome, scope (in/out), constraints, and
   its "Interfaz" section when present (screens, visual references such as Figma,
   design constraints). A Figma reference is the source of truth for the UI.
2. Create `openspec/changes/<change-id>/` — the change id MUST start with the
   request code the instruction gives you (keep historical prefixes unchanged; e.g. `req-2026-porqt-0011-<short-slug>`) so
   the portal links the package back to its request automatically — with:
   - `proposal.md` — Why, What Changes, Capabilities, acceptance criteria traced
     to the DERCAS, Impact (series of small PRs), Non-goals.
   - `design.md` — key decisions (ADRs), risks, how acceptance maps to verification.
     Preserve every DERCAS decision code and quote its approved decision without replacing it.
     If the change adds or modifies any screen, it MUST include a `## UI` section:
     screens and flows, components taken from `.ai-stack/design/` (the tenant's
     "Interfaz y diseño" rules), and the empty / loading / error states. Never invent
     components, colors or patterns outside those rules; if a rule is missing, say so.
   - `mockup.html` — when the change adds or modifies any screen, the package MUST
     include `openspec/changes/<change-id>/mockup.html`, referenced from `## UI`: a
     self-contained static page (no build, no third-party scripts) that draws each
     screen with the tokens and components of `.ai-stack/design/`, the real copy in
     the client's language, the loading, empty and error states and, when a screen
     differs by role, a role switch. The lead approves it with the proposal, so it is
     the visual contract for construction. When the DERCAS carries a Figma reference,
     that Figma is the source of truth: `## UI` must link it instead of redrawing it,
     and the mockup only covers the states the Figma does not show.
   - `tasks.md` — the apply plan, red tests first. Each `## Serie <key>` is a construction
     series that a separate build run implements. Name each construction series with a
     level-two heading `## Serie <KEY> — <title>`. KEY is letters and digits, optionally in hyphen-separated groups (A, B, INC-01), unique within the package. The mockup belongs to this spec package,
     not to construction: never list it as a `## Serie`; if you mention it, put it under a
     non-series heading (for example `## Mockup`) and tick it.
   - `specs/<capability>/spec.md` — ADDED/MODIFIED requirements with SHALL and
     at least one `#### Scenario:` each.
   - `estimate.json` — your estimate of the TRADITIONAL human-hours to build this
     scope the old way (a conventional team, no AI): `{ "traditionalHours": <int>,
     "basis": "<one line: how you derived it from the tasks>" }`. Reason over the
     task breakdown you just wrote. This feeds the client's cost-advantage view.
3. If the instruction carries a "Plan multi-repo" block, the request spans several
   repositories and this package covers ONLY this repository: specify only its scope,
   never the other repositories' work; quote the shared contract in `design.md` and
   honour it exactly; state the repository this one depends on. The change id still
   starts with the request code; add the repository to tell packages apart (e.g.
   `req-2026-porqt-0041-web-<short-slug>`).
4. Contracts between pods. If the instruction carries "Contratos que publica esta solicitud",
   this request owns those contracts: write each one to
   `openspec/changes/<change-id>/contracts/<slug>.contract.json` following the format block of
   the instruction. Never write `version` or `hash` (the platform assigns them). Start from the
   current version when there is one and change only what this request needs; prefer compatible
   changes. One example per operation, synthetic data only. Add a `## Contratos` section to
   `design.md` with each contract, what changes and why; justify there anything that breaks
   consumers. If the instruction carries "Contratos que consume", those are binding: cite them as
   `<slug>@<version>`, never copy or redefine them in the package, and list anything you need
   that they lack as "Faltante" in `## Contratos`.
   The `casing` of an `http-api` part is how the provider writes field names on the wire,
   not the naming convention of its source language (ASP.NET Core answers camelCase although C#
   properties are PascalCase). For operations that already exist in the provider, infer it from evidence: the provider's serializer configuration
   (`PropertyNamingPolicy`, `AddJsonOptions`/`AddNewtonsoftJson`, a `ContractResolver`, Jackson
   `PropertyNamingStrategy`, field-level name attributes), real responses in its fixtures, snapshots,
   tests or API docs, or the consumer's DTOs when the instruction shows them. Cite the evidence
   (file and line) in `## Contratos`. If you find none, do not guess: leave `casing` out of that
   part and add an open question for the AI Architect in `## Contratos` and in the pull request
   description ("Casing de <slug>: sin evidencia en el repo"). A missing `casing` is then the only
   `ERROR` you may leave below: it blocks the approval until the architect answers.
   For operations this request creates, there is no response to observe yet: take the casing from
   the repository's serializer configuration or the JSON responses it already returns and, when
   there are none, from the framework's default on the wire. Record it in `## Contratos` as a
   decision ("Casing de <slug>: <value>, API nueva, <source>"). Never leave it out for a new API.
   A negative example is a request to that same operation that the provider rejects (an invalid or
   missing parameter, an invalid body), and every example of an operation asks for something different (`example.ambiguous` otherwise).
   A route or method the contract does not declare (a 404 for an unknown route, a 405)
   is not a contract example: if it matters, test it in the provider, outside the contract.
   Every example must satisfy its shape: every `required` field present, no `null` unless the
   type allows it, and a `mustContain` with the same root type as the file (object or list).
   Then validate them:
   `node .claude/skills/generate-spec/check-contracts.mjs openspec/changes/<change-id>/contracts/*.contract.json`.
   It is the same validation the platform runs when it reads the pull request (an invalid contract
   blocks the AI Architect's approval). Fix every `ERROR` line and run it again until it passes.
   Never open or update the pull request with a contract it rejects, except for a `casing` left
   out as an open question.
5. Run `npx openspec validate <change-id>` until it passes.
6. Open a pull request against the base branch the instruction names under "Rama base" (the
   repository's default branch when it names none; see the hard rules). Never merge it yourself: the AI Architect
   reviews the package in Qubipods Studio straight from this pull request, before any
   merge. Approving in Studio and then merging this pull request is what authorizes
   construction. Do not write in the package that a merge alone authorizes it.

## Revision
When the instruction is "revisar el OpenSpec" (the AI Architect requested changes), do not
create a new change and do not rename it: modify the existing `openspec/changes/<change-id>/`
the instruction names.
- When the package is still under review in its pull request, you start on the branch of that
  pull request (the platform sets it as your base, under "Rama base"). Commit your changes there;
  they are delivered onto that same branch, so the review stays on the specification pull
  request. Never open a separate pull request against the default branch for a revision.
- Apply each requested change in the file it names. The quoted text locates the block even if
  the file moved; the note says what to change.
- The general note, when present, applies to the whole package.
- Keep everything else as it is; run `npx openspec validate <change-id>` again and, when the package
  has contracts, `node .claude/skills/generate-spec/check-contracts.mjs openspec/changes/<change-id>/contracts/*.contract.json`
  until both pass. Contract problems the instruction lists come from that same validation.
- The platform opens the pull request onto the reviewed branch. In its description, list each requested change and
  how it was applied, or why it could not be applied.

## Hard rules
- Requirement format (SHALL, Scenario) stays in English.
- Client-facing narrative follows the tenant's document language.
- `estimate.json` is traditional hours (human, no AI), a positive integer.
- Small PRs, one intent. No secrets, no real client data.
- Base branch: take it from the instruction's "Rama base" block. When the instruction names
  none, use the repository's default branch, resolved with
  `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` (or
  `git symbolic-ref --short refs/remotes/origin/HEAD` without the `origin/` prefix).
  Never assume it is `main`.
