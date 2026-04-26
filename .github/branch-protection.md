# Branch Protection — `main`

Authoritative export of the GitHub branch-protection rules applied to
`Dexus-Forks/deepnest-next:main`. Replay via the GitHub REST API to
restore identical settings on a new fork or after a settings reset.

Tracking issue: [DEE-105](https://github.com/Dexus-Forks/deepnest-next/issues) (parent: DEE-102).

## Why

[PR #25](https://github.com/Dexus-Forks/deepnest-next/pull/25) was opened
against `main` HEAD `74a795f`. While it sat open, `8ab75c4` and `7f75bf9`
landed and PR #25 went DIRTY (add/add conflict on traceability artefact
paths). The repo had no "require up-to-date with `main`" policy, so the
conflict surfaced only after a manual ping.

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
| `required_status_checks.contexts` | `[]` | No specific CI checks required yet — the `strict` flag alone gates up-to-date. Add check names here when CI is wired. |
| `required_pull_request_reviews` | enabled, 0 approvals | Direct push to `main` blocked; PR mandatory. Approvals optional for now. |
| `allow_force_pushes` | `false` | History stays linear-ish; no surprise rewrites. |
| `allow_deletions` | `false` | `main` cannot be deleted via API/UI. |
| `enforce_admins` | `false` | Admins can override in emergencies. Set `true` once policy stabilises. |
| `allow_auto_merge` (repo) | `true` | Authors can flip "Auto-merge" so PR auto-merges with rebase strategy once status + up-to-date pass. |
| `allow_update_branch` (repo) | `true` | "Update branch" button available on stale PRs (one-click rebase from UI). |

## Tea/* PRs

`tea/*` PRs target `main`, so the up-to-date requirement on `main` covers
them automatically (DEE-105 AC1). No separate `tea/*` ruleset needed for
the merge-side gate. If we later want to enforce rebase-only or different
review rules on `tea/*` PRs specifically, add a ruleset with
`conditions.ref_name.include = ["refs/heads/tea/*"]` targeting the source
branch.

## Future hardening (not in scope here)

- Wire CI checks (build/lint/test) and add them to
  `required_status_checks.contexts`.
- Set `enforce_admins: true` once admins are no longer the primary mergers.
- Consider a Mergify rule or GitHub auto-merge with rebase strategy to
  auto-rebase stale PRs instead of letting them go DIRTY.
- Migrate to a [repository ruleset][rulesets] if richer targeting (e.g.
  named release branches) is needed; rulesets require ≥1 named status
  check, so wait until CI checks exist.

[rulesets]: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
