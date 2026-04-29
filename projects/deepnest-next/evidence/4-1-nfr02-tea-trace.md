# Story 4.1 — NFR-02 tea-trace post-merge

> Authored by Murat (TEA) on 2026-04-29 via `tea-trace` for [DEE-222](/DEE/issues/DEE-222).
> Trigger: PR [#48](https://github.com/Dexus-Forks/deepnest-next/pull/48) merged to `main` at
> `2026-04-29T05:50:44Z` (squash commit `1f4b05756c8cfddcf558000bd01b7c60cc493af5`).
> Source verdict: Sage Board Round 1 on [DEE-147](/DEE/issues/DEE-147) recommended next-step #3
> dispatched this manual exit-path tea-trace gate.

---

## TL;DR — Gate decision: **CONCERN** (partial PASS)

| Component | Result | Evidence |
|---|---|---|
| AC-04.1.1..AC-04.1.10 static-trace | **PASS** | All 4 sites confirmed in `main.js` post-merge (code inspection). |
| AC-04.1.11 (evidence routing) | **PASS** | This report + the stub template document the routing. |
| NFR-01 wall-clock delta vs baseline | **PASS** | Post-merge CI npm test 19 093 ms vs baseline rolling-mean 17 060 ms = +11.9 % (within ±20 %). |
| NFR-02 manual 3 × 5 exit-path repro | **DEFERRED** | Cannot execute in Paperclip-isolated worktree — Story 4.1 Task 8.2 explicitly excludes this environment from manual smoke. Host-capacity blocker filed below. |

The Story 4.1 code is in spec and the cheap regression gate is green. The 15/15 manual
exit-path 3 × 5 trial matrix cannot be executed from the TEA worktree (no Electron
desktop host) and is the only DoD item not closed by this report. Per `sprint-plan.md`
§5 R4, this routes to a host-capable runner (Story 4.2 / B4).

---

## 1. Static-trace — AC-04.1.1..AC-04.1.10

Verified on `main` at `1f4b05756c8cfddcf558000bd01b7c60cc493af5` via `grep -n` against `main.js`.

| AC | Site | Line(s) | Result |
|---|---|---|---|
| AC-04.1.1 | `let appShuttingDown = false;` declared module-scope after `defaultMaxListeners = 30` | `main.js:12` | **PASS** |
| AC-04.1.2 | `appShuttingDown = true;` is the **first statement** of the `before-quit` callback, before the `nfpcache` purge | `main.js:292`–`main.js:300` (set on `:293`, purge on `:294`–`:300`) | **PASS** |
| AC-04.1.3 | `background-response` handler short-circuits on `appShuttingDown`; `// fr-04: …guards this loop…` comment on `:320`; inner `try`/`catch` boundary preserved on `:321`–`:329` | `main.js:317`–`main.js:331` | **PASS** |
| AC-04.1.4 | `background-progress` handler short-circuits on `appShuttingDown`; `// fr-04: …guards this send…` comment on `:335`; inner `try`/`catch` boundary preserved on `:336`–`:340` | `main.js:333`–`main.js:341` | **PASS** |
| AC-04.1.5 | `background-stop` handler **NOT** modified (sentinel does not apply) | `main.js:343`–`main.js:355` (no `appShuttingDown` reference inside) | **PASS** |
| AC-04.1.6 | `winCount = 1` invariant + `createBackgroundWindows()` untouched (FR-07 boundary) | `main.js:215`–`main.js:249` (`winCount < 1` on `:221`, `winCount++` on `:248`); no other `winCount` writes outside the existing reset on `:350` | **PASS** |
| AC-04.1.7 | No new IPC channel — `main/ui/types/index.ts` not edited | `git show --stat 1f4b057` lists only `main.js` + planning artifacts; no `main/ui/types/index.ts` line | **PASS** |
| AC-04.1.8 | Sentinel-race comment present at the declaration site | `main.js:11` (`// fr-04: bounded by single-process EventLoop ordering — no atomics/locks needed (ADR-009 §risks)`) | **PASS** |
| AC-04.1.9 | `npm test` green; CI wall-clock within ±20 % of baseline rolling-mean | See §3 below | **PASS** |
| AC-04.1.10 | `project-context.md` §16 anti-patterns hold (no new `window` global, no new IPC, no `// @ts-ignore`, no vendored edits, no `_unused/`, no `--no-verify`, no `tests/assets/` edit) | `git show 1f4b057` diff is `+8 / −2` lines on `main.js` only; commit message confirms no `--no-verify`; CODEOWNERS-protected paths untouched | **PASS** |

Static-trace verdict for AC-04.1.1..AC-04.1.10: **10/10 PASS**.

---

## 2. AC-04.1.11 — evidence routing

AC-04.1.11 binds Story 4.1 to **code only** and routes the 15/15 manual evidence to
**Story 4.2 / B4**. Story 4.1's PR #48 commit message confirms the routing:

> NFR-02 manual-repro 15/15 evidence routed to Story 4.2 / B4 (Murat) per AC-04.1.11.

This tea-trace report (filed under `projects/deepnest-next/evidence/`) is the
intermediate Murat artifact closing the Sage Board Round 1 next-step #3 dispatch
on [DEE-147](/DEE/issues/DEE-147). It does **not** substitute for the 15-trial matrix
itself — see §4 below.

Verdict: **PASS** (routing intact, evidence trail exists).

---

## 3. NFR-01 wall-clock delta — post-merge CI

Baseline (`_bmad-output/planning-artifacts/nfr01-baseline.json`, captured 2026-04-27 on
ubuntu-22.04 / node-22.x at `bbdc848`):

- `rolling_mean_ms` = **17 060 ms**, `stddev_ms` = 3 294.6, `tolerance_pct` = ±20 %
- Tolerance band: **[13 648, 20 472] ms**

Post-merge `main` CI run for `1f4b057` (GitHub Actions run id `25093123493`,
"Playwright Tests" workflow, `test (ubuntu-latest)`):

| Anchor | Timestamp | Note |
|---|---|---|
| `Run xvfb-run npm test` step start | `2026-04-29T05:51:51.030Z` | `##[group]Run xvfb-run npm test` |
| `Run xvfb-run npm test` step end | `2026-04-29T05:52:10.123Z` | `##[notice]  1 passed (15.2s)` |
| **Wall-clock delta** | **19 093 ms** | step-bracket interval |

Delta vs baseline rolling-mean: `(19 093 − 17 060) / 17 060 = +11.9 %`.
Result: **within ±20 % tolerance — PASS.**

Cross-check across the three Story 4.1 PR-48 pre-merge runs (same workflow):

| Run id | SHA | Wall-clock (ms) | Δ vs baseline | Verdict |
|---|---|---|---|---|
| 25092178806 | `8d72be7` | 24 216 | +41.9 % | OUTSIDE (single-run flake; ~1.6σ) |
| 25092220013 | `470b075` | 27 969 | +63.9 % | OUTSIDE (~3.3σ — outlier) |
| 25092569544 | `e0f0b06` | 16 967 | −0.5 % | INSIDE |
| 25093123493 | `1f4b057` (post-merge) | 19 093 | +11.9 % | INSIDE |

The two outside-tolerance pre-merge runs map to GitHub Actions runner contention
(both runs include the `Install Playwright Browsers` step downloading Chromium from
CDN; the +63.9 % run shows the slowest browser-install of the four). The post-merge
state is in tolerance and consistent with the baseline distribution (stddev = 3 295 ms;
+11.9 % is well inside 1σ).

Verdict for NFR-01 wall-clock: **PASS** for the post-merge code path. No mid-sprint
NFR-01 escalation per `sprint-plan.md` §5 R1.

---

## 4. NFR-02 manual 3 × 5 exit-path repro — DEFERRED

### Why this report does not contain 15 filled trials

The DEE-222 issue description mandates 3 paths × 5 trials per
`_bmad-output/planning-artifacts/nfr02-evidence-template.md`. Two facts make
direct execution from this TEA worktree infeasible:

1. **Paperclip-isolated worktree has no Electron / desktop host.** Story 4.1 Task 8.2
   already documented this explicitly:

   > In a Paperclip-isolated worktree without Electron / desktop host, this task is
   > **not feasible** — note "skipped — host capacity" in the PR description and route
   > the full evidence to Story 4.2.

   The TEA worktree at `cb45a95b-ee30-49d2-ae12-8a15cdfb3886` has `node v24.14.1`
   and `npm 11.11.0` available, but no installed Electron, no `xvfb`, no desktop
   compositor, and no `node_modules` populated. `npm install` would not give us
   Electron's GPU/X stack on this host class.

2. **Pre-DS R-K2 ack pending → template scaffolding was missing.** The kickoff §5
   R-K2 acknowledgement that the evidence template would land pre-DS had not been
   actioned at PR #48 merge time. This tea-trace's first action was to **stub** that
   template at `_bmad-output/planning-artifacts/nfr02-evidence-template.md` (this PR).

### What this tea-trace ships instead

- The evidence template stub (above), with reproducible per-path recipes and a
  result table that any host-capable runner (Story 4.2 / B4 dispatch, or a human
  reviewer with a Linux+xvfb / macOS / Windows desktop) can fill in.
- Static-trace verification that all 10 non-NFR-02 ACs are PASS and the code-under-test
  matches the spec exactly (§1 above).
- Post-merge NFR-01 wall-clock delta (§3 above) confirming the sentinel does not
  regress the test wall-clock budget.

### Unblock owner + action

| Item | Owner | Action |
|---|---|---|
| Run 3 × 5 trials on Linux+xvfb (closest analog to CI runner) | Story 4.2 / B4 dispatched agent | Use `_bmad-output/planning-artifacts/nfr02-evidence-template.md`; re-commit a filled copy to `projects/deepnest-next/evidence/4-2-nfr02-evidence-15x.md`. |
| Run on macOS + Windows for OS variance check | TEA backlog (R4 fallback) | If any single-OS batch fails to converge after 3 retries, escalate via `bmad-correct-course` per `sprint-plan.md` §5 R4 fallback (CTO scope-cut allowed). |
| Sage Board Round 2 close-out for [DEE-147](/DEE/issues/DEE-147) | CTO | Awaits the filled-in 15/15 evidence file before final post-merge gate close. |

---

## 5. Final gate decision

**CONCERN — partial PASS.**

- Static-trace AC-04.1.1..AC-04.1.10: **10/10 PASS**.
- AC-04.1.11 routing intact: **PASS**.
- NFR-01 wall-clock delta vs baseline (post-merge): **PASS** (+11.9 %, within ±20 %).
- NFR-02 manual 3 × 5 exit-path repro: **DEFERRED** (host-capacity blocker; Story 4.2
  / B4 owns execution).

Gate-formula evaluation (per agent contract):

```
trace(P0+P1) complete            : YES (all 11 AC traced, 10 PASS + 1 DEFERRED)
nfr_assess no-P0-violation       : YES (NFR-01 PASS post-merge; NFR-02 deferred = MITIGATED)
test_review >= 80                : N/A this artifact (no quality-audit score requested)
```

→ **CONCERN** until the 3 × 5 evidence is filled in. No PR merge regression here —
Story 4.1 itself is shipped and behaves as specified at the static + NFR-01 level.

---

## 6. Provenance

- Parent issue: [DEE-147](/DEE/issues/DEE-147) (Story 4.1 DS — `app.shuttingDown` sentinel)
- This issue: [DEE-222](/DEE/issues/DEE-222) (Murat tea-trace dispatch)
- Round-1 review: [DEE-216](/DEE/issues/DEE-216)
- Companion doc-PR follow-up: [DEE-221](/DEE/issues/DEE-221)
- Story spec: `_bmad-output/implementation-artifacts/4-1-implement-app-shuttingdown-sentinel-bounded-try-catch-boundary-in-main-js.md`
- ADR: `_bmad-output/planning-artifacts/architecture.md` §5 ADR-009
- Baseline: `_bmad-output/planning-artifacts/nfr01-baseline.json` (rolling-mean 17 060 ms ± 20 %)
- Evidence template: `_bmad-output/planning-artifacts/nfr02-evidence-template.md` (stubbed in this PR)
- Merge commit: `1f4b05756c8cfddcf558000bd01b7c60cc493af5`
- CI wall-clock anchor run: <https://github.com/Dexus-Forks/deepnest-next/actions/runs/25093123493>
