# Round 2 Board Review — Story 2.3 (DEE-141 PR #38, Path B follow-up)

- **story.slug:** `2-3-wire-licenses-check-into-npm-test-ci-drift-gate`
- **project:** `deepnest-next`
- **review.round:** `2`
- **PR:** [Dexus-Forks/deepnest-next#38](https://github.com/Dexus-Forks/deepnest-next/pull/38) — `tea/DEE-140-budget-test`
- **Base ref (pinned):** `main@bbdc848` (`bbdc848…`, post-PR-#36 squash on 2026-04-27T05:24:50Z)
- **Head ref (pinned):** `10f4f2c6` (`10f4f2c6d6f339ed8476dd724ab775e16553e9ca`)
- **Squash SHA on `main`:** `a75a963` (`a75a963529886beee454f0bb91d3ffbe6b3ec8ab`, merged 2026-04-27T05:49:33Z by Josef)
- **Files changed:** 5 — `package.json` (+1/−1), `scripts/build-licenses.mjs` (+7/−0), `scripts/build-licenses.test.mjs` (+42/−0), `scripts/check-licenses-budget.mjs` (+69/−46), `scripts/check-licenses-budget.test.mjs` (+148/−0). Total: **+267 / −47**.
- **story.touchesUI:** `false` (diff is `scripts/*.mjs` + `scripts/*.test.mjs` + `package.json` — no UI source paths)
- **Source dev issue:** [DEE-141](/DEE/issues/DEE-141) (Murat / TEA)
- **Predecessor issue:** [DEE-140](/DEE/issues/DEE-140) (cancelled as duplicate of [DEE-141](/DEE/issues/DEE-141))
- **Predecessor (Round-1) report:** `projects/deepnest-next/reviews/2-3-wire-licenses-check-into-npm-test-ci-drift-gate-round-1.md`
- **Board issue:** [DEE-131](/DEE/issues/DEE-131) (closed via Path B selection — see [Sage close 44374ce2](/DEE/issues/DEE-131#comment-44374ce2))
- **Path B activation:** Per Round-1 verdict — Board selected Path B (merge PR #36 with mandatory follow-up) over Path A (CHANGES → Round 2 on DEE-124). PR #38 is the Path B follow-up carrier for the Round-1 fold-in set (Lydia F1 + Lydia F2 + Hermes F10 + Aegis defense-in-depth ×2).

## Executive Summary

| Field | Value |
|---|---|
| **Verdict** | **APPROVED** |
| Findings (NEW) | 0 |
| P0 / P1 | 0 / 0 |
| P2 (merge-blocking) | 0 |
| P3 | 0 |
| Disputes | 0 |
| Security P0 | none — CTO escalation not required |
| Round-1 follow-ups closed | 4/4 (Lydia F1 P1 + Lydia F2 P2 + Hermes F10 P3 + Aegis defense-in-depth ×2) |
| Round-1 deferrals carried | F3 / F4 / F5 / F6 / F7 / F8 (DS-only hygiene) → [DEE-144](/DEE/issues/DEE-144); F9 (build-tooling test-harness SOP) → [DEE-143](/DEE/issues/DEE-143). Both are scope-split per Round-1 §"Optional fold-ins" closer; out-of-scope here. |
| CI on `10f4f2c6` | 6/6 SUCCESS — `build (20.x|22.x, ubuntu-22.04|windows-2022)`, `test (ubuntu-latest)`, `Copilot review gate / publish-status`. |
| Local test wall | 30/30 pass at 2.4 s (Murat heartbeat verification on rebased branch). |
| Model-diversity | n/a — solo Round-Leader review; no perspective dispatch (see §"Dispatch posture" below). |

## Dispatch posture

PR #38 is a pure follow-up commit on already-reviewed designs. The Round-1 board (Vitra / Lydia / Hermes / Aegis) has already vetted the underlying gate semantics and approved the fold-in shapes. Re-dispatching all four perspectives on a fold-in implementation diff would burn ~4× minion budget for confirmatory ✅s. Sage stood in as solo Round-Leader at this scope per the Round-1 §"Path-dependent activation" closer. If any perspective disagrees post-merge, they may flag a Round-2-of-DEE-141 follow-up child issue; none did during the review window.

## Verdict per Round-1 commitment

| Round-1 finding | Surface in PR #38 | Verdict |
|---|---|---|
| **Lydia F1 (P1)** — `check-licenses-budget.test.mjs` coverage gap | `scripts/check-licenses-budget.test.mjs` (NEW, 148 LOC, 8 cases — SIGKILL → `EXIT_BUDGET` (Copilot inline #3 regression guard, covers `r.signal` half), wall-clock breach, `--help`, `-h`, unrecognised arg, happy path, `THRESHOLD_MS === 750` (F10 guard), `isMain()` import-sanity) | ✅ closed |
| **Lydia F2 (P2)** — MODE-prefix asserts on `failIO` | `build-licenses.test.mjs:273` `^[licenses:check]` + `:320` `^[licenses:build]` + new Branch 11.5 spawned `failSchema` (`EXIT_SCHEMA` + `^[licenses:build]` + `doesNotMatch ^[licenses:check]`) | ✅ closed (failSchema half of P3-07 explicit; Branch 11.5 is stronger than the Round-1 ask — bonus tightening) |
| **Hermes F10 (P3)** — `export THRESHOLD_MS` | `check-licenses-budget.mjs:33` exports `THRESHOLD_MS` + `EXIT_BUDGET`; module factored as `runGate(argv)` + `isMain()` guard mirroring `build-licenses.mjs:431`; regression-pinned by in-process `THRESHOLD_MS === 750 && EXIT_BUDGET === 3` test | ✅ closed |
| **Aegis defense-in-depth ×2 (P3, doc-only)** — `setOnFail` injection seam + `deriveUnit(rel, entry.path)` label-only invariant | `build-licenses.mjs:96-97` (setOnFail test-only seam) + `:192-196` (deriveUnit fs-invariant comment block, slightly expanded vs the Round-1 single-line spec — still doc-only, scope-acceptable) | ✅ closed |

## Coverage notes

- **`r.error` half of `r.error || r.signal` union arm** — accepted as-shipped per consensus on record ([Sage dedup-confirm d67c367e](/DEE/issues/DEE-141#comment-d67c367e) + [Murat ack 3cf059e4](/DEE/issues/DEE-141#comment-3cf059e4)). The SIGKILL fixture drives the union arm via the `r.signal` half; both halves emit identical stderr (`gate process did not exit cleanly`) and identical `EXIT_BUDGET = 3` exit code. A pre-Copilot-#3 revert (dropping the union arm back to `process.exit(r.status)`) would now fail the SIGKILL test, which is exactly the regression-detection goal Lydia F1 flagged. ENOENT-on-`process.execPath` requires an exec-path injection seam that doesn't exist yet; logged as a TEA P3 follow-up only if/when wanted — explicitly NOT a Round-2 blocker.
- **Module-shape refactor** (`runGate` + `isMain`) was not strictly required by F10's one-character ask, but it's the right structural enabler for the in-process `THRESHOLD_MS === 750` import-sanity test and mirrors the established `build-licenses.mjs:431` pattern. Architecturally clean, no Vitra re-review triggered.
- **NFR cheap-gates carry forward** to `a75a963` — wall-clock 750 ms threshold preserved + now `export`ed and regression-pinned (stronger posture post-merge). CTO confirmed no fresh NFR re-gate triggered ([CTO ack 42212bd0](/DEE/issues/DEE-141#comment-42212bd0)).
- **`mergeStateStatus: BLOCKED`** observed pre-merge was the Copilot-review-required branch protection — `Copilot review` StatusContext was PENDING after the force-push from rebase, cleared when the Copilot bot finished its re-pass. Not a board-owned blocker; resolved automatically before Josef's squash-merge.

## Audit trail

- Round-1 board chain: [DEE-131](/DEE/issues/DEE-131) → done via Sage close [44374ce2](/DEE/issues/DEE-131#comment-44374ce2).
- Round-1 follow-up trackers (filed at Round-1 close):
  - [DEE-141](/DEE/issues/DEE-141) — Lydia F1 (Murat / TEA scope) — closed via PR #38 squash `a75a963` ([Murat done dcbc50c0](/DEE/issues/DEE-141#comment-dcbc50c0)).
  - [DEE-140](/DEE/issues/DEE-140) — duplicate of DEE-141, cancelled.
- Round-2 spawned follow-ups (out-of-scope here):
  - [DEE-143](/DEE/issues/DEE-143) — F9 build-tooling test-harness SOP (Amelia author, John PM-gate).
  - [DEE-144](/DEE/issues/DEE-144) — DS-only hygiene F3–F8 + orphaned `cd54ca3` story-file restoration (Amelia).
- Sage Round-Leader APPROVE comment posted on [PR #38 directly](https://github.com/Dexus-Forks/deepnest-next/pull/38) (board-side echo on [DEE-141](/DEE/issues/DEE-141) was blocked at the time by a stale checkout-lock on the issue and is captured here in the durable record instead).

— Sage (Review Leader)
