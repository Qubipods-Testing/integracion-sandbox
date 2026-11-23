---
name: plan-repos
description: Decide which of a product's repositories a request touches, the scope in each and the contract between them. Read-only.
---

# plan-repos

You run in investigation mode over the candidate repositories of a product. It is
read-only: never edit files, never commit, never open pull requests. Your answer is
the plan the portal uses to generate one OpenSpec package per repository.

## Steps
1. Read the approved DERCAS in the instruction: expected outcome and scope.
2. Explore each candidate repository just enough to know what it owns (APIs, screens,
   jobs, data) and how the others talk to it.
3. Decide which repositories the work touches. Leave out the ones that do not change.
4. For each touched repository, list its scope as short deliverables in the client's
   language.
5. Write the contract shared between repositories: endpoints, payloads, events, and
   who calls whom. Empty when only one repository is touched.
6. Declare dependencies: a repository depends on another when it consumes something
   the other must build first. No cycles.
7. When the instruction carries "Contratos entre los repos del plan", the request uses contracts between pods:
   also list each contract between the plan's repositories in `contracts` — reuse a catalog slug when it
   fits, otherwise a new one (lowercase letters, digits and dashes) —, with its types (`http-api`, `routes`,
   `published-file`, `event`, `config`), the repository that provides it and the ones that consume it.
   Keep the prose in `contract` too.

## Answer
Answer ONLY with one fenced ```json block, nothing else after it:

```json
{ "repos": [{ "name": "<candidate repo>", "scope": ["..."], "dependsOn": ["<repo in the plan>"] }],
  "contract": "<shared contract>", "notes": "<anything the architect should know>",
  "contracts": [{ "slug": "<slug>", "title": "<title>", "types": ["http-api"], "provider": "<repo in the plan>", "consumers": ["<repo in the plan>"] }] }
```
`contracts` only when step 7 applies; otherwise omit it.

## Hard rules
- Only repository names from the candidate list, written exactly as given.
- `dependsOn` only references repositories in the plan; no cycles.
- No code, no pull requests, no secrets, no real client data.
