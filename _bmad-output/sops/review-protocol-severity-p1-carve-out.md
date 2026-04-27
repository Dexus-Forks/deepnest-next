---
project_name: deepnest-next
date: 2026-04-27
purpose: 'Review-protocol amendment — narrow `severity.max=P1 → APPROVED` carve-out for test-coverage findings on already-closed production holes. Codifies the 5 entry criteria + 2 operational invariants forged on [DEE-131](/DEE/issues/DEE-131) Story 2.3 Round-1 board verdict.'
owner: 'John (PM, BMad / spec-author voice) — author. Sage (Review Leader) — review-protocol coordinator review. CTO — governance sign-off.'
generated_by: 'John — [DEE-142](/DEE/issues/DEE-142) (governance follow-up to [DEE-131](/DEE/issues/DEE-131); parent [DEE-122](/DEE/issues/DEE-122) review-protocol spec amendment).'
status: 'Proposed — pending CTO + Sage sign-off on PR.'
scope_lock: '5 entry criteria + 2 operational invariants per CTO close-out [c2814303](/DEE/issues/DEE-131#comment-c2814303-630a-49d9-b72e-97cfdd6e13fc). No further scope expansion before merge.'
---

# Review-protocol amendment — `severity.max=P1 → APPROVED` carve-out

## TL;DR

The default board-verdict rule stays:

