# Branch Protection — `main`

Authoritative replay payload for the GitHub branch-protection rules
applied to `Dexus-Forks/deepnest-next:main`. The JSON file is the **PUT
request body** for the [Update branch protection][update-branch-protection]
endpoint — apply it to restore identical settings on a new fork or after
a settings reset.

> **Note on shape.** The previous version of this file mirrored the
> [Get branch protection][get-branch-protection] response (wrapped
> `{"url": ..., "enabled": ...}` objects per setting). That shape is
> rejected by the PUT endpoint with a 422 because it requires primitives
> for the toggles and an explicit `restrictions: null`. DEE-114 replaced
> the JSON with the PUT body so the documented replay command is
> idempotent (covers DEE-114 AC3).

[update-branch-protection]: https://docs.github.com/rest/branches/branch-protection#update-branch-protection
[get-branch-protection]: https://docs.github.com/rest/branches/branch-protection#get-branch-protection

Tracking issues: [DEE-105](https://github.com/Dexus-Forks/deepnest-next/issues)
(parent: DEE-102) for the up-to-date / merge-readiness gate, and
[DEE-114](https://github.com/Dexus-Forks/deepnest-next/issues) (parent:
[DEE-113](https://github.com/Dexus-Forks/deepnest-next/issues)) for the
Copilot review wait gate.

## Why

[PR #25](https://github.com/Dexus-Forks/deepnest-next/pull/25) was opened
against `main` HEAD `74a795f`. While it sat open, `8ab75c4` and `7f75bf9`
landed and PR #25 went DIRTY (add/add conflict on traceability artefact
paths). The repo had no "require up-to-date with `main`" policy, so the
conflict surfaced only after a manual ping.

A second class of escapes followed PR #25: PRs #21–#28 all merged with an
empty `reviewDecision` because GitHub Copilot's review wasn't a hard gate.
CEO policy on DEE-113 made waiting for Copilot's review mandatory; this
file is the repo-side enforcement for that policy.

## Active settings (replay)

```bash
gh api -X PUT repos/Dexus-Forks/deepnest-next/branches/main/protection \
  --input .github/branch-protection.json
```

Repo-level toggles (must run separately, not part of the protection PUT):

```bash
gh api -X PATCH repos/Dexus-Forks/deepnest-next \
  -F allow_auto_merge=true \
  -F allow_update_branch=true \
  -F delete_branch_on_merge=true
```

## What this enforces

| Setting | Value | Effect |
|---------|-------|--------|
| `required_status_checks.strict` | `true` | PR head must be up to date with `main` before merge button enables (covers DEE-105 AC1, AC2). |
| `required_status_checks.contexts` | `["Copilot review"]` | Merge button stays disabled until the `Copilot review` commit status is `success` on the PR head SHA (covers DEE-114 AC1; published by `.github/workflows/copilot-review-gate.yml`). |
| `required_pull_request_reviews` | enabled, 0 approvals | Direct push to `main` blocked; PR mandatory. Approvals optional for now — the Copilot wait is enforced via the status check, not the review-count knob (see "Why a status check, not a required reviewer" below). |
| `allow_force_pushes` | `false` | History stays linear-ish; no surprise rewrites. |
| `allow_deletions` | `false` | `main` cannot be deleted via API/UI. |
| `enforce_admins` | `false` | Admins can override in emergencies. Set `true` once policy stabilises. |
| `allow_auto_merge` (repo) | `true` | Authors can flip "Auto-merge" so PR auto-merges with rebase strategy once status + up-to-date pass. **Auto-merge still waits for the `Copilot review` status** — see "Auto-merge interaction" below. |
| `allow_update_branch` (repo) | `true` | "Update branch" button available on stale PRs (one-click rebase from UI). |

## Copilot review wait gate

CEO policy on [DEE-113](https://github.com/Dexus-Forks/deepnest-next/issues):

> Every PR — including TEA closer PRs and BMad/planning artifact PRs —
> must wait for the Copilot review to post before any merge action.

The reviewer is `copilot-pull-request-reviewer[bot]` (numeric id
`175728472`). The bot is auto-attached to PRs by the repo's GitHub
Copilot review configuration; it does not need to be requested manually.

### Why a status check, not a required reviewer

Classic GitHub branch protection has no "must be approved by user X"
field. The closest knobs are:

- `required_pull_request_reviews.required_approving_review_count` — counts
  any APPROVED review, not a specific reviewer.
- `required_pull_request_reviews.require_code_owner_reviews` + a CODEOWNERS
  entry — limited to users/teams; bot logins like
  `copilot-pull-request-reviewer[bot]` are not accepted as code owners.
- Repository rulesets `required_reviewers` — same CODEOWNERS limitation.

We confirmed via `gh api repos/Dexus-Forks/deepnest-next/collaborators`
that Copilot is not a collaborator slug, and observed that every Copilot
review on PRs #18–#30 is `COMMENTED` (never `APPROVED`). Even if Copilot
were addressable as a reviewer, gating on `APPROVED` would never go
green.

The fallback called out in DEE-114 AC5 is therefore the canonical path:
add a CI status named `Copilot review` to `required_status_checks.contexts`
and have a workflow publish that status based on whether Copilot has
posted a review on the current head SHA.

### Publisher workflow

`.github/workflows/copilot-review-gate.yml` publishes the status:

- Triggers on `pull_request_target` (`opened`, `reopened`, `synchronize`,
  `ready_for_review`) — initial and post-push pending states.
- Triggers on `pull_request_review` (`submitted`, `edited`, `dismissed`)
  — flips to success when Copilot posts on the current head SHA.
- Identifies Copilot by numeric `user.id == 175728472`, not the login
  string. The bot login (`copilot-pull-request-reviewer[bot]`) can
  change on app rename/reinstall; the numeric id is stable for the
  app installation. (Login is used elsewhere in this doc for human
  readability only.)
- Status state:
  - `pending` until a review from Copilot (matched by id) exists with
    `commit_id == pr.head.sha`.
  - `success` once such a review exists, regardless of review `state`
    (`COMMENTED` / `CHANGES_REQUESTED` / `APPROVED`). CEO standard #1 is
    "wait for the review to post"; resolving Copilot's threads remains
    the author agent's responsibility per CEO standard #2 (revise loop).
- Re-fires on every push, so a force-push or rebase invalidates the prior
  success and re-pends the gate until Copilot reviews the new SHA. This
  matches the wait-for-review intent under sync rebases.

#### Why `pull_request_target` and not `pull_request`

This is a deliberate security choice for a workflow whose output gates
merges:

- **Tamper resistance.** `pull_request_target` runs the workflow file
  from the base ref (`main`), so a malicious PR cannot edit
  `copilot-review-gate.yml` on its own branch to post `success`
  unconditionally and bypass the required status check.
- **Fork support.** Under `pull_request`, fork PRs get a read-only
  `GITHUB_TOKEN` regardless of the workflow's `permissions:` block, so
  `repos.createCommitStatus` returns `403` and fork PRs become
  unmergeable (because `Copilot review` is required). Under
  `pull_request_target` the token has write scopes for forks too.
- **No PR-code execution.** The job never checks out PR code, never
  installs PR-controlled dependencies, and only calls the REST API via
  `actions/github-script`. There is no injection surface for PR code,
  which is the canonical hazard of `pull_request_target`.

### Auto-merge interaction

`allow_auto_merge=true` is intentionally retained. The author can still
press "Enable auto-merge" the moment the PR is opened. GitHub's auto-merge
machinery waits for **all** required status checks (including
`Copilot review`) and the up-to-date constraint before firing. Concretely:

1. Author opens PR → `Copilot review` status posts as `pending`; merge
   button is disabled even with auto-merge on.
2. Copilot review posts → workflow flips status to `success`.
3. Auto-merge fires once `strict` and the status both pass.

Auto-merge therefore cannot bypass the Copilot wait. CEO standard #3
("auto-merge only after every Copilot thread is resolved") is enforced
via agent-side SOP — see the sibling Wes child issue
[DEE-115](https://github.com/Dexus-Forks/deepnest-next/issues), which
amends `_bmad-output/project-context.md` §15/§19 and the PR template.

### What stays out of scope for this gate

- Resolving Copilot review threads (validate → fix → reply → resolve) —
  agent-side SOP per DEE-115.
- `tea/*` source-branch ruleset — the `main` gate covers `tea/*` PRs
  because they target `main`; a separate `tea/*` ruleset is not added in
  this iteration.
- A "Copilot APPROVED" gate — Copilot does not APPROVE; raising the bar
  beyond "review posted" would require a different bot or a manual
  approver and is explicitly out of scope.

## Tea/* PRs

`tea/*` PRs target `main`, so both the up-to-date requirement and the
Copilot review wait on `main` cover them automatically. No separate
`tea/*` ruleset needed for the merge-side gates. If we later want to
enforce rebase-only or different review rules on `tea/*` PRs
specifically, add a ruleset with
`conditions.ref_name.include = ["refs/heads/tea/*"]` targeting the source
branch.

## Future hardening (not in scope here)

- Wire CI checks (build/lint/test) and add them to
  `required_status_checks.contexts` alongside `Copilot review`.
- Set `enforce_admins: true` once admins are no longer the primary mergers.
- Consider a Mergify rule or GitHub auto-merge with rebase strategy to
  auto-rebase stale PRs instead of letting them go DIRTY.
- Migrate to a [repository ruleset][rulesets] if richer targeting (e.g.
  named release branches) is needed; rulesets require ≥1 named status
  check, so wait until CI checks exist.

[rulesets]: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
