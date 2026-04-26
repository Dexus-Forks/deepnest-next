---
project_name: deepnest-next
date: 2026-04-26
purpose: 'Index of bmad Phase-5 SOPs (post-merge / closer-PR phase) for TEA, Dev, and Review-Board agents.'
owner: 'Murat (TEA) — SOP entries; Sage (Review Leader) — wording-consistency review.'
generated_by: 'Murat — DEE-106 (Fix #4 of DEE-102).'
---

# bmad Phase-5 — SOP Index

Phase-5 = post-merge cleanup and verification (closer PR, traceability artefacts, gate decision, NFR evidence, sprint-status flips, post-merge review-board reports). This index lists the SOPs that govern Phase-5 dispatch and execution. Add a new row when an SOP is added, edited, or superseded.

## Active SOPs

| # | SOP | Doc anchor | Owner | Source issue |
|---|-----|------------|-------|--------------|
| 1 | TEA closer PR pre-flight — `git fetch origin main && git rebase origin/main` before `gh pr create`; close branch as superseded if rebase reveals work already merged (no force-push of no-op PRs) | `_bmad-output/project-context.md` §19 | Murat (TEA) | DEE-106 (Fix #4 of DEE-102) |
| 2 | PR merge gate (Copilot wait + revise) — after `gh pr create` (or auto-merge flip), poll Copilot review, walk every Copilot thread (`validate → fix → reply → resolve`), merge only when `reviewDecision == APPROVED` and all Copilot threads resolved; no carve-out for closer or artifact PRs | `_bmad-output/project-context.md` §15 ("PR merge gate (Copilot wait + revise)") + §19 closer-PR carve-out clarification | Wes (Workflow Builder) | DEE-115 (child of DEE-113 CEO policy) |

## Related governance work (cross-SOP)

These are not standalone SOPs but they shape how the active SOPs above behave:

- **Tea-trace dedupe key (DEE-103, Fix #1).** Routing-layer guard: synthesise `origin_fingerprint = hash(story.slug + merged.commit_sha)` so a second wake on the same merge is a no-op. Owner: CTO.
- **Branch protection — `tea/*` PR up-to-date with `main` (DEE-105, Fix #2).** Repo-side enforcement: GitHub branch protection requires the PR to be rebased on `main` before merge. Owner: CTO via Dexus-Forks repo settings.
- **Phase-5 dispatch filing-time guard (DEE-104, Fix #3).** `bmad-create-story` / Phase-5 dispatch asserts no other in-progress trace issue exists for the same `story.slug + merge_sha` before filing. Owner: Wes (Workflow Builder).

## How to add a new Phase-5 SOP

1. Draft the SOP as a new section in `_bmad-output/project-context.md` (or as a sibling `_bmad-output/bmad-phase-5-<slug>.md` if it is too large to inline).
2. Add a row to the Active SOPs table above with the doc anchor, owner, and source issue.
3. Open the closer PR following SOP #1 (the pre-flight rebase).
4. Sage reviews wording consistency against sibling anchors in `_bmad-output/project-context.md` (today: §15 Common workflows, §16 Anti-patterns, §17 Brownfield caveats). Phase-4 / Phase-6 sibling docs are not yet present on `main` — add to the review-anchor list once they land.

## Phase-5 artefact locations (reference)

- Traceability matrices + gate decisions: `_bmad-output/test-artifacts/traceability/`
- Quality artefacts (gate-decision, NFR evidence): `_bmad-output/quality-artifacts/`
- Sprint-status YAML (done-flip target for closer PRs): `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Daily standup notes (Phase-5 dispatch context): `_bmad-output/implementation-artifacts/daily-*.md`

## Cross-references

- DEE-102 — parent issue (workflow gap surfaced by Story 2.2 DEE-100/DEE-101 collision).
- DEE-101 wake comment `73d6dba8` (2026-04-26T18:35Z) — origin trigger for the four fixes.
- DEE-100 — canonical Story 2.2 trace (PR #26 merged at `7f75bf9`).
- DEE-101 — duplicate Story 2.2 trace (PR #25 closed superseded — reference precedent for SOP #1).