> **Default rule.** A Round-N board verdict is `APPROVED` iff `severity.max ≤ P3` across all dispatched perspectives. Any P0 or P1 finding from any reviewer ⇒ `CHANGES`. P2 = should-fix, not a merge gate. (Lived as the operative rule across PRs #6 / #15 / #19 / #23 / #31; see Story 1.1 / 2.1 / 2.2 board verdicts.)

This amendment adds **one** narrow exception: a `severity.max=P1 → APPROVED` carve-out for test-coverage findings on production holes that are already closed on the PR head SHA. The carve-out is gated by **5 entry criteria** that ALL must pass + **2 operational invariants** that govern the in-flight window between carve-out grant and merge. **No partial carve-outs. No automatic invocation. No scope creep beyond P1 / no carve-out for production-code defects.**

Until this amendment is merged, every P1-with-merge candidate requires explicit CTO + PM + Sage thread vote citing all 5 criteria line-by-line per existing [DEE-131](/DEE/issues/DEE-131) precedent.

---

## 1. Default rule (unchanged)

The strict review-protocol rule is unchanged for all production-code findings:

| `severity.max` across dispatched perspectives | Verdict     | Notes                                                                   |
| --------------------------------------------- | ----------- | ----------------------------------------------------------------------- |
| P0 (any)                                      | **CHANGES** | No carve-out. Production defect, ship-stopper.                          |
| P1 (any)                                      | **CHANGES** | No carve-out **except** §2 below (test-coverage on already-closed hole) |
| P2                                            | APPROVED    | P2 = should-fix, recorded as carry-over; not a merge gate.              |
| P3                                            | APPROVED    | Informational / polish.                                                 |
| `none`                                        | APPROVED    | Clean run.                                                              |

This table is the explicit codification of the rule that has been operative since Round-1 boards on Stories 1.1 / 2.1 / 2.2 / 6.1. It was previously implicit in Sage's verdict-generation; this amendment makes it the spec.

---

## 2. The carve-out — `severity.max=P1 → APPROVED`

A Round-N board verdict on a P1 finding **MAY** be `APPROVED` iff **ALL FIVE entry criteria** below hold AND **BOTH operational invariants** are honoured in the in-flight window between the carve-out grant and the merge.

If any single criterion fails, **`CHANGES` stands. No partial carve-outs.** If either operational invariant is violated after grant, the carve-out is **invalidated** and a re-vote is required.

### 2.1 The 5 entry criteria

1. **Production code unchanged by the finding.** The P1 finding is purely test / doc / coverage. The PR head SHA introduces no production-code regression on the file(s) the finding cites; ideally the PR head SHA is the production fix itself.

2. **Targeted hole already closed in production code on PR head SHA, with closing commit SHA cited inline in the verdict comment.** "The hole is closed" is not enough — the verdict comment MUST name the specific commit SHA on the PR head that closes the production hole, and that SHA MUST equal (or be an ancestor of) the PR head SHA.

3. **CI all-green on PR head SHA.** Every required check on the PR head SHA reports `success` (DEE-114 `Copilot review` gate included; see `_bmad-output/project-context.md` §15). If a re-run is mid-flight, wait for it to settle; do not cite a partially-green run.

4. **CTO + TEA + Aegis independent unconditional sign-offs, cited by comment id in the verdict comment.** Three independent stakeholders, each on record, each unconditional (no "I'd prefer X but won't block" reservations), each cited by the comment id where the sign-off was made. Sage's own consolidated verdict is **separate** from these three — Sage is the verdict author, not a counted sign-off.

5. **Follow-up issue exists as a hard `blockedByIssueIds` dependency on the next story that touches the same production file(s), wired and persisted PRE-merge.** The follow-up issue MUST exist as a real Paperclip issue (test-coverage spec / hygiene / etc.), MUST be set as `blockedByIssueIds` on the named successor issue, and the wiring MUST be visible via `GET /api/issues/{successor}` returning `blockedBy: [{ identifier: <follow-up>, status: <whatever> }]` BEFORE Josef merges. **CTO criterion-5 tightening per [comment 45895ce5](/DEE/issues/DEE-131#comment-45895ce5-17bf-4aa6-8f88-b7a5799577c6):** wired post-merge "to be filed later" does NOT satisfy criterion 5. Path B is the trade "merge now, hard-block next" — not "merge now, hope follow-up lands cleanly."

### 2.2 The 2 operational invariants

Once a `severity.max=P1 → APPROVED-via-carve-out` verdict has been granted, the following invariants govern the in-flight window until merge.

6. **PR-head-SHA freeze.** The PR head SHA is **frozen** from carve-out grant until merge. Any commit destined for that branch — even doc-only — MUST hold or land on a fresh branch off `main`. Reason: criteria 3 + 4 are evaluated against the immutable head SHA; pushing changes the SHA and resets the approval stack (CI re-run + Copilot re-review + sign-off citations stale). Originating arbitration: PM [comment dcc82519](/DEE/issues/DEE-131#comment-dcc82519-25c8-4b53-8340-d7b935743555) ("doc-only = harmless") was wrong in carve-out context; Sage's quarantine call held; CTO arbitration [comment a44fac6a](/DEE/issues/DEE-131#comment-a44fac6a-8e42-42ab-bb32-928131dfd9d3) made the freeze the spec rule.

7. **Stuck-counter non-reset.** The carve-out resolves the **verdict outcome** (no Round 2 on the carved-out story) but does NOT reset, freeze, or roll back the round counter. The round that produced the P1 verdict still consumed a slot. Round-3 escalation triggers remain armed for any follow-up PR (the test-coverage spec PR, the hygiene PR, the SOP PR, this amendment's own PR) that triggers a Round-2 verdict on related branches. Originating arbitration: PM "does NOT advance" framing in [comment dcc82519](/DEE/issues/DEE-131#comment-dcc82519-25c8-4b53-8340-d7b935743555) was wrong on the strict letter; CTO correction in [comment a44fac6a](/DEE/issues/DEE-131#comment-a44fac6a-8e42-42ab-bb32-928131dfd9d3) stands.

### 2.3 All-five-or-CHANGES (with operational-invariant kill-switch)

> **Rule.** If any one of the 5 entry criteria fails, the verdict is `CHANGES`. No partial carve-outs (e.g. "4/5 + we'll wire the dependency post-merge" is `CHANGES`; "production code IS changed but only cosmetically" is `CHANGES`).
>
> **Kill-switch.** If either operational invariant is violated after grant — a push lands on the PR head SHA before merge, or the round counter is silently reset — the carve-out is invalidated and the case re-enters Round-N+1 with a fresh board vote. The carve-out is not a "vest" that survives subsequent commits.

### 2.4 Explicit board vote per invocation

Until this amendment is merged on `main`, every future P1-with-merge candidate requires **explicit board vote** on the relevant Round-1 thread that:

- Cites all 5 entry criteria line-by-line (criterion 1 ✅ / ✗ + evidence; …; criterion 5 ✅ / ✗ + evidence).
- Acknowledges both operational invariants 6 + 7 in the verdict comment.
- Names the closing commit SHA (criterion 2) and the follow-up issue id (criterion 5) inline.

The vote pattern is CTO + PM + Sage, in line with [DEE-131](/DEE/issues/DEE-131) precedent. **No "Sage decides per-case." No automatic invocation, ever.** Once this amendment is merged, the explicit-board-vote requirement remains the default; Sage may grant the carve-out unilaterally only when (a) all 5 criteria are visibly green on the PR + thread, AND (b) CTO has not requested a thread vote on a specific case.

---

## 3. Non-criteria (the explicit anti-list)

The carve-out does NOT cover any of the following. These are CHANGES, full stop:

| Non-criterion                                                                                  | Failed criterion                       | Why                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "P1 production defect even if CI is green."                                                    | Criterion 1                            | Carve-out covers only test / doc / coverage findings. Production defects on PR head ⇒ CHANGES regardless of CI state.                                     |
| "P1 fix delivered in a separate PR not yet merged."                                            | Criterion 2                            | Closing commit MUST be on the PR head SHA. "Fix lives in another open PR" doesn't qualify; merge-order risk + criterion-3 evaluation breaks otherwise.    |
| "Follow-up issue exists but not wired as `blockedByIssueIds`."                                 | Criterion 5                            | Free-text "we'll track this in DEE-XXX" is not a hard dependency; auto-resume chain doesn't fire.                                                         |
| "Follow-up issue wired post-merge instead of pre-merge."                                       | Criterion 5 (CTO criterion-5 tightening) | "Wire after merge" is the slope the CTO tightening was designed to block. Pre-merge wiring + visible `blockedBy` on the successor is the load-bearing artefact. |
| "Doc-only or hygiene commit pushed to PR branch during in-flight window."                      | Invariant 6                            | Head SHA changes ⇒ CI / Copilot / sign-off citations stale ⇒ approval stack invalidated. Cherry-pick to a fresh branch off `main` post-merge instead.     |
| "Reset round counter to allow another shot at the same story."                                 | Invariant 7                            | The round happened. Counter increments. Round-3 escalation must remain armed.                                                                             |
| "P0 finding even with all 5 criteria + 2 invariants green."                                    | Out-of-scope (severity)                | The carve-out window is `severity.max=P1` only. P0 ⇒ CHANGES, no exception, ever.                                                                         |
| "Sage decides per-case without explicit board vote (pre-amendment merge) or CTO not consulted." | §2.4                                   | Spec requires explicit board vote per invocation until amendment merges; post-merge, CTO can still call a vote on any case.                              |

This anti-list is NOT exhaustive — it captures the rejection patterns visible from the [DEE-131](/DEE/issues/DEE-131) precedent. New rejection patterns surfaced on a future invocation should be appended to this table by amendment, not used as ad-hoc overrides.

---

## 4. Lived precedent — [DEE-131](/DEE/issues/DEE-131) Story 2.3 Round-1

The amendment is anchored in the [DEE-131](/DEE/issues/DEE-131) board verdict — Story 2.3 Round-1 board on DS [PR #36](https://github.com/Dexus-Forks/deepnest-next/pull/36) (`licenses:check` wire-in + Bundle 2 + Bundle 3 polish). This was the first invocation of the carve-out and forged the operational invariants in real time.

### 4.1 The case in 4 sentences

- **Finding F1** (Lydia, P1): regression-test gap on `scripts/check-licenses-budget.mjs:62` — the budget overrun branch lacked a unit test.
- **Production status of F1**: the production hole was already closed on PR head `2379aeb` by Copilot inline #3 (`r.error || r.signal` ⇒ `EXIT_BUDGET = 3`). F1 was the **missing regression test for an already-closed hole**, not a live defect.
- **Other findings**: F2 + F10 + Aegis defense-in-depth = hygiene / coverage / docs only; Bundle 2 + Bundle 3 closure 6/6 PASS at source level; CI 7/7 green on `2379aeb`.
- **Outcome**: board converged on Path B (ACCEPT) with the 5+2 framework adopted as the explicit gate for the merge. Path B was approved as **proof-of-concept**, NOT as "P1-with-green-CI ⇒ merge."

### 4.2 Board signal stack (full)

| Role          | Comment                                                                                              | Signal                                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sage (Review Leader, original verdict author) | thread-level Round-1 verdict ([comment f119dae2](/DEE/issues/DEE-131#comment-f119dae2-78d7-4e48-8149-acbab6473152)) | Verdict CHANGES `severity.max=P1`; substantive recommendation = Path B; F1 carved as test-add follow-up.                                            |
| John (PM)     | [comment bb3c7eb2](/DEE/issues/DEE-131#comment-bb3c7eb2-1fb3-4304-ae4a-a4d70ddbd71f)                 | First articulation of the 5-criterion gate (production-code unchanged, hole closed, CI green, CTO+TEA+Aegis sign-offs, hard `blockedByIssueIds`).   |
| CTO           | [comment 45895ce5](/DEE/issues/DEE-131#comment-45895ce5-17bf-4aa6-8f88-b7a5799577c6)                 | Adopted John's 5-point gate; **criterion-5 tightening** to PRE-merge wiring (not "to be wired later"). Conditions for Path B vote.                  |
| Murat (TEA)   | [comment f09bf227](/DEE/issues/DEE-131#comment-f09bf227-7bef-462d-bbe8-bb94d6084721)                 | Wire-up of [DEE-141](/DEE/issues/DEE-141) → [DEE-126](/DEE/issues/DEE-126) `blockedByIssueIds` verified pre-merge — criterion 5 closure evidence.   |
| Amelia (Dev)  | [comment eabbbd3c](/DEE/issues/DEE-131#comment-eabbbd3c-17ea-472f-ad40-3f0c06490162)                 | Acknowledged `cd54ca3` push-block (invariant 6 in action); F9 ownership concession.                                                                  |
| John (PM)     | [comment dcc82519](/DEE/issues/DEE-131#comment-dcc82519-25c8-4b53-8340-d7b935743555)                 | PM Path B vote — included two errors later corrected by CTO arbitration: (i) "doc-only push is harmless" (forge of invariant 6); (ii) "stuck-counter does NOT advance" (forge of invariant 7). |
| CTO           | [comment a44fac6a](/DEE/issues/DEE-131#comment-a44fac6a-8e42-42ab-bb32-928131dfd9d3)                 | **Arbitration** — overturned both PM errors. Codified invariants 6 + 7 as carve-out spec rules.                                                     |
| John (PM)     | [comment 944e9874](/DEE/issues/DEE-131#comment-944e9874-c5a5-4d9a-bb78-590fcbc0b978)                 | Concession on all 3 CTO arbitration points — locked the 5+2 framing.                                                                                |
| CTO           | [comment c2814303](/DEE/issues/DEE-131#comment-c2814303-630a-49d9-b72e-97cfdd6e13fc)                 | Close-out — scope locked at 5 entry criteria + 2 operational invariants for [DEE-142](/DEE/issues/DEE-142) draft. CTO sign-off pre-committed.       |

### 4.3 What the precedent established

- **The 5 entry criteria are not a vibe-check.** Each was tested against an artefact on the PR or the issue thread — no "we trust the agent" placeholders.
- **The 2 operational invariants emerged from PM-vs-Sage conflicts**, not from spec ideation. They are the rules-of-conduct that the in-flight window forced into existence. Future amendments should respect that lineage: operational invariants are forged, not designed.
- **Path B is a precedent for the framework, not for the outcome.** "Story 2.3 merged on a P1 with all 5+2 green" does NOT mean "the next P1 with green CI also merges" — it means "the next P1 with green CI gets evaluated against the 5+2 line-by-line via explicit board vote, and merges only if ALL criteria pass."

---

## 5. How to invoke the carve-out (procedure)

When a Round-N board verdict tally produces `severity.max=P1` and the lead reviewer (Sage or designated leader) believes the carve-out applies:

1. **Sage drafts the verdict comment** with the 5-criterion line-by-line audit, citing the closing commit SHA (criterion 2), the CI evidence (criterion 3), the three sign-off comment ids (criterion 4), and the follow-up issue + `blockedByIssueIds` target (criterion 5). The verdict comment also explicitly acknowledges invariants 6 + 7.
2. **CTO + PM + Sage explicit board vote** on the verdict thread. Each agent posts a vote comment that re-cites the 5 criteria with their independent ✅ / ✗ assessment. CTO's vote is binding on governance read; PM's vote is binding on scope; Sage's verdict is binding on technical / quality read.
3. **Pre-merge precondition gate** — before the merge button is pressed:
    - `blockedByIssueIds` wire-up confirmed via `GET /api/issues/{successor}` showing the follow-up in `blockedBy`. (Murat or Amelia confirmation comment recommended.)
    - Head SHA frozen — no commits to the PR branch from the carve-out grant moment until merge (invariant 6).
    - Round counter NOT reset (invariant 7).
4. **Merge** by Josef (or whoever holds the GitHub merge authority on the relevant repo) per `_bmad-output/project-context.md` §15 PR merge gate. Carve-out grant does NOT bypass §15 — the Copilot wait + revise loop and DEE-114 `Copilot review` status check both still apply.
5. **Post-merge auto-resume chain** — the dependent (carve-out follow-up → successor story) auto-resumes on `issue_blockers_resolved` once the carved story closes.
6. **Audit entry** — Sage appends a row to the SOP audit log table below (§7) noting the case, the closing commit, and any rejection patterns surfaced (for future anti-list expansion).

If at any point the carve-out fails (any of the 5 criteria flips ✗, or either invariant is violated), Sage MUST flip the verdict to CHANGES and the case re-enters Round-N+1.

---

## 6. Out of scope

- **Re-litigating Path A vs Path B for [DEE-131](/DEE/issues/DEE-131).** Settled by board convergence per [comment c2814303](/DEE/issues/DEE-131#comment-c2814303-630a-49d9-b72e-97cfdd6e13fc).
- **Carve-outs for P0 findings.** P0 ⇒ CHANGES, no exception, ever.
- **Carve-outs for production-code defects (any severity).** Carve-out covers only test / doc / coverage findings on already-closed production holes.
- **Automatic invocation.** Even after this amendment merges, every invocation requires the §5 procedure (verdict comment with the 5-criterion line-by-line audit + invariants acknowledgement); CTO retains the right to call an explicit board vote on any case.
- **Scope expansion within this issue.** Locked at 5 + 2 per CTO close-out [comment c2814303](/DEE/issues/DEE-131#comment-c2814303-630a-49d9-b72e-97cfdd6e13fc). New operational rules discovered during authoring or future invocations land via separate amendment, not via edit-in-place on this doc.

---

## 7. Audit log

Append a row each time the carve-out is invoked. The audit log is the load-bearing artefact for "is this rule still load-bearing or is it being abused?" reviews.

| Date       | Story / PR                                                       | Closing commit | Verdict comment                                                                                       | Rejection patterns surfaced |
| ---------- | ---------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------- | --------------------------- |
| 2026-04-27 | Story 2.3 / [PR #36](https://github.com/Dexus-Forks/deepnest-next/pull/36) (DEE-124) | `2379aeb`      | [DEE-131](/DEE/issues/DEE-131) thread (Sage [f119dae2](/DEE/issues/DEE-131#comment-f119dae2-78d7-4e48-8149-acbab6473152) → CTO [c2814303](/DEE/issues/DEE-131#comment-c2814303-630a-49d9-b72e-97cfdd6e13fc) close-out) | Forged invariants 6 + 7. PM "doc-only push harmless" + "stuck-counter does NOT advance" rejected. |

---

## 8. Cross-references

- **Parent governance issue:** [DEE-122](/DEE/issues/DEE-122) — review-protocol spec amendment (CS-style spec context).
- **Authoring issue:** [DEE-142](/DEE/issues/DEE-142) — this amendment's tracking issue.
- **Lived precedent:** [DEE-131](/DEE/issues/DEE-131) — Story 2.3 Round-1 board verdict thread.
- **Carve-out follow-up issues filed via Path B:**
  - [DEE-141](/DEE/issues/DEE-141) — F1 + F2 + F10 + Aegis hardening test PR (Murat) — `blockedBy: DEE-131`; blocks [DEE-126](/DEE/issues/DEE-126).
  - [DEE-143](/DEE/issues/DEE-143) — F9 build-tooling test SOP (Amelia) — `blockedBy: DEE-131`; PM doc-gate.
  - [DEE-142](/DEE/issues/DEE-142) — this amendment (John) — `blockedBy: DEE-131`.
- **Related SOPs:**
  - `_bmad-output/project-context.md` §15 — PR merge gate (Copilot wait + revise). Carve-out grant does NOT bypass §15; criterion 3 is evaluated against §15's `Copilot review` status check.
  - `_bmad-output/project-context.md` §19 — TEA closer PR pre-flight (rebase before opening). Applies to this amendment's PR per CEO policy [DEE-113](/DEE/issues/DEE-113).
  - `_bmad-output/sops/phase5-trace-dispatch.md` — Phase-5 tea-trace dispatch caller-discipline.
- **Phase-5 SOP index:** `_bmad-output/bmad-phase-5-index.md`. (This SOP is **not** a Phase-5 SOP — it governs Round-N board verdicts, which are Phase-3/4 surface — and is therefore not indexed there.)

---

## 9. Acceptance evidence

| AC                                                                                                  | How this doc satisfies it |
| --------------------------------------------------------------------------------------------------- | ------------------------- |
| AC1 — define the 5-point entry gate per board adoption                                              | §2.1 (1)–(5).             |
| AC2 — define the 2 operational invariants                                                           | §2.2 (6)–(7).             |
| AC3 — state the all-five-or-CHANGES rule                                                            | §2.3.                     |
| AC4 — require explicit board vote per invocation until amendment merges                             | §2.4 + §5.2.              |
| AC5 — cite [DEE-131](/DEE/issues/DEE-131) as the lived precedent with full board signal stack       | §4 + §4.2 table.          |
| AC6 — document non-criteria explicitly (anti-list)                                                  | §3.                       |
| Scope-lock at 5 + 2                                                                                 | Frontmatter `scope_lock` + §6 last bullet. |
| Cite originating arbitration comments inline                                                        | §2.2 (6) + (7) ids; §4.2 table. |

---

_Last updated: 2026-04-27 (John, [DEE-142](/DEE/issues/DEE-142) authoring — initial draft against scope-lock 5 + 2 per CTO close-out [c2814303](/DEE/issues/DEE-131#comment-c2814303-630a-49d9-b72e-97cfdd6e13fc); pending CTO + Sage sign-off on PR.)._
