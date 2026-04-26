# Story 2.3: Wire `licenses:check` into `npm test` (CI drift gate) — folds Bundle 2 (P2-04 parser/drift harness + P3-06 wall-clock CI guard) and Bundle 3 polish (P3-03..P3-05 + Copilot inline #3 + #4 / P3-07) on top of the FR-02 §A4 baseline

Status: ready-for-dev

> Authored by John (PM, BMad) on 2026-04-26 via `bmad-create-story` ([DEE-122](/DEE/issues/DEE-122) — child of [DEE-98](/DEE/issues/DEE-98) Bundle 2; follow-up to [DEE-92](/DEE/issues/DEE-92) Story 2.2 DS / [PR #23](https://github.com/Dexus-Forks/deepnest-next/pull/23) merged commit `74a795f`) for **MVP-1 / Stream A continuation (A4)**. Sprint plan reference: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row A4. Epic anchor: `_bmad-output/planning-artifacts/epics.md` §"Story 2.3" (Epic 2 / FR-02). Architecture anchor: `_bmad-output/planning-artifacts/architecture.md` §5 ADR-008 step 3 (CI integration). **This story bakes in Sage Story 2.2 Round-1 follow-ups**: **P2-04** (Lydia parser/drift test harness, extended with PR #23 Copilot inline #1 + #2 schema branches) + **P3-06** (Hermes wall-clock CI guard, 750 ms threshold) — Bundle 2 per [DEE-98](/DEE/issues/DEE-98) DoD; mandatory ACs / Tasks below, not optional Round-2 nudges. **Bundle 3 fold-in stance: FOLD** — P3-03 (drift-diff truncation honesty) + P3-04 (`renderTable` allocation) + P3-05 (`--help` exit-0) + Copilot inline #3 (drift-diff `+`/`-` markers — overlaps P3-03) + Copilot inline #4 (`failIO()` prefix / P3-07) folded as polish ACs in this story (rationale: §"Bundle 3 fold-in rationale" below). Predecessors: Story 2.1 (DEE-84 / [PR #19](https://github.com/Dexus-Forks/deepnest-next/pull/19) merged); Story 2.2 (DEE-92 / [PR #23](https://github.com/Dexus-Forks/deepnest-next/pull/23) merged); Bundle 1 + Bundle 1.1 ADR-008 amendment ([PR #31](https://github.com/Dexus-Forks/deepnest-next/pull/31), commits `84daa3f` + `ac28fc6`, Round-2 + Round-2.5 APPROVED `severity.max=P3` per [DEE-116](/DEE/issues/DEE-116) Sage board verdict).

---

## Story

As a **Maintainer**,
I want **`npm test` to run `npm run licenses:check` first (regenerate `LICENSES.md` to memory, byte-for-byte diff against the committed file, exit non-zero on drift) and refuse to proceed to Playwright when drift is present, with the parser/drift code paths covered by an automated smoke harness AND a CI wall-clock guard that fails when `licenses:check` exceeds 750 ms on the canonical CI cell**,
so that **a contributor who edits a `LICENSE.yml` and forgets to re-run `npm run licenses:build` sees a red CI on the very next commit (not a delayed audit gap), the parser fail-fast contract is regression-protected, and the FR-02 gate's CI-budget posture is explicit (not implicit) once it lands on the hot path**.

**Sprint role.** This story is **A4 — Stream A's fourth item** (after A1 done / A2 done / A3 done). It consumes A3's `scripts/build-licenses.mjs` + `licenses:check` script entry and wires them into `npm test`. **Stream A is the sprint critical path; A5 (Story 2.4 docs) follows.**

**FR/AC coverage:** FR-02 (PRD §FR-02 expanded scope, ADR-008-bound) — AC-02.1..AC-02.4 closure (`licenses:check` is the CI consumer of the canonical baseline established in Stories 2.1 + 2.2). Cross-cuts: Sage Story 2.2 Round-1 P2-04 (Lydia code-quality F1, parser/drift test harness — mandatory) + P3-06 (Hermes performance F1, 750 ms wall-clock guard — mandatory) + P3-03 (Lydia code-quality F2, drift-diff truncation honesty — folded polish) + P3-04 (Lydia code-quality F3, `renderTable` allocation — folded polish) + P3-05 (Lydia code-quality F4, `--help` exit-0 — folded polish) + PR #23 Copilot inline #1 (`notes` must be string — folded into P2-04 schema branches) + Copilot inline #3 (drift-diff `+`/`-` markers — folded into P3-03) + Copilot inline #4 (`failIO()` prefix per mode → P3-07 — folded polish).
**ADR binding:** **ADR-008** §5 step 3 (CI integration via `npm test`); §3.3 (test-latency rule — build-time gates must be fast, sub-second deterministic file walks). §3.3's 1 s ceiling is the upstream invariant Hermes's 750 ms threshold sits 250 ms below. Cross-references: **ADR-008 step 2** (the script the gate consumes — unchanged in this story except for the polish ACs); ADR-007 (strict TS only on `main/**/*.ts` — generator/harness are `.mjs` outside `main/`, ADR-007 surface unchanged).
**NFR coupling measured:** **NFR-01** (no perf regression in `npm test` — `licenses:check` adds ≈ 63 ms per the Hermes Round-1 benchmark; expected to land well within the ±20 % rolling-mean window over `nfr01-baseline.json` `rolling_mean_ms = 16746.6`). **NFR-08** (docs-freshness — `LICENSES.md` is the canonical surface; this story's gate keeps it in sync with metadata going forward).

---

## Acceptance Criteria

1. **AC-02.3.1 — `npm test` runs `licenses:check` first; refuses to proceed on drift; behaviour is deterministic.** Concretely:
   - `package.json` `scripts.test` is amended so that `npm run licenses:check` runs before `playwright test`. **Implementation choice (Dev picks one; documents in PR description):**
     - **(a)** Inline-and: `"test": "npm run licenses:check && npm run test:fixtures:check && playwright test"` (matches Story 3.1's `test:fixtures:check` ordering precedent; left-to-right fail-fast is the Bash semantic the existing chain already relies on).
     - **(b)** `pretest` hook: `"pretest": "npm run licenses:check && npm run test:fixtures:check"` + leave `scripts.test` as `playwright test`. npm runs `pretest` automatically before `test`. Cleaner separation; same fail-fast effect (npm aborts on non-zero pretest exit).
     - **Recommendation: (a) inline-and** for visibility (the chain reads top-to-bottom in the script; reviewer cognitive cost is lowest; matches the **Story 3.1 / DEE-69 wire-in pattern** that already merged via PR #15 and the **Story 2.2 / Sprint plan §3 shared-edit-point #2** ordered-merge-point intent). The existing `test:fixtures:check` is already wired this way per `package.json` post-PR #15 — Dev should preserve that ordering; the new addition is `licenses:check` to its left.
   - On a clean tree, `npm test` exits 0 (Playwright runs after both checks pass). Total `npm test` wall-clock stays within NFR-01's ±20 % envelope of `nfr01-baseline.json` `rolling_mean_ms` (`16 746.6 ms ± 20 % = [13 397, 20 096] ms`) on the canonical CI cell (Linux/Ubuntu-22.04 × Node 22.x × Playwright `headless: false` via `xvfb-run`).
   - On a tree with `LICENSE.yml` drift: `npm run licenses:check` exits **1** (per `EXIT_DRIFT` at `scripts/build-licenses.mjs:61`); Bash `&&` short-circuits OR npm fails the `pretest` hook; **Playwright is NOT spawned**. The user's terminal shows the drift diagnostic (the existing `emitDriftDiff` output enhanced per AC-02.3.7 below); pre-commit hook (per `_bmad-output/project-context.md` §11) flips red, forcing `npm run licenses:build && git add LICENSES.md` before commit succeeds.

2. **AC-02.3.2 — End-to-end pass / fail demonstration on the PR.** The PR must include explicit evidence that both code paths exercise:
   - **Pass path:** PR opens against an unmodified `LICENSES.md`; CI Playwright job is green; `licenses:check` exits 0 visibly in the run logs (sample log line: `[licenses:check] OK — LICENSES.md matches regenerated output (0 drift, < 750 ms wall)`. The current implementation does NOT print an OK line — see AC-02.3.7's small enhancement to emit one for log-traceability; alternative: rely on `process.exit(EXIT_OK)` silence and the surrounding `npm` log).
   - **Fail path:** Local-only demonstration in the Dev Agent Record. Mutate `LICENSES.md` (e.g. swap two adjacent rows or delete the trailing newline), run `npm test`, capture the unified-diff-style stderr + the non-zero exit, restore the file. Record the output verbatim under "Debug Log References".

3. **AC-02.3.3 — P2-04 verbatim (Lydia code-quality F1) — Parser / drift test harness with `onFail` injection.** *Pulled verbatim from [DEE-98](/DEE/issues/DEE-98) Bundle 2 + Sage Round-1 report `projects/deepnest-next/reviews/2-2-implement-scripts-build-licenses-mjs-generator-script-round-1.md` §P2-04 (lines 111–116):*

   > Parser/drift test harness. Pull `failSchema` / `failIO` behind injected `onFail(code, msg)` callback (default = current `process.stderr.write` + `process.exit`). Add smoke harness covering each fail-fast branch + `--check` drift path (`node:test` or thin Playwright case).

   **Per-branch coverage required.** The harness MUST exercise — directly, with deterministic in-memory inputs — each of the following paths and assert they emit the documented exit code via the injected `onFail`:

   | # | Branch | Source line (post-Story-2.2) | Documented exit code |
   |---|---|---|---|
   | 1 | `parseYaml` — value-line outside any entry | `scripts/build-licenses.mjs:113` | `EXIT_SCHEMA = 2` |
   | 2 | `parseYaml` — expected continuation / new-entry | `scripts/build-licenses.mjs:118` | `EXIT_SCHEMA = 2` |
   | 3 | `parseValue` — unterminated double-quoted string | `scripts/build-licenses.mjs:135` | `EXIT_SCHEMA = 2` |
   | 4 | `validateEntry` — missing required field | `scripts/build-licenses.mjs:172` | `EXIT_SCHEMA = 2` |
   | 5 | `validateEntry` — required field non-empty-string violation | `scripts/build-licenses.mjs:174-180` | `EXIT_SCHEMA = 2` |
   | 6 | `validateEntry` — unknown field | `scripts/build-licenses.mjs:184` | `EXIT_SCHEMA = 2` |
   | 7 | `validateEntry` — `first_party` non-boolean | `scripts/build-licenses.mjs:187-189` | `EXIT_SCHEMA = 2` |
   | 8 | `validateEntry` — **PR #23 Copilot inline #1** — `notes` not a string (`typeof entry.notes !== "string"` schema fail) | NEW branch added by this story | `EXIT_SCHEMA = 2` |
   | 9 | `validateEntry` / `deriveUnit` — **PR #23 Copilot inline #2** — per-folder `path:` is absolute (leading `/`) OR contains `..` segment | NEW branch added by this story | `EXIT_SCHEMA = 2` |
   | 10 | `loadEntries` — I/O error reading a `LICENSE.yml` | `scripts/build-licenses.mjs:150` | `EXIT_IO = 4` |
   | 11 | `modeBuild` — I/O error writing `LICENSES.md` | `scripts/build-licenses.mjs:228` | `EXIT_IO = 4` |
   | 12 | `modeCheck` — `LICENSES.md` missing (`ENOENT`) | `scripts/build-licenses.mjs:243-248` | `EXIT_DRIFT = 1` |
   | 13 | `modeCheck` — `LICENSES.md` content drift (regenerated ≠ committed) | `scripts/build-licenses.mjs:255-256` | `EXIT_DRIFT = 1` |

   **Branches 8 + 9 are NEW behaviour added by this story** (not regressions to cover — the script does not have these checks today). The harness covers them in lockstep with the schema-fail additions in Task 4 / Task 5. ADR-008 schema reference at `_bmad-output/planning-artifacts/architecture.md:244` already codifies the absolute-path / `..` rejection rule for per-folder mode (closed as part of Bundle 1 / Copilot inline #2); this story makes the parser enforce it. Branch 8 (`notes` string check) is closed as part of Bundle 2 / Copilot inline #1 (raised on `scripts/build-licenses.mjs:189` — `validateEntry` does not type-check `notes`).

   **`onFail` injection contract.** The Dev refactors `failSchema` and `failIO` so they delegate to a single injected callback `onFail(code, msg)`:
   - **Default** (production): `onFail = (code, msg) => { process.stderr.write(msg + "\n"); process.exit(code); }` — preserves the current `process.stderr.write` + `process.exit` shape exactly. **No production behaviour change.**
   - **Test mode**: harness injects an `onFail` that throws `new TestExit(code, msg)` (or pushes to a captured array); the harness asserts on the captured `code` + a substring of `msg`.
   - **Wiring shape**: pass `onFail` as a parameter (preferred — cleanest seam) OR expose it as a module-level mutable export (lightweight; mirrors the existing `let` patterns elsewhere). Dev picks; documents the choice in PR description.
   - **Module shape constraint.** `scripts/build-licenses.mjs` becomes a module-with-CLI: top-of-file dispatcher (the existing `argv` block at lines 286–298) only runs when the file is invoked as the entry point (`if (import.meta.url === pathToFileURL(process.argv[1]).href)` guard, OR equivalent). Imports do NOT trigger CLI behaviour. This is a precondition for the harness to import `parseYaml`, `validateEntry`, `loadEntries`, `modeCheck`, etc., without spawning the script. Dev picks the entry-point guard idiom; either Node's official `import.meta.url` ↔ `process.argv[1]` comparison OR a small `isMain()` helper.

   **Harness placement.** Two acceptable shapes (Dev picks; documents in PR description):
   - **(α)** `scripts/build-licenses.test.mjs` driven by Node's built-in `node:test` runner — invoked via a new `package.json` `scripts.test:licenses` entry; wired into `scripts.test` as a sibling check (e.g. `"test": "npm run licenses:check && npm run test:licenses && npm run test:fixtures:check && playwright test"`). Mirrors `scripts/check-test-fixtures.mjs` precedent (Node-stable + zero-dep + `.mjs`).
   - **(β)** `tests/build-licenses.spec.ts` — a thin Playwright case using `node:assert` (or Playwright's `expect`); runs as part of the existing `playwright test` invocation (no new package.json script). Mirrors the existing `tests/index.spec.ts` precedent.
   - **Recommendation: (α) `node:test`** — harness is a unit-style test of a Node script; spawning Playwright (with Electron + xvfb) for it is over-kill and adds ~5 s to the harness run-time. `node:test` adds ≈ 0 wall-clock cost (Node-builtin; no Chromium spawn). The 13 cases run in deterministic linear order in well under 100 ms wall-clock. The new `npm run test:licenses` slot keeps the contract symmetric with `npm run test:fixtures:check` (one script per FR-domain).

4. **AC-02.3.4 — P3-06 verbatim (Hermes performance F1) — Wall-clock CI guard at 750 ms.** *Pulled verbatim from [DEE-98](/DEE/issues/DEE-98) Bundle 2 + Sage Round-1 report §P3-06 (lines 150–155):*

   > Wall-clock CI guard on `licenses:check`. Hand off to Murat (TEA); 750 ms threshold proposed (12× headroom over current ~63 ms).

   **Concretely.** The CI workflow MUST fail when `node scripts/build-licenses.mjs --check` exceeds **750 ms wall** on the canonical CI cell (Linux/Ubuntu-22.04 × Node 22.x). **Implementation choice (Dev picks one; documents in PR description):**
   - **(a) Hermes-recommended path** — small `time` wrapper inside the test step (no script modification). Replace `npm run licenses:check` in `scripts.test` with `node -e "const t=process.hrtime.bigint(); require('child_process').execSync('npm run licenses:check', {stdio: 'inherit'}); const ms = Number(process.hrtime.bigint() - t) / 1e6; if (ms > 750) { process.stderr.write('[licenses:check] FAIL — wall-clock ' + ms.toFixed(0) + ' ms exceeds 750 ms threshold\\n'); process.exit(1); }"` — or a tiny `scripts/check-licenses-budget.mjs` wrapper that does the same; up to Dev's preference. **Recommendation: small wrapper script** for readability (`scripts.test` stays a single line of script names; the budget logic lives in its own file with comments).
   - **(b) Inline runtime regression test** — extend `scripts/build-licenses.mjs --check` itself to capture its own wall-clock and `process.exit(EXIT_DRIFT)` if > 750 ms. Lower abstraction count but couples gate-correctness with budget-correctness — **not** recommended (a slow `licenses:check` is a separate failure mode from drift; conflating exit codes hurts post-mortems).
   - **(c) Murat's call** — TEA owns gate-vs-script separation per project convention; Dev should ping Murat in the DS issue thread before committing if leaning to (b). Per Hermes's Round-1 finding rationale: *"hand-off to Murat (TEA) on Story 2.3"*.

   **Threshold rationale (verbatim from Hermes Round-1).** ADR-008 §3.3 budget for FR-02 + FR-03 CI gates is *"sub-second deterministic file walks"* (1 s ceiling). Local Round-1 benchmark on Story 2.2's `scripts/build-licenses.mjs` was **70 / 63 / 61 / 63 / 59 ms wall** (mean ≈ 63 ms; matches Sage's pre-flight ~64 ms). 750 ms = 250 ms cushion under §3.3's ceiling, ~12× margin to absorb future row growth + CI variance + Node-process startup. **Threshold is 750 ms wall on the canonical CI cell**; Dev MUST capture the chosen threshold + the rationale in the Dev Agent Record per Hermes's stated handoff contract.

   **Hand-off instruction to Murat (TEA).** Dev pings [@Murat](agent://cb45a95b-ee30-49d2-ae12-8a15cdfb3886) (TEA) in the DS issue thread once the wrapper is implemented. Murat's role is to (1) confirm the 750 ms threshold matches the canonical CI cell's expected variance, (2) record the agreed value in his trace pass on this story, and (3) optionally tune (within ADR-008 §3.3's 1 s ceiling) if Round-1 benchmarks land differently on the CI cell vs the developer laptop. **The 750 ms value is locked into this AC unless Murat explicitly amends it via comment on the DS issue or this spec file before merge.**

5. **AC-02.3.5 — `licenses:check` log line on success (small UX nudge feeding both AC-02.3.2 and the AC-02.3.4 budget wrapper).** Today `modeCheck` exits silently on success (`scripts/build-licenses.mjs:253` — `process.exit(EXIT_OK)`). For CI log-traceability AND to give the Hermes wrapper an accurate end-marker, the success path emits a one-line `process.stdout.write` of the form: `[licenses:check] OK — LICENSES.md matches regenerated output (0 drift, ${ms} ms wall)\n`. The `${ms}` value is the Dev's choice — captured inside the script via `process.hrtime.bigint()` around the `buildOutput()` + `readFileSync` + comparison. **No new exit code; pure stdout.** Mirrors `scripts/check-test-fixtures.mjs` success-line precedent (per the Story 3.1 wire-in PR #15 / DEE-69 / DEE-70).

6. **AC-02.3.6 — Folded `failIO()` mode-prefix polish (Bundle 3 / Copilot inline #4 / new finding ID P3-07).** *Pulled from [DEE-98](/DEE/issues/DEE-98) Bundle 3 wording + Amelia's `c3045e3d` comment on DEE-98:*

   > `failIO()` always prefixes `[licenses:build]` even from `--check` mode. Parameterize prefix or infer from `argv`.

   **Concretely.** `failIO` (`scripts/build-licenses.mjs:78-84`) emits `[licenses:build] FAIL — I/O error on …` regardless of dispatch mode. From `npm run licenses:check`, the prefix should be `[licenses:check]` — `failIO` either accepts a `prefix` parameter or infers it from `argv` / a module-level `MODE` constant set by the dispatcher. **Recommendation: inferred `MODE` constant** set once in the dispatcher (the existing `argv` block at lines 286–298) and read by `failIO` + `failSchema` — keeps call sites unchanged and the diagnostic accurate for both modes.

7. **AC-02.3.7 — Folded `emitDriftDiff` truncation honesty + `+`/`-` markers (Bundle 3 P3-03 + Copilot inline #3).** *Pulled verbatim from Sage Round-1 report §P3-03 (lines 132–136) and Amelia's `c3045e3d` comment on Copilot #3:*

   > **P3-03 (Lydia F2)** — Drift-diff truncation is silent past 20 lines. When `maxLen > 20` differing lines exist, the loop silently `break`s after capturing 20 entries. Format `First N of M differing line(s):` with `(…M-N more truncated)` hint when capped.
   >
   > **Copilot inline #3** — `emitDriftDiff()` claims "unified-diff-style stderr" in PR body but emits expected/observed listing without `+`/`-` markers/context. Same code path; fold both fixes.

   **Concretely.** Update `scripts/build-licenses.mjs:259-284` (`emitDriftDiff`) so:
   - **(7a) — Truncation honesty.** Count remaining drift after the 20-line capture cap. Format the banner as `First ${diffs.length} of ${totalDrift} differing line(s):` and append `(…${totalDrift - diffs.length} more truncated)` when truncated. Do NOT emit the `(...)` clause when `totalDrift === diffs.length` (un-truncated case).
   - **(7b) — `+`/`-` markers.** Replace each `expected: …` / `observed: …` block with unified-diff conventional markers: `-${exp}` (the expected — the byte-correct regenerated content) and `+${obs}` (the observed — what is currently committed). One-line context (`@@ L${line} @@`) above each pair. Brings the stderr in line with the PR-body claim of "unified-diff-style".
   - **Compatibility.** `emitDriftDiff` is invoked only from `modeCheck`'s drift branch; no caller depends on the exact output shape (the harness asserts on the **fact** of drift via exit code, not on the literal body).

8. **AC-02.3.8 — Folded `renderTable` allocation polish (Bundle 3 P3-04).** *Pulled verbatim from Sage Round-1 report §P3-04 (lines 138–142):*

   > `renderTable` allocation pattern (spread+map+join vs single-pass accumulation). `[...firstParty, ...thirdParty].map(...).join("\n")` allocates a fresh array, maps each entry to a row string, then joins. For 28 rows this is fine; the same idiom appears in `scripts/check-test-fixtures.mjs:147-180`. Idiomatic-consistency nudge, not a defect. `for-of` accumulation (`let body = HEADER; for (const e of firstParty) body += rowOf(e) + "\n"; …`) would save one allocation. Skip if the team prefers the declarative shape.

   **Concretely.** Update `scripts/build-licenses.mjs:202-216` (`renderTable`) to use single-pass `for-of` accumulation. Extract a small `rowOf(e)` helper for readability. **Optional:** Dev MAY decline this AC by recording an explicit waiver under "Bundle 3 Polish — Waiver" in the Dev Agent Record (rationale: the declarative shape is more readable for 28 rows; allocation cost is unmeasurable). If declined, AC-02.3.8 is the ONE Bundle 3 AC eligible for waiver — all others (P3-03 + P3-05 + Copilot #3 + Copilot #4) MUST be implemented because they have user-visible behavioural impact (truncation honesty / `--help` exit code / mode-correct prefix). P3-04 is the only pure idiomatic-consistency nudge in the bundle.

9. **AC-02.3.9 — Folded `--help` / `-h` exit-0 polish (Bundle 3 P3-05).** *Pulled verbatim from Sage Round-1 report §P3-05 (lines 144–148):*

   > `--help` / `-h` exits with `EXIT_USAGE = 3`, not POSIX-conventional `0`. Any arg other than `--check` falls through to the usage block and exits `3`. Add an explicit `--help` / `-h` branch before the catch-all that exits `EXIT_OK = 0`.

   **Concretely.** Update `scripts/build-licenses.mjs:286-298` (CLI dispatcher) to recognise `--help` and `-h` explicitly and exit `EXIT_OK = 0` after printing the usage text. Other unrecognised args continue to fall through to the catch-all and exit `EXIT_USAGE = 3`. **Mirror constraint:** the Sage Round-1 report explicitly notes this is *"a project-wide nudge, not a per-script defect; mirrors `scripts/check-test-fixtures.mjs:283-292`"*. **Story 2.3 fixes ONLY `scripts/build-licenses.mjs`** in this PR. The companion fix to `scripts/check-test-fixtures.mjs` is OUT OF SCOPE for this story — it is filed as a separate small follow-up issue (Dev creates the issue at `bmad-create-story` polish-pass time; Story 2.4 / docs PR is an acceptable home for the cross-script polish if the Dev prefers). **Dev records the cross-script follow-up issue identifier in the Dev Agent Record before closing.**

10. **AC-02.3.10 — Sprint-status flip + `last_updated:` refresh.** As part of this PR (single commit acceptable; Story 2.1 PR #20 / Story 2.2 PR #23 precedent):
    - Edit `_bmad-output/implementation-artifacts/sprint-status.yaml`: flip `2-3-wire-licenses-check-into-npm-test-ci-drift-gate` from `backlog` to `ready-for-dev` (the create-story step) — **handled by John (PM) in this CS commit, not by Amelia (DS)**.
    - On the DS handoff PR, Amelia flips it from `ready-for-dev` → `done` (matches Story 2.1 / Story 2.2 closer pattern).
    - Refresh both the file-header `# last_updated:` comment and the YAML body `last_updated:` line to name [DEE-122](/DEE/issues/DEE-122) + this story file's creation + the Bundle 2 / Bundle 3 fold-in.

11. **AC-02.3.11 — `npm test` is green on the PR.** Same NFR-01 wall-clock check as predecessors: CI run wall-clock within ±20 % of `_bmad-output/planning-artifacts/nfr01-baseline.json` `rolling_mean_ms` (16 746.6 ms ± 20 % = [13 397, 20 096] ms) on the canonical CI cell (Linux/Ubuntu-22.04 × Node 22.x). Murat (TEA) reviews the regression check on the PR. **Note:** this story IS the wire-in (per AC-02.3.1), so the wall-clock change vs the Story 2.2 baseline is expected to be approximately +63 ms (the `licenses:check` cost) + +5–50 ms (the harness — depends on (α) / (β) choice) + the new `--time` wrapper overhead. Net: well within ±20 %; Murat records the duration for the rolling-mean update.

12. **AC-02.3.12 — `project-context.md` §16 anti-patterns hold.** The PR adds **no** new `window` global (§16.1), **no** new IPC channel (§16.2/§16.3), **no** new `// @ts-ignore` (§16.8), **no** edits to `main/util/_unused/` source files (§16.6 — only metadata files like `LICENSE.yml` may be edited), **no** modification of vendored utilities (§16.5), **no** `--no-verify` commits (§16.9). Reviewer verifies with `git diff` + `git log --pretty=fuller`. Generator script + harness are `.mjs` outside `main/`, so the strict-TS surface (§16.7 / ADR-007) is unchanged. **Special note for §16.9.** [DEE-98](/DEE/issues/DEE-98) Bundle 1 was committed with `--no-verify` per an explicit confirmation interaction (`c728c262`) due to a documented environmental Electron-spawn failure on the doc-only PR; that exception **DOES NOT carry forward to this story** — Story 2.3 is a code-and-test PR (not doc-only), so the pre-commit hook's `npm test` MUST pass locally. If the Electron environmental issue is unresolved at commit time, the Dev mitigates by (1) running `npm run licenses:check && npm run test:licenses && npm run test:fixtures:check` manually + recording exits + (2) opening a separate confirmation interaction on the DS issue with explicit per-incident justification. **Default expectation: no `--no-verify` on this PR.**

13. **AC-02.3.13 — No fixture / asset / vendored-source file is renamed, re-encoded, or content-changed.** The PR touches only:
    - `scripts/build-licenses.mjs` — refactor for `onFail` injection (AC-02.3.3) + add Copilot #1 / #2 schema branches (AC-02.3.3 rows 8 + 9) + `MODE` prefix (AC-02.3.6) + `emitDriftDiff` enhancements (AC-02.3.7) + `renderTable` polish (AC-02.3.8 — optional) + `--help` exit-0 (AC-02.3.9) + module-shape entry-point guard.
    - `package.json` — wire `licenses:check` (AC-02.3.1) + add `test:licenses` script entry if (α) (AC-02.3.3) + the optional 750 ms wrapper script entry if Dev picks the standalone `scripts/check-licenses-budget.mjs` path (AC-02.3.4 (a)). **Scope guard:** this is the existing Sprint-plan §3 shared-edit-point #2 ordered merge point — **A4 is the FINAL merge into `scripts.test`** before A5 (Story 2.4 docs). Dev verifies the final shape vs the post-PR-#15 / post-PR-#23 state.
    - `scripts/build-licenses.test.mjs` (NEW; if (α) is picked) OR `tests/build-licenses.spec.ts` (NEW; if (β) is picked). Harness file.
    - `scripts/check-licenses-budget.mjs` (NEW; only if AC-02.3.4 (a) standalone-wrapper path is picked).
    - `_bmad-output/implementation-artifacts/sprint-status.yaml` (status flip + `last_updated:`).
    - `_bmad-output/implementation-artifacts/2-3-wire-licenses-check-into-npm-test-ci-drift-gate.md` (this story file — created by John in CS commit; populated by Amelia at DS time per the standard Dev-Agent-Record block).

    Verified by `git diff --stat` on the final PR. **Zero** code-file deletions outside the scope above. **Zero** changes under `main/util/*.{js,ts}`, `main/util/_unused/*`, `main/font/fonts/`, `tests/assets/*.{svg,woff,woff2}`, `eslint.config.mjs`, `tsconfig.json`, `.github/`, `scripts/check-test-fixtures.mjs` (§16 cross-coupling guard — see AC-02.3.9's note about the parallel `--help` exit-0 fix being filed as a separate follow-up issue, not folded here), `LICENSES.md` (the artefact this story validates; must be unchanged on the PR — drift means a Story 2.2 regression, not a Story 2.3 deliverable), all `LICENSE.yml` files (this story does NOT modify metadata; it validates it).

---

## Tasks / Subtasks

- [ ] **Task 1 — Pre-flight reads (binding; AC: all)**
  - [ ] 1.1 Read `_bmad-output/planning-artifacts/architecture.md` §5 ADR-008 (full text — particularly step 3 *"Wire `npm run licenses:build` (regenerates) and `npm run licenses:check` (regenerates to a temp string, diffs against committed). Add `licenses:check` to the `npm test` chain (or a pre-test hook) so CI fails when the committed file is stale."*) + §3.3 (test-latency rule — sub-second deterministic file walks; 1 s ceiling).
  - [ ] 1.2 Read `_bmad-output/planning-artifacts/prd.md` §FR-02 (AC-02.1..AC-02.4 — particularly AC-02.3 *"a `npm test` failure when `LICENSE.yml` and `LICENSES.md` are out of sync"* and AC-02.4 *"sub-second wall-clock"*).
  - [ ] 1.3 Read `_bmad-output/project-context.md` §16 (16-item anti-pattern list — particularly §16.5/§16.6/§16.9). Read §11 (pre-commit hook + `--no-verify` discipline).
  - [ ] 1.4 Read `projects/deepnest-next/reviews/2-2-implement-scripts-build-licenses-mjs-generator-script-round-1.md` end-to-end — particularly §P2-04 (lines 111–116, the parser harness brief) + §P3-06 (lines 150–155, the wall-clock guard brief) + §P3-03/§P3-04/§P3-05 (Bundle 3).
  - [ ] 1.5 Read `projects/deepnest-next/reviews/2-2-implement-scripts-build-licenses-mjs-generator-script-round-2.md` (Round-2 + Round-2.5 verdicts; confirms Bundle 1 / Bundle 1.1 closure stack and the Bundle 2 / Bundle 3 hand-off to this story).
  - [ ] 1.6 Read `_bmad-output/implementation-artifacts/2-2-implement-scripts-build-licenses-mjs-generator-script.md` (Story 2.2 spec — predecessor; particularly the Dev-Agent-Record §"§2.9 fixture-manifest interaction — (β) with implementation deferred" — which surfaces the FR-02 / FR-03 gate-coupling question this story does NOT need to resolve).
  - [ ] 1.7 Read `_bmad-output/implementation-artifacts/3-1-implement-tests-assets-integrity-check-manifest-wire-into-npm-test.md` — Story 3.1 / DEE-69 wire-in precedent (the exact pattern AC-02.3.1 (a) mirrors). Particularly the "Files touched" + the `package.json` `scripts.test` shape after PR #15 / `f6b07f0`.
  - [ ] 1.8 Read `scripts/build-licenses.mjs` end-to-end (it is 298 lines; one read is enough). Note the line numbers in AC-02.3.3 above; verify they match the current commit (`74a795f`).
  - [ ] 1.9 Read `scripts/check-test-fixtures.mjs` (Story 3.1 precedent — same Node-stable + zero-dep + `.mjs` shape; mirror its file-header comment style + exit-code discipline; note the parallel `--help` exit-3 issue at lines 283-292 that AC-02.3.9 explicitly leaves for a separate follow-up).
  - [ ] 1.10 Read `package.json` `scripts` block — confirm the post-PR-#15 / post-PR-#23 shape (`test:fixtures:check` already wired into `scripts.test`; `licenses:check` exists as a sibling but NOT yet wired). Read `scripts.licenses:build` + `scripts.licenses:check` to confirm exact entries from Story 2.2.
  - [ ] 1.11 Read `_bmad-output/planning-artifacts/sprint-plan.md` §3 row A4 + shared-edit-point #2 — confirms `scripts.test` is the ordered merge point and A4 is the final merge before A5 (Story 2.4).
  - [ ] 1.12 Read `_bmad-output/planning-artifacts/nfr01-baseline.json` — confirm `rolling_mean_ms = 16746.6` + `tolerance_pct = 20`.

- [ ] **Task 2 — Refactor `scripts/build-licenses.mjs` to the `onFail` injection contract (AC: #3 — P2-04 mandatory)**
  - [ ] 2.1 Decide injection mechanism: **(i) parameter-pass** (preferred — cleanest seam) OR **(ii) module-level mutable export** (lightweight). Document the choice in the PR description.
  - [ ] 2.2 Define the default `onFail` at module scope: `const defaultOnFail = (code, msg) => { process.stderr.write(msg + "\n"); process.exit(code); };`. Production behaviour MUST be byte-identical to today's `failSchema` / `failIO` outputs (verify with a smoke run after the refactor: drift the file by one byte; `licenses:check` exits 1 with the same stderr shape — modulo the AC-02.3.7 `+`/`-` markers, which land later).
  - [ ] 2.3 Refactor `failSchema` to accept (or read) the injected `onFail`. The function builds the `[<MODE>] FAIL — schema parse error in <file>:<lineNo>. <msg>. See <DOCS_POINTER>.` string and calls `onFail(EXIT_SCHEMA, fullMsg)`. **Break the prefix into a `MODE` constant** (sets up AC-02.3.6).
  - [ ] 2.4 Refactor `failIO` similarly. Same `onFail(EXIT_IO, fullMsg)` shape. Use the same `MODE` constant for the prefix (AC-02.3.6 closure).
  - [ ] 2.5 Add a top-of-file entry-point guard so the dispatcher (`argv` block at lines 286–298) only runs when the file is invoked as the entry point (`if (import.meta.url === pathToFileURL(process.argv[1]).href)` OR equivalent). Imports of `parseYaml`, `validateEntry`, `loadEntries`, `modeBuild`, `modeCheck`, `emitDriftDiff` MUST NOT trigger CLI dispatch. **Recommendation:** wrap the dispatcher in an `if (isMain())` block; expose the helper from the module so the harness can verify its behaviour for completeness.
  - [ ] 2.6 Re-export the testable surface from the module: `parseYaml`, `parseValue`, `validateEntry`, `loadEntries`, `deriveUnit`, `renderTable`, `modeBuild`, `modeCheck`, `emitDriftDiff`, `defaultOnFail`, the `EXIT_*` constants, the `MODE` constant.

- [ ] **Task 3 — Implement the `licenses:check` mode-prefix correction (AC: #6 — Bundle 3 / Copilot #4 / P3-07)**
  - [ ] 3.1 In the dispatcher at the bottom of the file, set `MODE = (argv.length === 1 && argv[0] === "--check") ? "licenses:check" : "licenses:build"` BEFORE invoking `modeCheck` / `modeBuild`.
  - [ ] 3.2 Verify both modes' diagnostic outputs use the correct prefix: build mode emits `[licenses:build] …`; check mode emits `[licenses:check] …`. Quick smoke: chmod a `LICENSE.yml` to 000, run `npm run licenses:check` → expect `[licenses:check] FAIL — I/O error on …` (was incorrectly `[licenses:build]` pre-fix).

- [ ] **Task 4 — Add `notes` schema branch (AC: #3 row 8 — Copilot inline #1)**
  - [ ] 4.1 In `validateEntry` (`scripts/build-licenses.mjs:169-190`), after the `KNOWN_FIELDS` audit and the `first_party` boolean check, add an `if ("notes" in entry && typeof entry.notes !== "string") { failSchema(file, lineNo, "`notes` must be a string when present"); }` branch.
  - [ ] 4.2 Verify against Story 2.2's `notes:` corpus: every existing entry that uses `notes:` (in `main/font/LICENSE.yml`, `main/util/LICENSE.yml`, `tests/assets/LICENSE.yml`, `main/LICENSE.yml`) — confirm `typeof === "string"` for each (the parser already returns string for unquoted single-line content). No production drift expected; the AC closes a NEW branch covering a hypothetical `notes: true` mis-edit.

- [ ] **Task 5 — Add absolute-path / `..` rejection in per-folder mode (AC: #3 row 9 — Copilot inline #2)**
  - [ ] 5.1 In `validateEntry` (between the existing required-field check and the `first_party` boolean check), add: `if (file !== PASSTHROUGH_FILE) { if (entry.path.startsWith("/")) { failSchema(file, lineNo, "per-folder \`path:\` MUST be folder-relative — leading \`/\` is not allowed; see ADR-008 §5 step 1 schema reference"); } if (entry.path.split("/").includes("..")) { failSchema(file, lineNo, "per-folder \`path:\` MUST NOT contain \`..\` segments; see ADR-008 §5 step 1 schema reference"); } }`. The `PASSTHROUGH_FILE` constant already exists at `scripts/build-licenses.mjs:36` — the rule explicitly does NOT apply to `main/LICENSE.yml`'s literal-Unit-column-value entries (`/main`, `/polygon`, etc.).
  - [ ] 5.2 Verify against current corpus: `grep -E "^\s+path: /" main/util/LICENSE.yml main/font/LICENSE.yml tests/assets/LICENSE.yml` MUST return zero matches (none of the 22 existing per-folder entries should have a leading `/`). `grep "\.\." main/util/LICENSE.yml main/font/LICENSE.yml tests/assets/LICENSE.yml` MUST return zero matches in `path:` lines. **No production drift expected.**

- [ ] **Task 6 — Implement the parser/drift smoke harness (AC: #3 — P2-04 mandatory)**
  - [ ] 6.1 Decide harness placement: **(α) `scripts/build-licenses.test.mjs` (`node:test`)** OR **(β) `tests/build-licenses.spec.ts` (Playwright)**. Document the choice in the PR description; recommendation is **(α)**.
  - [ ] 6.2 If (α): create `scripts/build-licenses.test.mjs`. File header comments mirror `scripts/build-licenses.mjs` shape — purpose, Node-stable + zero-dep declaration, exit-code legend, ADR-008 cross-link.
  - [ ] 6.3 Write 13 test cases — one per branch in AC-02.3.3's table. Use a `captureOnFail` helper that returns `{ code, msg }` for the `onFail` invocation. Each test feeds an in-memory bad input (or a temp-file mutate-restore for the `--check` drift path) and asserts `(code, msg-substring)`. Reference branches:
    - 1. value-line outside any entry — feed a YAML string starting with `  key: value` (no `- ` prefix); expect `EXIT_SCHEMA` + `value-line outside any entry`.
    - 2. expected continuation / new-entry — feed `- a: 1\n notb: 2` (1-space indent, not 2); expect `EXIT_SCHEMA` + `expected \`  key: value\` continuation`.
    - 3. unterminated double-quoted string — feed `- copyright: "Hello`; expect `EXIT_SCHEMA` + `unterminated double-quoted string`.
    - 4. missing required field — feed an entry missing `path:`; expect `EXIT_SCHEMA` + `missing required field \`path\``.
    - 5. required field non-empty-string — feed `- path: ""`; expect `EXIT_SCHEMA` + `must be a non-empty string`.
    - 6. unknown field — feed `- path: x\n  bogus: y`; expect `EXIT_SCHEMA` + `unknown field \`bogus\``.
    - 7. `first_party` non-boolean — feed `- path: x\n  first_party: maybe`; expect `EXIT_SCHEMA` + `\`first_party\` must be boolean`.
    - 8. **NEW** `notes` non-string — feed `- path: x\n  notes: true`; expect `EXIT_SCHEMA` + `\`notes\` must be a string`.
    - 9. **NEW** absolute / `..` path in per-folder mode — feed `main/util/LICENSE.yml`-style file with `- path: /clipper.js`; expect `EXIT_SCHEMA` + `per-folder \`path:\` MUST be folder-relative`. Repeat for `path: ../clipper.js`; expect the `..` variant.
    - 10. `loadEntries` I/O error — pass a path that does not exist; expect `EXIT_IO` + `I/O error on`.
    - 11. `modeBuild` write error — chmod the temp `LICENSES.md` parent to read-only; expect `EXIT_IO`. (Optional / platform-conditional; mark as `t.skip()` if `process.platform === "win32"`.)
    - 12. `modeCheck` `LICENSES.md` missing — point `OUTPUT_FILE` at a non-existent path via the test seam; expect `EXIT_DRIFT` + `LICENSES.md not found`.
    - 13. `modeCheck` content drift — write a perturbed version of the regenerated content to a temp file; expect `EXIT_DRIFT`.
  - [ ] 6.4 If (β): create `tests/build-licenses.spec.ts` instead. Same 13 cases, using `node:assert` or Playwright's `expect`. The Playwright harness MUST run inside the existing `playwright test` invocation (no new npm script) — verify the existing `tests/index.spec.ts` precedent for how test files are picked up.
  - [ ] 6.5 If (α), wire `npm run test:licenses` script: `"test:licenses": "node --test scripts/build-licenses.test.mjs"`. (Node 20+ supports `node --test` natively.)
  - [ ] 6.6 Verify zero-dep guarantee: `package-lock.json` MUST be unchanged after Task 6 (`node:test` is built-in; no new devDep).

- [ ] **Task 7 — Wire `licenses:check` into `npm test` (AC: #1, #11 — A4 deliverable)**
  - [ ] 7.1 Decide implementation: **(a) inline-and** in `scripts.test` OR **(b) `pretest` hook**. Document the choice in the PR description; recommendation is **(a)**.
  - [ ] 7.2 If (a) — current `package.json` `scripts.test` (post-PR-#15 / post-PR-#23 — Dev confirms exact shape):
    - **Before:** `"test": "npm run test:fixtures:check && playwright test"` (or whatever the Story 2.2 + Story 3.1 final shape is).
    - **After:** `"test": "npm run licenses:check && npm run test:licenses && npm run test:fixtures:check && playwright test"` (insert `licenses:check` LEFT of `test:fixtures:check` AND `test:licenses` between them OR — Dev's call — group the licences pair so the harness runs immediately after the gate it tests; the spec recommends `licenses:check && test:licenses` adjacency for cognitive locality).
    - **Or with the Hermes wrapper:** replace `npm run licenses:check` with `node scripts/check-licenses-budget.mjs` (Task 8 below).
  - [ ] 7.3 If (b) — define `pretest` in `scripts`: `"pretest": "npm run licenses:check && npm run test:licenses"` AND leave `scripts.test` untouched at `playwright test` (assuming `test:fixtures:check` is also moved to `pretest` for consistency — this would diverge from Story 3.1's wire-in pattern, so prefer (a)).
  - [ ] 7.4 Verify the chain by running `npm test` locally. On a clean tree, all three checks pass + Playwright runs. Mutate `LICENSES.md` (e.g. `sed -i 's/MIT/BLAH/' LICENSES.md`) — `npm test` exits non-zero with the unified-diff stderr; Playwright is NOT spawned; restore the file (`git checkout LICENSES.md`) and re-run to confirm green.

- [ ] **Task 8 — Implement the 750 ms wall-clock guard (AC: #4 — P3-06 mandatory)**
  - [ ] 8.1 Decide implementation: **(a) standalone wrapper** `scripts/check-licenses-budget.mjs` OR **(b) inline in `scripts/build-licenses.mjs --check`**. Document the choice; recommendation is **(a)**. **Ping [@Murat](agent://cb45a95b-ee30-49d2-ae12-8a15cdfb3886) (TEA) on the DS issue thread before commit if leaning to (b).**
  - [ ] 8.2 If (a): create `scripts/check-licenses-budget.mjs`. File header comments: purpose ("Wall-clock CI guard for `licenses:check` per Sage Story 2.2 Round-1 P3-06 / Hermes F1; threshold 750 ms = 250 ms cushion under ADR-008 §3.3's 1 s ceiling, ~12× margin over Round-1 mean ≈ 63 ms"), Node-stable + zero-dep declaration, exit-code legend, threshold constant `THRESHOLD_MS = 750`. Spawn `node scripts/build-licenses.mjs --check` via `child_process.spawnSync` (`stdio: 'inherit'`); capture wall-clock via `process.hrtime.bigint()` around the spawn; exit non-zero with a named diagnostic if `ms > THRESHOLD_MS`; otherwise propagate the spawn's exit code.
  - [ ] 8.3 Wire `scripts.test:licenses:budget` (or just call the wrapper directly from `scripts.test`): `node scripts/check-licenses-budget.mjs` replaces the bare `npm run licenses:check` in the chain. The harness in Task 6 does NOT cover the wrapper's threshold logic (out of scope; the wrapper is CI-cell-specific behaviour).
  - [ ] 8.4 Run locally: `time node scripts/check-licenses-budget.mjs` — should be < 200 ms wall on a developer laptop. **CI will be the source of truth.** Murat (TEA) confirms the threshold matches the CI cell's expected variance in his trace pass.

- [ ] **Task 9 — Implement `emitDriftDiff` truncation honesty + `+`/`-` markers (AC: #7 — Bundle 3 / P3-03 + Copilot #3)**
  - [ ] 9.1 Update `emitDriftDiff` (`scripts/build-licenses.mjs:259-284`) to count total drift across the whole file before applying the 20-line cap. Use a single pass collecting all `(line, exp, obs)` tuples; then slice to 20 for display.
  - [ ] 9.2 Format the banner: `First ${diffs.length} of ${totalDrift} differing line(s):`. Append ` (…${totalDrift - diffs.length} more truncated)` when `totalDrift > diffs.length`; omit the appended clause otherwise.
  - [ ] 9.3 Emit each diff entry as a unified-diff-style stanza: `@@ L${line} @@\n-${exp}\n+${obs}\n`. The leading `-` line is the byte-correct regenerated content; the leading `+` line is what's currently committed. (This matches `git diff` semantics — `+` is the new state being proposed; `-` is the prior state. From the gate's perspective, the *committed* file is "new" and the *regenerated* file is "expected", which feels inverted — Dev MAY swap the marker convention if it reads more naturally for the gate's framing. Document the chosen convention in the file's header comment so reviewers know how to read the output.)
  - [ ] 9.4 Add a smoke test in the harness (Task 6) that asserts a 25-line drift produces *"First 20 of 25 differing line(s): (…5 more truncated)"* banner shape.

- [ ] **Task 10 — Implement `renderTable` allocation polish (AC: #8 — Bundle 3 / P3-04, OPTIONAL)**
  - [ ] 10.1 Decide: implement OR waive. If waived, record under "Bundle 3 Polish — Waiver" in the Dev Agent Record with a one-paragraph rationale; AC-02.3.8 closes via waiver-acknowledgement.
  - [ ] 10.2 If implemented: extract `rowOf(e)` helper. Replace `[...firstParty, ...thirdParty].map(...).join("\n")` with `let body = HEADER; for (const e of firstParty) body += rowOf(e) + "\n"; for (const e of thirdParty) body += rowOf(e) + "\n"; return body;`. Run the byte-for-byte regression check (run `node scripts/build-licenses.mjs` → `git diff LICENSES.md` MUST be empty).

- [ ] **Task 11 — Implement `--help` / `-h` exit-0 (AC: #9 — Bundle 3 / P3-05)**
  - [ ] 11.1 Update the dispatcher in `scripts/build-licenses.mjs` (post-`MODE` block from Task 3): add an explicit branch for `argv[0] === "--help" || argv[0] === "-h"` that prints the usage text and exits `EXIT_OK = 0`. Other unrecognised args fall through to the catch-all + `EXIT_USAGE = 3`.
  - [ ] 11.2 File the cross-script follow-up issue for the parallel `--help` exit-3 fix in `scripts/check-test-fixtures.mjs:283-292`. Title suggestion: *"`scripts/check-test-fixtures.mjs --help` should exit 0 (mirror the Story 2.3 / DEE-122 fix; Bundle 3 P3-05 cross-script symmetry)"*. Record the issue identifier in the Dev Agent Record before closing.

- [ ] **Task 12 — Sprint-status flip + `last_updated:` refresh (AC: #10)**
  - [ ] 12.1 (CS commit, John — already done in this story-file PR per the DEE-83 batch-2 / DEE-90 / DEE-122 pattern.) Edit `_bmad-output/implementation-artifacts/sprint-status.yaml`: flip `2-3-wire-licenses-check-into-npm-test-ci-drift-gate: backlog` → `ready-for-dev`. Refresh `last_updated:` lines (both file-header `# last_updated:` comment AND YAML body `last_updated:` field) to mention DEE-122.
  - [ ] 12.2 (DS commit, Amelia.) On the dev-implementation PR: flip `ready-for-dev` → `done`. Refresh `last_updated:` lines to mention the merged PR + the DS issue id.

- [ ] **Task 13 — Pre-flight scope-creep check (AC: #12, #13)**
  - [ ] 13.1 `git diff --stat` — touched files MUST be the AC-02.3.13 set only.
  - [ ] 13.2 `git diff main/util/*.{js,ts} main/util/_unused/` MUST return empty (anti-pattern §16.5 + §16.6 guard).
  - [ ] 13.3 `git diff tests/assets/*.svg main/font/fonts/` MUST return empty (FR-03 invariant guard, AC-02.3.13).
  - [ ] 13.4 `git diff scripts/check-test-fixtures.mjs tests/assets/.fixture-manifest.json` MUST return empty (FR-03 gate-decoupling guard — AC-02.3.9 explicitly leaves the parallel `--help` fix to a follow-up issue).
  - [ ] 13.5 `git diff package-lock.json` MUST return empty (zero-dep guard — `node:test` is built-in; no new devDep).
  - [ ] 13.6 `git diff LICENSES.md` MUST return empty (Story 2.2 deliverable — Story 2.3 validates it; does NOT regenerate it).
  - [ ] 13.7 `git diff main/LICENSE.yml main/util/LICENSE.yml main/font/LICENSE.yml tests/assets/LICENSE.yml` MUST return empty (this story does NOT modify metadata; only validates the parser handles it).

- [ ] **Task 14 — Pre-commit + CI run (AC: #11, #12)**
  - [ ] 14.1 `git commit` without `--no-verify` (per AC-02.3.12 — DEE-98 Bundle 1's exception does NOT carry forward). If the Electron-spawn environmental issue from Bundle 1 is unresolved at commit time, follow the AC-02.3.12 mitigation path (run the three checks manually + open a separate confirmation interaction; default expectation is no `--no-verify`).
  - [ ] 14.2 Push the PR; verify CI Playwright run is green; record wall-clock vs NFR-01 baseline (target: within [13 397, 20 096] ms — incremental cost expected ≈ +63 ms `licenses:check` + ≈ +50–100 ms harness + wrapper overhead = ≈ +120–200 ms over the Story 2.2 baseline; well within the ±20 % envelope).
  - [ ] 14.3 If CI's `paths:` filter excludes `scripts/*.mjs` + `package.json` `scripts`-block-only changes, manually `gh workflow run playwright.yml --ref <branch>` to force a run (Story 1.1 / Story 2.1 / Story 2.2 precedent).
  - [ ] 14.4 Run all gates locally to verify the chain wires correctly:
    - `npm run licenses:build` — exits 0; `git diff LICENSES.md` empty (no metadata drift introduced by Story 2.3 work).
    - `npm run licenses:check` — exits 0 with the new OK log line per AC-02.3.5.
    - `npm run test:licenses` (or the harness via `playwright test` if (β)) — all 13 cases pass.
    - `node scripts/check-licenses-budget.mjs` (if (a) AC-02.3.4) — exits 0; wall-clock < 750 ms.
    - `npm test` — full chain green.

- [ ] **Task 15 — PR composition (AC: all)**
  - [ ] 15.1 Open PR titled `feat(licenses): Story 2.3 — wire \`licenses:check\` into \`npm test\` + parser/drift harness (P2-04) + 750 ms CI guard (P3-06) + Bundle 3 polish (DEE-?? / FR-02 ADR-008)` (replace `DEE-??` with the DS issue number assigned to this story; the CS issue is [DEE-122](/DEE/issues/DEE-122)).
  - [ ] 15.2 PR description includes:
    - AC checklist (all 13).
    - **AC-02.3.1 wire-in choice** — (a) inline-and / (b) `pretest` hook with rationale paragraph.
    - **AC-02.3.3 `onFail` injection mechanism** — (i) parameter-pass / (ii) module-level mutable export.
    - **AC-02.3.3 harness placement** — (α) `node:test` / (β) Playwright with rationale.
    - **AC-02.3.4 wall-clock wrapper choice** — (a) standalone / (b) inline; **including Murat's confirmation comment if (b) was picked**.
    - **AC-02.3.7 `+`/`-` marker convention** — which way the markers read (regenerated-vs-committed framing).
    - **AC-02.3.8 `renderTable` polish** — implemented OR waived (with rationale if waived).
    - **AC-02.3.9 cross-script follow-up issue identifier** — for the parallel `scripts/check-test-fixtures.mjs --help` fix.
    - **NFR-01 verification section** — `npm test` wall-clock vs baseline; per-gate breakdown (`licenses:check` ≈ 63 ms; `test:licenses` ≈ ?? ms; `test:fixtures:check` ≈ ?? ms; Playwright ≈ ?? s; total ≈ ?? s).
    - **§16 anti-pattern 16/16-pass checklist** (mirror Story 2.1 / Story 2.2 PR body).
    - **Pre-flight reads list** (mirror Task 1 above — all 12 items).
    - **Drift-fail demonstration** — verbatim stderr from a deliberate `LICENSES.md` mutation (per AC-02.3.2). Restore the file before commit.
    - **Dev Agent Record** populated per the standard block at the bottom of this file.
  - [ ] 15.3 Self-Review (Amelia's `bmad-code-review`) → Review-Board handoff per the standard Phase-4 protocol. The Review Board should explicitly verify Bundle 2 (P2-04 + P3-06) and Bundle 3 (P3-03 + P3-04 + P3-05 + Copilot #3 + #4) closure in the diff.

---

## Dev Notes

### Bundle 3 fold-in rationale (per [DEE-98](/DEE/issues/DEE-98) DoD: *"Bundle 3 either merged or explicitly waived in Story 2.3 / 2.4 Dev Agent Record."*)

This story **folds** Bundle 3 (P3-03 + P3-04 + P3-05 + Copilot #3 + #4 / P3-07) as polish ACs — AC-02.3.6 + AC-02.3.7 + AC-02.3.8 + AC-02.3.9 — instead of waiving them. **John's spec-time rationale:**

- **Co-location with the surface area being touched.** All Bundle 3 items target `scripts/build-licenses.mjs` (or a `package.json` script entry alongside it). Story 2.3 already refactors that file deeply for the `onFail` injection (AC-02.3.3) + adds two new schema branches (AC-02.3.3 rows 8 + 9). The marginal review cost of bundling P3-03/04/05 + Copilot #3/#4 is small; the alternative is a Story 2.4 polish-only PR that revisits the same file, which is a bigger reviewer cognitive cost across two sprints.
- **No Bundle 3 item is structurally risky.** P3-03 changes a stderr format string; P3-04 is a 6-line `for-of` rewrite; P3-05 is a 3-line dispatcher branch; Copilot #4 (P3-07) is a 1-line prefix swap. Total Bundle 3 LoC delta is ≈ 30 lines, mostly inside functions Story 2.3 already touches.
- **Bundle 3 polish has user-visible behavioural impact.** P3-03's truncation honesty + Copilot #3's `+`/`-` markers are operator-facing (the diagnostic the contributor reads when CI flips red); P3-05's exit-0 on `--help` is POSIX-conformant; Copilot #4's correct mode prefix is diagnostic-correctness. Only P3-04 is pure idiomatic-consistency — and that's the one AC the spec explicitly allows to waive (AC-02.3.8).
- **Sprint-pacing cost is bounded.** A4 is the critical-path Stream-A item; A5 (Story 2.4 docs) follows. Folding Bundle 3 here keeps A5 docs-only — clean separation of concerns for the docs author.

If Amelia (DS) prefers to waive ANY Bundle 3 AC at implementation time (e.g. P3-04 per AC-02.3.8's explicit waiver path, OR — for a stronger reason — one of the others), the path is: record under "Bundle 3 Polish — Waiver" in the Dev Agent Record with a paragraph rationale; the spec authorises this for AC-02.3.8 only. Waiving any of AC-02.3.6 / AC-02.3.7 / AC-02.3.9 requires a comment on the DS issue thread + John's explicit acknowledgement before commit.

### Project context (binding)

- **Repo:** `deepnest-next` (community fork of Deepnest 2D bin-packing for Electron). See `_bmad-output/project-context.md` §1 for orientation.
- **Stream:** This story is **A4 — Stream A's fourth item**. Stream A is the critical path (5 items: A1 done → A2 done → A3 done → A4 (this) → A5). A4 wires the gate; A5 lands the contributor docs.
- **Sequencing implication:** Story 2.4 (A5) **depends** on this PR being merged first — its `docs/development-guide.md` "add a new vendored library" workflow points at `npm run licenses:build && git add LICENSES.md` (the contributor instruction), which assumes the gate this PR wires is active. Stream-B (Epic-3 docs follow-on `3-2-…`) and Stream-C (Story 5.1 type gap) can run in parallel; Story 4.1 (background-worker shutdown) is also parallel-eligible.
- **Sprint plan §3 shared-edit-point #2 — `package.json` `scripts.test` ordered merge point.** A4 is the FINAL merge into `scripts.test` per the sprint plan. Post-A4 final shape: `"test": "npm run licenses:check && npm run test:licenses && npm run test:fixtures:check && playwright test"` (or the equivalent `pretest` shape). No subsequent story touches `scripts.test` in this sprint.

### Why `node:test` over Playwright for the harness (AC-02.3.3 (α) recommendation deep-dive)

The Sage Round-1 P2-04 brief offers both options as acceptable. Spec-time recommendation = (α) `node:test`:

- **Speed.** `node:test` runs in ≈ 0 wall-clock cost on top of Node's startup; Playwright spins up Chromium + Electron under `xvfb-run` per project context §12, which adds ≈ 5 s of fixed cost even for a no-op spec. Story 2.3 adds 13 test cases — a ≈ 5 s harness cost is unjustified for what's essentially a unit-test of a 300-line Node script.
- **Coupling.** Playwright's invocation surface (`tests/index.spec.ts`) is the renderer/E2E story; `scripts/build-licenses.mjs` is build-time tooling outside `main/`. Putting the harness under `tests/` couples build-tooling tests with renderer E2E tests in `scripts.test` — a cleaner boundary keeps `npm run test:licenses` a separate slot, runnable by a contributor who hits a build-tooling regression without spinning up Playwright.
- **Precedent.** `scripts/check-test-fixtures.mjs` (Story 3.1) ships without a unit test today (Sage Round-1 P3-05 noted the project-wide `--help` exit-3 issue but did not file a test-coverage P2 against it); Story 2.3 establishes the `node:test` precedent for build-tooling. Future build-tooling stories (e.g. Story 3.1 hardening if AC-02.2.9 (β) lands) can mirror this pattern.

If Amelia prefers (β) at implementation time, the spec authorises it — record the rationale in the PR description.

### Hermes 750 ms threshold — full upstream context

From the Sage Round-1 report `projects/deepnest-next/reviews/2-2-implement-scripts-build-licenses-mjs-generator-script-round-1.md` §P3-06 (lines 150–155, verbatim):

> **Location:** `scripts/build-licenses.mjs:1-298` (entry-set sized at 5+14+7+2 = 28 rows today).
>
> **Evidence:** Local benchmark (5 cold-process `node scripts/build-licenses.mjs --check` runs): **70 / 63 / 61 / 63 / 59 ms wall** (mean ≈ 63 ms; matches Sage's pre-flight ~64 ms). architecture.md §3.3 budget for the FR-02 + FR-03 CI gates is *"sub-second deterministic file walks"* → ~14× headroom today. Asymptotics: O(n) parse + O(n log n) sort on a 28-row third-party slice — trivial at present scale, ~500-entry headroom before the 1 s ceiling. From Story 2.3 onward (`licenses:check` wired into `npm test` per FR-02 §A4), this script becomes a true CI hot-path; Hermes's role rule is to make the budget posture explicit, not implicit, when a script enters CI.
>
> **Remediation:** No code change to the generator. Hand off to TEA (Murat) on Story 2.3: add a runtime regression test (or a `time` wrapper inside the npm-test step) that **fails CI when `node scripts/build-licenses.mjs --check` exceeds e.g. 750 ms wall** on the canonical CI cell — explicit 250 ms cushion under §3.3's 1 s ceiling, ~12× margin to absorb future row growth + CI variance + node-process startup. Capture the chosen threshold in the Story 2.3 Dev Agent Record. **Not blocking for this PR.**

The threshold is **750 ms wall on the canonical CI cell** (Linux/Ubuntu-22.04 × Node 22.x). Murat's TEA trace pass on this story is the moment to confirm or amend; the AC-02.3.4 contract names Murat as the gate's owner.

### `onFail(code, msg)` minimal sketch (AC-02.3.3 implementation reference)

```js
// Module-level
const defaultOnFail = (code, msg) => {
  process.stderr.write(msg + "\n");
  process.exit(code);
};

let _onFail = defaultOnFail;

// Test seam (option (ii) — module-level mutable export)
export function setOnFail(fn) { _onFail = fn ?? defaultOnFail; }

// Refactored failSchema
function failSchema(file, lineNo, msg) {
  _onFail(
    EXIT_SCHEMA,
    `[${MODE}] FAIL — schema parse error in ${file}:${lineNo}.\n` +
      `  ${msg}\n` +
      `  See ${DOCS_POINTER}.`,
  );
}

// Refactored failIO
function failIO(file, err) {
  _onFail(
    EXIT_IO,
    `[${MODE}] FAIL — I/O error on ${file}: ${err.message}\n` +
      `  See ${DOCS_POINTER}.`,
  );
}
```

The harness's `captureOnFail` helper:

```js
import { setOnFail } from './build-licenses.mjs';

class TestExit extends Error {
  constructor(code, msg) { super(msg); this.code = code; }
}

function captureOnFail(fn) {
  setOnFail((code, msg) => { throw new TestExit(code, msg); });
  try { fn(); throw new Error('expected onFail to be called'); }
  catch (e) { if (e instanceof TestExit) return { code: e.code, msg: e.message }; throw e; }
  finally { setOnFail(null); }
}
```

Option (i) parameter-pass instead of (ii) mutable export keeps the surface a smaller; Dev picks per stylistic preference.

### Anti-pattern audit map (project-context.md §16)

| §16.X | Anti-pattern | This story's exposure | Verification |
|---|---|---|---|
| 1 | New global on `window` | None — script + harness run in Node, not in renderer | `git diff` shows zero `window\.` adds |
| 2 | `ipcRenderer.invoke('read-config'\|'write-config')` outside `config.service.ts` | None | `git diff` |
| 3 | New `background-*` IPC handler outside `nesting.service.ts` | None | `git diff` |
| 4 | New UI framework | None — pure tooling + tests | `git diff` |
| 5 | Modify vendored utilities in `main/util/` | None — only `scripts/` + `package.json` + `_bmad-output/` | `git diff main/util/*.{js,ts}` returns empty |
| 6 | Import from `main/util/_unused/` | None | `git diff` shows zero `import` from `_unused/` |
| 7 | New TypeScript decorator transform | N/A — generator + harness are `.mjs` outside `main/` | `git diff` |
| 8 | New `// @ts-ignore` | None — `.mjs` not on TS type-check surface; harness is `.mjs` (or `.spec.ts` if (β), in which case `// @ts-ignore` use is forbidden) | `git diff \| grep '@ts-ignore'` returns nothing new |
| 9 | `--no-verify` to skip pre-commit | **Forbidden.** DEE-98 Bundle 1's exception (`c728c262` confirmation) does NOT carry forward — this PR is code-and-test, not doc-only. Mitigation path documented under AC-02.3.12. | `git log --pretty=fuller` shows no `[skipped]` markers |
| 10 | Drop / re-encode `tests/assets/*.svg` without re-deriving spec literals | None — story is harness-only on the test side; no SVG / fixture edit | `git diff -- 'tests/assets/*.svg'` returns empty |
| 11 | Double-convert mm/inch | None | — |
| 12 | Open external URLs by spawning a `BrowserWindow` | None | — |
| 13 | Add HTTP server / telemetry / DB | None | — |
| 14 | Assume Windows `clean`/`clean-all` works on Linux/macOS | N/A — generator + harness platform-agnostic; `node:test` runs identically on Linux + Windows + macOS | — |
| 15 | Remove `**/*.js` from ESLint global ignore | None | `git diff eslint.config.mjs` returns empty |
| 16 | New spinner glyph | None | — |

### Sprint risk callouts (from `_bmad-output/planning-artifacts/sprint-plan.md` §5)

- **R1 (Low / High) — NFR-01 wall-clock regression > 20 %.** Mitigation: each PR re-runs `npm test` on the canonical CI cell. This story's incremental cost is ≈ +120–200 ms over the Story 2.2 baseline (16 746.6 ± 20 % = [13 397, 20 096] ms); well within tolerance. Task 14.2 records the duration. Risk that the harness (Task 6) lands above its budget — mitigated by the (α) `node:test` recommendation (≈ 0 wall-clock overhead).
- **R2 (Medium / Medium) — `licenses:check` flakes on platform-dependent line endings.** Story 2.2 already mitigates by emitting LF-only (per AC-02.2.6). This story's `--check` path consumes that contract; Task 14.4 verifies `npm run licenses:check` exits 0 on a freshly-checked-out tree.
- **R6 (Medium / Medium) — story is unexpectedly larger than its IR sizing claims.** Realistic risk given the Bundle 2 + Bundle 3 fold-in. Mitigation: AC-02.3.13's scope-creep checklist + Task 13's pre-flight scope diff. The Bundle 3 fold-in totals ≈ 30 lines (per the rationale block above); the Bundle 2 fold-in totals ≈ 100 lines (refactor for `onFail` injection + 2 new schema branches + harness file + budget wrapper). Total story LoC delta ≈ 200–300 lines + ≈ 50 lines of metadata edits — within IR sizing for an A-stream story.
- **R-NEW (Low / Medium) — Bundle 1's `--no-verify` exception precedent leaks.** AC-02.3.12 explicitly closes this risk by naming the DEE-98 exception non-transferable. Task 14.1 enforces.

### Project Structure Notes

- **Files touched are exactly:**
  - `scripts/build-licenses.mjs` — `onFail` refactor + 2 new schema branches + `MODE` prefix + `emitDriftDiff` enhancements + optional `renderTable` polish + `--help` exit-0 + module-shape entry-point guard. Net delta ≈ 100–150 lines edited.
  - `scripts/build-licenses.test.mjs` (NEW; if (α)) OR `tests/build-licenses.spec.ts` (NEW; if (β)). Harness file. ≈ 200–300 lines.
  - `scripts/check-licenses-budget.mjs` (NEW; if AC-02.3.4 (a)). Wall-clock wrapper. ≈ 30 lines.
  - `package.json` — wire `licenses:check` into `scripts.test`; add `test:licenses` (if (α)); optionally add `test:licenses:budget` (if (a) AC-02.3.4). ≈ 3 line edits.
  - `_bmad-output/implementation-artifacts/sprint-status.yaml` — status flip + `last_updated:`. ≈ 3 line edits.
  - This story file (created in the CS commit by John; populated by Amelia at DS time).
- **No** `tsconfig.json` / `eslint.config.mjs` / `.github/` / `LICENSES.md` / any `LICENSE.yml` / `package-lock.json` edits.
- **No** code edits anywhere under `main/util/*.{js,ts}`, `main/util/_unused/*`, `main/font/fonts/`, `tests/assets/*.svg`, `scripts/check-test-fixtures.mjs`. The parallel `--help` exit-3 fix in `check-test-fixtures.mjs` is filed as a separate follow-up issue per AC-02.3.9 / Task 11.2.

### Testing standards summary

- **`npm test` is the only test layer.** Single Playwright spec at `tests/index.spec.ts`. `headless: false`; CI uses `xvfb-run`. Per `_bmad-output/project-context.md` §12.
- **This story adds a sibling test layer** — `npm run test:licenses` (if (α) `node:test`) — wired into `scripts.test` so CI runs both. Mirrors the `npm run test:fixtures:check` precedent established in Story 3.1 / DEE-69 / PR #15.
- **No new Playwright test added by this story** unless (β) is picked. (β) keeps the harness inside `tests/` with the existing Playwright runner.
- **`scripts/build-licenses.test.mjs` (`node:test`) is the canonical harness shape going forward** for build-tooling tests in this project (this story establishes the precedent). Future build-tooling stories — e.g. Story 3.1 hardening if AC-02.2.9 (β) lands — should mirror.

### What this story does NOT do (out-of-scope guards)

- **Does not modify `LICENSES.md`.** This story validates the file via the gate; it does NOT regenerate it. Drift in this PR's diff means a Story 2.2 regression, not a Story 2.3 deliverable.
- **Does not modify any `LICENSE.yml` file.** This story tests the parser handles them; it does NOT edit metadata.
- **Does not modify `scripts/check-test-fixtures.mjs`.** The parallel `--help` exit-3 fix (Bundle 3 / P3-05 cross-script symmetry) is filed as a separate follow-up issue per AC-02.3.9 / Task 11.2. FR-02 / FR-03 gate-coupling discipline holds.
- **Does not author Story 2.4** (`docs/development-guide.md` "add a new vendored library" workflow). That's Stream-A5, follows this story.
- **Does not file the Murat (TEA) tea-trace handoff for Story 2.2.** That's filed separately as a sibling issue to DEE-92 (per Story 2.2 spec's Out-of-scope §). This story DOES include a Murat hand-off for the AC-02.3.4 750 ms threshold confirmation — but that's a per-AC consultation, not a tea-trace.
- **Does not amend ADR-008.** Bundle 1 / Bundle 1.1 ADR-008 amendment landed in PR #31 (commits `84daa3f` + `ac28fc6`); this story implements the rules ADR-008 already states.
- **Does not modify the existing `licenses:build` / `licenses:check` script entries** (in `package.json` `scripts`). This story consumes them as-is; only `scripts.test` is amended (per AC-02.3.13).

---

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` §"Story 2.3" (Epic 2 / FR-02)]
- [Source: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row A4 + §5 R1/R2/R6 risk rows]
- [Source: `_bmad-output/planning-artifacts/architecture.md` §3.1 row FR-02 + §3.3 (test-latency rule, 1 s ceiling) + §5 §"ADR-008" (full text — particularly step 3 CI integration)]
- [Source: `_bmad-output/planning-artifacts/prd.md` §FR-02 (AC-02.1..AC-02.4)]
- [Source: `_bmad-output/project-context.md` §11 (pre-commit hook + `--no-verify` discipline) + §12 (`npm test` is the only test layer; Playwright headless:false + xvfb-run) + §16 (anti-patterns)]
- [Source: `projects/deepnest-next/reviews/2-2-implement-scripts-build-licenses-mjs-generator-script-round-1.md` §P2-04 (lines 111–116) + §P3-03 (132–136) + §P3-04 (138–142) + §P3-05 (144–148) + §P3-06 (150–155) — the canonical text the AC-02.3.3 / .4 / .6 / .7 / .8 / .9 fold-ins reproduce]
- [Source: `projects/deepnest-next/reviews/2-2-implement-scripts-build-licenses-mjs-generator-script-round-2.md` (Round-2 + Round-2.5 verdict; Bundle 1 / Bundle 1.1 closure stack)]
- [Source: `_bmad-output/implementation-artifacts/2-2-implement-scripts-build-licenses-mjs-generator-script.md` (predecessor — the script this story wires into CI)]
- [Source: `_bmad-output/implementation-artifacts/3-1-implement-tests-assets-integrity-check-manifest-wire-into-npm-test.md` (Story 3.1 wire-in precedent)]
- [Source: `scripts/build-licenses.mjs` (the script Story 2.3 consumes + refactors; line numbers in AC-02.3.3 pinned to commit `74a795f`)]
- [Source: `scripts/check-test-fixtures.mjs` (Story 3.1 precedent — Node-stable + zero-dep + `.mjs` shape; mirror file-header comment style + exit-code discipline)]
- [Source: `package.json` `scripts` block (post-PR-#23 / post-PR-#15 shape; `licenses:check` exists as a sibling but NOT yet wired into `scripts.test`)]
- [Source: `_bmad-output/planning-artifacts/nfr01-baseline.json` — `rolling_mean_ms = 16746.6`, `tolerance_pct = 20`]
- [Parent issue: [DEE-122](/DEE/issues/DEE-122) (CS issue — this story file is its primary deliverable; child of [DEE-98](/DEE/issues/DEE-98) Bundle 2)]
- [Predecessor issues: [DEE-92](/DEE/issues/DEE-92) (Story 2.2 DS, merged via [PR #23](https://github.com/Dexus-Forks/deepnest-next/pull/23) commit `74a795f`); [DEE-93](/DEE/issues/DEE-93) (Sage Story 2.2 Round-1 review, APPROVED `severity.max=P2`); [DEE-98](/DEE/issues/DEE-98) (Bundle 2 + Bundle 3 source); [DEE-116](/DEE/issues/DEE-116) (Sage Story 2.2 Round-2 board review, APPROVED `severity.max=P3`); [DEE-117](/DEE/issues/DEE-117)/[DEE-118](/DEE/issues/DEE-118)/[DEE-119](/DEE/issues/DEE-119)/[DEE-120](/DEE/issues/DEE-120) (Round-2 perspective minions)]
- [Predecessor PR: [PR #31](https://github.com/Dexus-Forks/deepnest-next/pull/31) (Bundle 1 + 1.1 ADR-008 amendment — merged `7bd3f13`)]
- [Sprint label: MVP-1; Sprint-Start gate OPEN per CTO sign-off in DEE-53]

---

## Dev Agent Record

### Agent Model Used

To be filled by Amelia (Dev) at DS time.

### Debug Log References

To be filled by Amelia (Dev) at DS time. MUST include the verbatim drift-fail demonstration per AC-02.3.2.

### Completion Notes List

To be filled by Amelia (Dev) at DS time. MUST include:

- **AC-02.3.1 wire-in choice** — (a) inline-and / (b) `pretest` hook + rationale.
- **AC-02.3.3 `onFail` injection mechanism** — (i) parameter / (ii) module-level mutable + rationale.
- **AC-02.3.3 harness placement** — (α) `node:test` / (β) Playwright + rationale.
- **AC-02.3.4 wall-clock wrapper choice** — (a) standalone / (b) inline + rationale + Murat's confirmation comment ID if (b) was picked.
- **AC-02.3.7 marker convention** — regenerated-as-`-` / committed-as-`+` (or inverse) + rationale.
- **AC-02.3.8 `renderTable` polish** — implemented / waived; if waived, rationale.
- **AC-02.3.9 cross-script follow-up issue identifier** — for the parallel `scripts/check-test-fixtures.mjs --help` fix.
- **§16 anti-pattern audit** — 16/16 pass.
- **NFR-01 wall-clock** — recorded vs `_bmad-output/planning-artifacts/nfr01-baseline.json`.

### Bundle 3 Polish — Waiver

(Only populated if AC-02.3.8 `renderTable` polish is waived. Other Bundle 3 ACs MUST be implemented per the spec contract.)

### File List

To be filled by Amelia (Dev) at DS time. Expected shape:

**New files:**

- `scripts/build-licenses.test.mjs` (if (α)) OR `tests/build-licenses.spec.ts` (if (β)).
- `scripts/check-licenses-budget.mjs` (if (a) AC-02.3.4).

**Modified files:**

- `scripts/build-licenses.mjs` — `onFail` refactor + 2 new schema branches + `MODE` prefix + `emitDriftDiff` enhancements + (optional) `renderTable` polish + `--help` exit-0 + module-shape entry-point guard.
- `package.json` — wire `licenses:check` into `scripts.test`; add `test:licenses`; optionally add `test:licenses:budget`.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `2-3-…: ready-for-dev → done`; `last_updated:` refreshed.
- `_bmad-output/implementation-artifacts/2-3-wire-licenses-check-into-npm-test-ci-drift-gate.md` (this file — populated DS-side per the standard Dev-Agent-Record block).

**Untouched (verified by `git diff`):** `scripts/check-test-fixtures.mjs`, `LICENSES.md`, all `LICENSE.yml` files, `package-lock.json`, `eslint.config.mjs`, `tsconfig.json`, `.github/`, all `main/util/*.{js,ts}`, all `main/util/_unused/*` source files, all `main/font/fonts/*`, all `tests/assets/*.{svg,woff,woff2}`, `main.js`, `index.d.ts`.

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-04-26 | Story created (`bmad-create-story`, [DEE-122](/DEE/issues/DEE-122) — CS follow-up to [DEE-98](/DEE/issues/DEE-98) Bundle 2). Bundle 2 (P2-04 + P3-06) folded as mandatory ACs (#3, #4); Bundle 3 (P3-03/04/05 + Copilot inline #3 + #4 / P3-07) folded as polish ACs (#6, #7, #8, #9) per DEE-98 DoD; AC-02.3.8 (`renderTable` allocation polish) flagged as the one ACa eligible for waiver. Status: ready-for-dev. | John (PM, BMad) |
