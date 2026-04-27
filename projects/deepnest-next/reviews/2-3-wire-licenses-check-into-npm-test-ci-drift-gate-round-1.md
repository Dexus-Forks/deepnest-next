# Board Review — Story 2.3, round 1 — consolidated report

**Story:** Story 2.3 — Wire `licenses:check` into `npm test` (CI drift gate) — Bundle 2 (P2-04 onFail harness + P3-06 Hermes 750 ms guard) + Bundle 3 polish (P3-03 / P3-04 / P3-05 + Copilot inline #3 / #4 = P3-07)
**Story slug:** `2-3-wire-licenses-check-into-npm-test-ci-drift-gate`
**PR:** [#36](https://github.com/Dexus-Forks/deepnest-next/pull/36) — branch `DEE-124-story-2-3-ds` @ `2379aeb` against `main` @ `fe2b9b9`
**Review round:** 1
**Review-Leader:** Sage (`claude_local` / `claude-opus-4-7`)
**Parent review issue:** [DEE-131](/DEE/issues/DEE-131)
**Source dev issue:** [DEE-124](/DEE/issues/DEE-124) (Amelia, DS)
**Spec source:** [DEE-122](/DEE/issues/DEE-122) (John, CS) — PR #35 commit `012ffd9` (now on `main`); spec at `_bmad-output/implementation-artifacts/2-3-wire-licenses-check-into-npm-test-ci-drift-gate.md` (13 ACs / 15 Tasks).
**Predecessor (Story 2.2 / Round-1):** [DEE-93](/DEE/issues/DEE-93) APPROVED `severity.max=P2`; consolidated report at `projects/deepnest-next/reviews/2-2-implement-scripts-build-licenses-mjs-generator-script-round-1.md`. Round-2 + Round-2.5 APPROVED `severity.max=P3` per [DEE-116](/DEE/issues/DEE-116). Bundle 2/3 fold-ins (P2-04, P3-03/04/05/06/07) all closed in this PR — verified per-perspective below.

---

## Verdict

**CHANGES** — `severity.max = P1` (single P1 from Lydia / code-quality). All Bundle 2/3 closure items **PASS at source level** across all four dispatched perspectives. The single P1 is a **test-coverage gap** on Copilot inline #3 (the spawn-fail / signal-kill exit-3 path in `scripts/check-licenses-budget.mjs`), not a regression and not a broken fix. It is below the P0 security blocker threshold; `release.gate.fail` is **not** emitted (Aegis confirmed `findings: []` for security).

Per `review-aggregate` step 11 / Review-Leader playbook step 11 the rule is hard: any P0 or P1 ⇒ never APPROVED. Lydia's own recommendation is to *roll the P1 forward as a Murat-scope (TEA) follow-up child issue rather than block the PR #36 merge*, and Sage concurs on the substance — but the verdict surfaced to Amelia must reflect the rule. **The Board's release decision (block-merge vs. merge-with-mandatory-follow-up) is not Sage's call** — it is Amelia's / John's / CTO's per the Phase-4 protocol. A follow-up child issue ([DEE-141](/DEE/issues/DEE-141)) has been filed alongside this report so the Board can choose either path without losing the gap.

The two P2 and three P3 findings are hygiene / coverage tightening only. None block merge on their own; none are P1. No disputes (one minion per perspective by design, dispute-detection vacuously inactive). No coverage gap at the perspective level (see §"Coverage report").

---

## Coverage report

### Reviewer-perspective coverage

| Perspective | Reviewer (`metadata.perspective`) | Agent slug | Adapter | Outcome | Status |
|---|---|---|---|---|---|
| security | Aegis (`reviewer-security`) | `859aa171-f01c-4ed8-bb5e-19f3e2113ad3` | `claude_local` | `findings: []` (`severity.max = none`) | ✅ covered |
| architecture | Vitra (`reviewer-architecture`) | `55b68ff2-5f93-4613-9a8f-8d53a7757e20` | `claude_local` | 3× P3 | ✅ covered |
| performance | Hermes (`reviewer-performance`) | `9bb7916b-83bb-438f-8881-b848d64aa563` | `claude_local` | 1× P3 | ✅ covered |
| code-quality | Lydia (`reviewer-code-quality`) | `f0452a25-2e23-4a9f-ba2e-2299f154511c` | `claude_local` | 1× P1 + 2× P2 + 2× P3 | ✅ covered |
| accessibility | Iris (`reviewer-accessibility`, `conditional: true`) | `9d50d97b-…` | `claude_local` | runWhen unmet | ❎ **not dispatched** — `event.story.touchesUI = false` (diff is `scripts/*.mjs` + `scripts/*.test.mjs` + `package.json` + `_bmad-output/...` planning docs only; no UI source paths in the 6-file diff; story has no `tags: [ui, frontend]`). Same conditional-skip logic as Story 2.1 / 2.2 Round-1 precedent. |

**No `no-reviewer-for-perspective` warning** — every required perspective is covered or correctly conditional-skipped.

### Model-diversity check

ℹ️ **`model-diversity: warning (informational, not blocker)`.** All four dispatched minions are configured with `adapter.type: claude_local`. **No same-perspective duplicate exists** (one minion per perspective) — so adapter+model duplication within a perspective is vacuously absent and within-perspective dispute detection (Jaccard / IoU finding-overlap) is inactive by design. This matches the Story 2.1 / 2.2 Round-1 posture and is informational only; the Board / User can hire additional perspective minions on different adapters in Paperclip-UI to enable dispute detection on future rounds without touching `.paperclip.yaml`.

### Other coverage notes

- `tests.coverage.gaps`: **one P1** — Lydia F1 names the absence of a test file for `scripts/check-licenses-budget.mjs`. Spawn-error / signal-kill / threshold-breach / `--help` / unrecognised-arg branches are entirely uncovered by automated tests. Folded into the P1 row below; raised as follow-up child issue [DEE-141](/DEE/issues/DEE-141) (Murat / TEA scope) so the gap is owned regardless of the Board's merge decision on PR #36.
- `dispute.within-perspective`: **inactive** — only 1 reviewer per perspective.
- `dispute.cross-perspective`: **none.** Dedup walk (location ±3 lines + compatible category, per `review-aggregate` step 3) shows no two perspectives flagged the same line. Adjacent observations on `scripts/check-licenses-budget.mjs` (Vitra P3 on lines 14-19/50/74/85, Hermes P3 on line 33, Lydia P1 on lines 62-68) all sit on **different** lines and **different** categories (adr-missing / boundary-hygiene vs. naming/exports vs. test-coverage) and are kept as distinct findings.
- `user-input.during-window`: none received during the 15-minute aggregation window.

---

## Pre-flight verification (Sage, deterministic)

The following structural checks are inherited from the cheap-gate evidence the Board issue [DEE-131](/DEE/issues/DEE-131) attached to its dispatch + the per-perspective minion reports. All pass at the source level on `2379aeb`.

| Check | Result | Evidence |
|---|---|---|
| Diff scope (6 files) | ✅ matches PR claim | PR description / DEE-131 brief; `_bmad-output/...` docs (×2), `package.json`, `scripts/build-licenses.mjs` (modified, +201/−60), `scripts/build-licenses.test.mjs` (NEW, +513), `scripts/check-licenses-budget.mjs` (NEW, +91) |
| Zero diff to executable surfaces outside `scripts/` (Phase-2 §16 / DEE-98 fold-in scope discipline) | ✅ clean | Confirmed by all 4 minions; `main/util/` is referenced as a *data input* path only (`main/util/LICENSE.yml`), no `*.js`/`*.ts` source under `main/` touched. |
| `package-lock.json` unchanged (zero-dep guarantee, ADR-008 + AC-02.3.* posture) | ✅ confirmed | Confirmed by Aegis §7 (zero external dependency additions). |
| CI checks on `2379aeb` | ✅ 7/7 SUCCESS | Playwright × 1 + build × 4 + publish-status × 2 (per DEE-131 brief) |
| Local `npm test` chain executes the new gate | ✅ confirmed via wire-in shape | `package.json scripts.test` final shape: `node scripts/check-licenses-budget.mjs && npm run test:licenses && npm run test:fixtures:check && playwright test` |
| `node:test` harness pass rate | ✅ 21/21 pass | Per Lydia § / Vitra § (build-licenses.test.mjs covers all 13 fail-fast branches + Copilot #1/#2/#4 + truncation banner + dispatcher exits + isMain guard) |
| TEA NFR-01 sign-off (Murat) | ✅ APPROVED | Threshold LOCKED at 750 ms; CI cell wall-clock n=2 mean 31 ms (24× margin); Story 2.3 chain delta `~700 ms = +4.2 %` vs Story 2.2 baseline NFR-01 envelope `[13 397, 20 096] ms`. |
| CTO NFR sign-off (no conditions) | ✅ APPROVED | Per [DEE-131](/DEE/issues/DEE-131) — NFR-01 + AC-02.3.4 + ADR-008 §3.3 + NFR-08; gate-vs-script exit-code separation + spawn-failure path verified. |
| §16 anti-pattern hot greps (16/16) | ✅ clean (spot-checked rows confirmed) | Per Lydia §"Anti-pattern audit": §1 `window.*` PASS, §5 `main/util/` source edit PASS, §9 `--no-verify` PASS, §15 ESLint global ignore PASS; Aegis §7/§8 confirm no IPC/HTTP/DB/telemetry adds and no `--no-verify` reuse. |
| Bundle 2/3 closure (P2-04 + P3-03/04/05/06/07 + Copilot #1/#2/#3/#4) | ✅ all PASS at source level | See `Bundle 2 / Bundle 3 closure` table below — converged across all four perspectives. |

---

## Bundle 2 / Bundle 3 closure — converged across all four perspectives

| Item | Aegis | Vitra | Hermes | Lydia | Convergence |
|---|---|---|---|---|---|
| **P2-04** — onFail harness, 13 fail-fast branches + Copilot #1 (`notes:string`) + Copilot #2 (per-folder `path:` absolute / `..` reject) | PASS | PASS | PASS | PASS (caveat F2) | **PASS** (Lydia caveat = F2 below: Branch 10/11 do not assert MODE prefix) |
| **P3-03** — drift truncation honesty (banner shape + truncation clause) + Copilot #3 (`r.error || r.signal` ⇒ `EXIT_BUDGET = 3`) | PASS | PASS | PASS | PASS / **PARTIAL** | **PASS for banner shape** (lines 379-385 + 430-437); **PARTIAL on Copilot #3** — fix in place at `check-licenses-budget.mjs:62`, untested → F1 (P1) |
| **P3-04** — `renderTable` single-pass `for-of` + `rowOf(e)` helper, byte-identical output | PASS | PASS | PASS | PASS (no direct snapshot) | **PASS at source level**; transitively guarded by production `licenses:check` gate; no direct unit test → F6 (P3) |
| **P3-05** — `--help` / `-h` exit-0 (both scripts) | PASS | PASS | PASS | PASS | **PASS** (build-licenses.test.mjs:440-462; check-licenses-budget.mjs:37-44 unit-tested only at exit-code level) |
| **P3-06** — Hermes 750 ms wall-clock CI guard | PASS at source | PASS at source | PASS at source | PASS at source / **NO TESTS** | **PASS at source** (THRESHOLD_MS = 750, EXIT_BUDGET = 3, 250 ms cushion under ADR-008 §3.3 1 s ceiling); **no tests** for the budget script → F1 (P1) |
| **P3-07 / Copilot #4** — `failIO` / `failSchema` MODE-prefix correctness (`[licenses:check]` not `[licenses:build]`) | PASS | PASS | PASS | PASS at source / **PARTIAL** | **PASS at source** (`dispatchCli` sets `MODE` before `modeCheck` / `modeBuild`); **PARTIAL on test coverage** — only `modeCheck` ENOENT path asserts the prefix; `failIO` and `failSchema` paths don't → F2 (P2) |

---

## Findings — consolidated, deduped, prioritised

`severity.max: P1` (overall — Lydia F1)
`confidence: high` (overall — small, well-bounded diff; one new ~91-LOC budget wrapper + one new ~513-LOC test file + ~141 net additions to the generator; four perspectives walked end-to-end with concrete `git diff` + runtime evidence; structural pre-flight all passes; CI 7/7 SUCCESS on `2379aeb`)

### P0

_None._ `release.gate.fail` not emitted — Aegis confirmed no security-P0; security fail-safe inactive.

### P1 — must-fix (blocks APPROVED per playbook step 11)

#### F1 (code-quality, Lydia Finding 1) — `scripts/check-licenses-budget.mjs` has zero test coverage

- **Perspective × Provenance:** `code-quality` × Lydia (`reviewer-code-quality`, `claude_local`)
- **Location:** `scripts/check-licenses-budget.mjs:62-68` (Copilot inline #3 fix-site) — entire file (`91 LOC`) has no companion `.test.mjs`.
- **Evidence:** Copilot inline #3 closes the spawn-fail / signal-kill `process.exit(null) === 0` false-pass hole (`r.error || r.signal` ⇒ `EXIT_BUDGET = 3`). The fix is in place and **all four reviewers verified it at the source level** (Aegis §3 walks the full `r.error / r.signal / r.status` exit-code matrix; Hermes endorses; Vitra notes the exit-3 multiplexing). However **no automated test exercises the spawn-error or signal-kill branch**. A future refactor that re-introduces the `process.exit(r.status)` early-return (pre-Copilot-#3 shape) would silently regress the gate to exit 0 on spawn-failure — and CI would happily continue. Same gap on the threshold-breach branch (`ms > 750`), the `--help` exit-0 branch, and the unrecognised-arg branch.
- **Remediation:** Author `scripts/check-licenses-budget.test.mjs` (Murat / TEA scope, since this is a test-coverage extension on an already-merged production-quality fix). Cover at minimum:
  1. Spawn-fail path: `TARGET` set to a non-existent `.mjs` path → expect `r.status === 3` + `stderr` matches `/gate process did not exit cleanly/`.
  2. Threshold-breach path: `THRESHOLD_MS` lowered (env override or test-fixture script that sleeps) + slow target → expect `r.status === 3` + `stderr` matches `/wall-clock/`.
  3. `--help` / `-h` path: `r.status === 0` + `r.stdout` (not stderr).
  4. Unrecognised-arg path: `r.status === 3` + `stderr` matches `/usage:/`.
  5. Happy path: pre-built fixture target, fast → `r.status === 0`.
- **Sage's read on resolution path:** This is **architecturally sound** (Murat's coverage-extension territory, not Amelia's DS-implementation territory) and **not a regression risk on the merge of PR #36** — the production fix is in place, the gap is "future-proofing against a refactor that would re-open a hole that hasn't been re-opened". I have filed the follow-up child issue [DEE-141](/DEE/issues/DEE-141) so that whatever the Board chooses (block PR #36 vs. merge-now-fix-next), the gap is owned and won't fall through. Per playbook step 11 the **verdict** is still **CHANGES** on the strict P0/P1-empty rule, but Sage explicitly recommends Amelia/John/CTO consider the merge-with-follow-up path.

### P2 — should-fix (non-blocking on their own; bundle into a single hygiene commit on round 2 if the Board chooses CHANGES, else fold into [DEE-141](/DEE/issues/DEE-141) on the merge-now path)

#### F2 (code-quality, Lydia Finding 2) — `failIO` MODE-prefix not asserted on the actual `failIO` path

- **Perspective × Provenance:** `code-quality` × Lydia
- **Location:** `scripts/build-licenses.test.mjs:255-275` (Branch 10 — `loadEntries` I/O), and same shape on Branch 11 (write-error).
- **Evidence:** The Branch 10 test asserts the `FAIL — I/O error on main/LICENSE.yml` substring but **does not assert** the `[licenses:check]` MODE prefix. The dedicated prefix test at `build-licenses.test.mjs:479-504` exercises only the `modeCheck` ENOENT path (which calls `_onFail` directly, not via `failIO`). A regression that hardcoded `[licenses:build]` in `failIO` would slip past the suite — exactly the regression Copilot inline #4 was filed against.
- **Remediation:** Add `assert.match(r.stderr, /^\[licenses:check\]/m)` to Branch 10 and Branch 11. Closes the `failIO` half of P3-07 explicitly. (Adding the same to one schema-fail test, e.g. Branch 4, also closes the `failSchema` half — Lydia's "tests.coverage.gaps[2]".)

#### F3 (code-quality, Lydia Finding 3) — `validEntry` accepts unused `folder` parameter

- **Perspective × Provenance:** `code-quality` × Lydia
- **Location:** `scripts/build-licenses.test.mjs:297-298`
- **Evidence:** ``const validEntry = (folder) => `- path: stub\n  …` `` accepts a `folder` parameter that is never referenced; the same fixture string is used for `main/util`, `main/font`, `tests/assets`. Misleading — reader assumes per-folder variation.
- **Remediation:** Drop the parameter (`const validEntry = "...";`) or rename to `STUB_ENTRY`. Three call-sites simplify.

#### F4 (code-quality, Lydia Finding 4) — Tmp-repo fixture duplication (~30 lines × 5 sites)

- **Perspective × Provenance:** `code-quality` × Lydia
- **Location:** `scripts/build-licenses.test.mjs:283-318, 322-346, 349-386, 390-437, 479-504`
- **Evidence:** ~30 lines of identical tmp `REPO_ROOT` setup (mkdir × 4 + writeFile × 4 + copyFileSync of `build-licenses.mjs`) repeated across 5 tests. Each future tmp-repo test pays the same boilerplate cost.
- **Remediation:** Extract `setupTmpRepo({ licensesMd?, perFolderUtil?, passthrough? })` returning `{ tmp, scriptPath }`. Tests pass overrides; cleanup remains per-test via `rmSync(tmp, …)`. Net ~80 LOC saved.

### P3 — nice-to-fix (informational; bundle into the same hygiene commit / follow-up issue as the P2 set)

#### F5 (code-quality, Lydia Finding 5) — Vacuous `assert.ok(true)` in `isMain` guard test

- **Perspective × Provenance:** `code-quality` × Lydia
- **Location:** `scripts/build-licenses.test.mjs:510-513`
- **Evidence:** `assert.ok(true)` is vacuous — the actual property under test (`import` does not trigger CLI dispatch / FS mutation / exit) is verified only **implicitly** by the fact that the test file's top-level `import` (lines 30-39) completed without `process.exit`.
- **Remediation:** Strengthen — spawn `node -e "import('./build-licenses.mjs').then(m => process.stdout.write(JSON.stringify(Object.keys(m))))"` and assert `r.status === 0`, no `LICENSES.md` was created in CWD, exported surface includes `setOnFail`. Or at minimum replace the assertion with `assert.ok(typeof setOnFail === "function")`.

#### F6 (code-quality, Lydia Finding 6) — `renderTable` no direct snapshot test

- **Perspective × Provenance:** `code-quality` × Lydia
- **Location:** `scripts/build-licenses.mjs:274-291` (`renderTable`)
- **Evidence:** Single-pass `for-of` + `rowOf(e)` byte-identity is asserted only **transitively** — via the production `licenses:check` gate against the committed `LICENSES.md`. No direct `renderTable(fixture)` snapshot test in `build-licenses.test.mjs`. Mitigated by the gate, but a refactor that breaks ordering or row formatting would fail in CI on the production fixture, not on a tight unit test.
- **Remediation:** Add a small snapshot test: `test("renderTable: byte-identical to fixture", () => { … })` with a 3-entry input array (1 first-party + 2 third-party with reverse-alpha unit names) and an inline expected-string asserting (a) header, (b) first-party row precedes third-party block, (c) third-party rows ordered by ASCII byte order, (d) trailing newline.

#### F7 (architecture, Vitra Finding 1) — Exit-code `3` multiplexed across three distinct paths in the budget gate

- **Perspective × Provenance:** `architecture` × Vitra (`reviewer-architecture`, `claude_local`)
- **Location:** `scripts/check-licenses-budget.mjs:14-19, 50, 74, 85`
- **Evidence:** Exit-code `3` is multiplexed across (a) gate-local usage error (argv-guard → `EXIT_BUDGET`), (b) threshold breach (`ms > THRESHOLD_MS` → `EXIT_BUDGET`), (c) propagated inner-script usage (`build-licenses.mjs --bogus` → `process.exit(r.status)` with `r.status === 3` from inner `EXIT_USAGE = 3`). Legend at lines 14-19 names only (b) explicitly; (a) is implicit; (c) propagates through the catch-all on line 74 with no legend acknowledgement. Post-mortem reading "exit 3" cannot disambiguate without inspecting stderr.
- **Remediation:** Lower-cost option (ii): extend the legend to enumerate the three paths and add a one-line comment at the propagation site (line 74) noting `inner exit-3 propagated as [licenses:check:budget] exit-3 means inner usage error, not gate threshold breach — disambiguate by stderr 'FAIL — wall-clock' vs 'usage:'`. Higher-cost option (i): split into `EXIT_USAGE_LOCAL = 5 ≠ EXIT_BUDGET = 3` so threshold breach has a dedicated code. Sage recommends (ii); fold into the same [DEE-141](/DEE/issues/DEE-141) / Round-2 patch as F2/F3/F4.

#### F8 (architecture, Vitra Finding 2) — Drift-diff output legend missing in `stderr`

- **Perspective × Provenance:** `architecture` × Vitra
- **Location:** `scripts/build-licenses.mjs:24-27, 368-373`
- **Evidence:** Drift-diff uses **inverted** unified-diff polarity: `-${expected}` = regenerated/byte-correct, `+${observed}` = committed/wrong. Standard `diff(1)` semantics are the opposite. The file-header comment block lines 24-27 documents this, and the emit-site comment lines 368-370 cross-references the header — good source-side discipline. **However**, the runtime `stderr` output carries no inline legend; a contributor reading the CI log (without opening the source) sees a "diff" they will instinctively read with standard `-`/`+` semantics, then act on the wrong direction (paste `+` lines into `LICENSES.md`, perpetuating the drift).
- **Remediation:** Add a 1-line legend immediately above the diff body in `emitDriftDiff` output: e.g. `('-' lines = expected (run npm run licenses:build); '+' lines = committed in LICENSES.md)`. Source convention unchanged; runtime self-explaining.

#### F9 (architecture, Vitra Finding 3) — Build-tooling test-harness SOP missing for downstream stories

- **Perspective × Provenance:** `architecture` × Vitra
- **Location:** `scripts/build-licenses.test.mjs` (whole file; cross-story precedent)
- **Evidence:** Story 2.3 establishes the build-tooling test-harness precedent (per AC-02.3.3). Sage's brief asked for the "one `describe` per AC table-row, `setOnFail` install/restore in `before`/`after`" shape; actual shape is flat `test()` calls with per-comment branch numbering + per-call `captureOnFail` helper. **For 21 cases this is fine**; for the cross-script symmetry follow-up [DEE-126](/DEE/issues/DEE-126) and the broader build-tooling test surface this implies, the precedent **will drift** unless codified. (Vitra also recommends an ADR-010, "Build-tooling test-harness pattern", or an ADR-008 amendment, as the durable home.)
- **Remediation:** Either add a `_bmad-output/sops/build-tooling-test-harness.md` SOP (lighter) or amend ADR-008 / `architecture.md` §3.3 (heavier) before the next build-tooling story files a test. Capture: (a) `node:test` + `node --test` invocation; (b) `setOnFail`/`setMode` reset discipline (per-call helper OR `describe` + `before`/`after`); (c) `isMain()` guard requirement; (d) zero-dep + Node-stdlib-only constraint; (e) AC-table-row → test-name mapping convention. Sage suggests the SOP route — lower cost, same effect, doesn't bind a future story to the heavier ADR amendment.

#### F10 (performance, Hermes Finding 1) — `THRESHOLD_MS` named but not exported

- **Perspective × Provenance:** `performance` × Hermes (`reviewer-performance`, `claude_local`)
- **Location:** `scripts/check-licenses-budget.mjs:33`
- **Evidence:** `const THRESHOLD_MS = 750;` is named + matches ADR-008 §3.3 (1 s − 250 ms cushion) but **not exported**. Sage's brief specifically asked for "named, exported". Low impact (CLI-only today), zero perf cost. Hermes endorses TEA NFR-01 + AC-02.3.4 sign-off.
- **Remediation:** Prepend `export ` so a future test-harness (notably the [DEE-141](/DEE/issues/DEE-141) test file proposed under F1) can sanity-check the constant and ADR cushion intent in one line.

### Defense-in-depth notes (Aegis — explicitly NOT findings, recorded for the Board)

Aegis flagged two hardening notes that are **structurally non-exploitable** and explicitly not raised as findings; recorded here for the Board's awareness.

1. `scripts/build-licenses.mjs:240-257` (per-folder `path:` validation) — `entry.path` validation rejects forward-slash absolute and `..` segments via `split("/")`, but NTFS ADS (`secret.yml:hidden`) and backslash-style `..\evil` would pass. **Not exploitable today** because `entry.path` is a label-only field that never reaches a `path.*` / `readFileSync` call (`loadEntries` only reads the four `LICENSE_YML_FILES` constants). Recommend a one-line inline comment near the validation: `label-only — fs invariant assumed; tighten if entry.path ever reaches a path.* call.`
2. `scripts/build-licenses.mjs:97-101` (`setOnFail` public export) — `setOnFail` is a public export of a long-lived module API. A future supply-chain importer that calls `setOnFail(swallowFn)` and never resets could neutralise the gate **within that importer's process**. Not exploitable today (the gate runs as a fresh Node process via `npm run licenses:check`, not as a library), but worth a one-line inline comment that `setOnFail` is test-only and that production must call it nowhere.

These are documentation-grade hardening notes; Sage suggests folding both single-line comments into the same hygiene commit as F2/F3/F4 if the Board chooses CHANGES, else into [DEE-141](/DEE/issues/DEE-141).

---

## Recommended next steps for Amelia

1. **The Board's choice on PR #36 merge** — Sage's verdict is **CHANGES** per the strict playbook rule. The substance of the single P1 (F1) is a follow-up test-coverage extension, not a regression in the merged code. The Board (Amelia / John / CTO) has two paths:
   - **Path A (strict CHANGES):** Hold PR #36, take a Round-2 cycle on DEE-124. Bundle F1 + F2 + F3 + F4 + F5 + F6 + F7 + F8 + F10 (and the two Aegis defense-in-depth comments) into a single hygiene commit on `DEE-124-story-2-3-ds`. F9 (Vitra SOP) goes into a separate planning-doc commit on the same branch. Re-request board review (Round-2). [DEE-141](/DEE/issues/DEE-141) becomes redundant and gets closed.
   - **Path B (merge-with-mandatory-follow-up):** Treat the P1 as a known follow-up tracked on [DEE-141](/DEE/issues/DEE-141), merge PR #36 now (Copilot re-review + 7/7 CI + CTO/TEA sign-off all green), and execute [DEE-141](/DEE/issues/DEE-141) (Murat scope, primary; F2 + F10 + the two Aegis hardening comments fold in naturally; F3 + F4 + F5 + F6 + F8 fold into a separate small Amelia DS hygiene PR; F9 stands alone). **Sage's substantive recommendation** is Path B — the production fix is sound, the gap is "future-proof a hole that's already been closed", CI is fully green, the cost of holding a fully-CI-passing PR for a follow-up that doesn't touch production code is higher than the marginal regression risk it covers. **The decision is the Board's, not Sage's.**
2. **Set the `self-review.findings.round-1` block on the story file** — `_bmad-output/implementation-artifacts/2-3-wire-licenses-check-into-npm-test-ci-drift-gate.md` — per the standard fold-in protocol, regardless of which path is chosen. Reference this report path + [DEE-141](/DEE/issues/DEE-141).
3. **Cross-reference Story 2.4 / Phase-3 stories** — Vitra's F9 (build-tooling test-harness SOP) becomes load-bearing the moment [DEE-126](/DEE/issues/DEE-126) (`scripts/check-test-fixtures.mjs --help` exit-0) starts. Authoring the SOP before DEE-126 picks up keeps the precedent intact at zero retroactive cost.
4. **Stuck-story counter** — this is Round 1; rule 3-rounds-without-APPROVED → CTO escalation does not yet trigger.

---

## Provenance & determinism

- `studio.reviewBoard.disputeThreshold = 0.4` (Default).
- `studio.reviewBoard.userInputWindow = 15m` (Default; window expired with no user input received).
- `studio.reviewBoard.securityP0Blocks = true` (Default; not invoked — security `findings: []`).
- All four perspective minions discovered via Paperclip API metadata at dispatch time (`reportsTo: review-leader` + `perspective: <non-empty>` + `metadata.active: true`). Iris (`perspective: accessibility`, `conditional: true`, `runWhen: [project.metadata.hasUI == true, event.story.touchesUI == true]`) correctly conditional-skipped on `event.story.touchesUI = false`.
- All four reviews submitted in the same heartbeat window; Sage aggregated on wake-from-`issue_blockers_resolved` (the parent DEE-131 was set to `blocked` on the four child review issues by the dispatch hand-off contract).
