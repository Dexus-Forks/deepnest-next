# Story 3.1: Implement `tests/assets/` integrity check + manifest, wire into `npm test`

Status: ready-for-dev

> Authored by John (PM, BMad) on 2026-04-26 via `bmad-create-story` for **MVP-1 / Stream B head**. Sprint plan reference: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row B1. Epic anchor: `_bmad-output/planning-artifacts/epics.md` §"Story 3.1" lines 470–519.

---

## Story

As a **Maintainer**,
I want **a deterministic, single-process integrity check that captures the current `tests/assets/` set + the literal counts the spec depends on (`54/54` placements, `2` import-nav items) and fails CI fast when the fixture set changes without the literals being updated in the same change**,
so that **a contributor re-encoding `tests/assets/foo.svg` to fix a path issue cannot silently break the spec because the placement count drifts**.

**Sprint role.** This story is the **head of Stream B**. Standalone — depends only on Sprint-Start pre-conditions. The non-`package.json` work (the `check-test-fixtures.mjs` script + `.fixture-manifest.json`) can begin in parallel with Stream A; the **`package.json` `scripts.test` wire-in commit is gated on Stream A reaching Story 2.3** (which lands the `licenses:check` step that this story chains onto). See the sequencing note at the end of Tasks.

**FR/AC coverage:** FR-03 (PRD §FR-03) — AC-03.1 .. AC-03.5.
**ADRs preserved (no new ADR introduced):** Inherits the ADR-008 enforcement pattern (build-time check + CI gate via `npm test`). ADR-007 (strict TS only on `main/**/*.ts`) is preserved — script lives outside that surface.
**NFR coupling measured:** NFR-05 (capability ↔ NFR pair — fixture-integrity gate exists and is enforced); NFR-01 (no perf regression introduced by the check; ±20 % tolerance vs. `nfr01-baseline.json`).

---

## Acceptance Criteria

1. **AC-03.1 — Integrity check runs first in `npm test` and is fail-fast.** When `npm test` is invoked on a clean tree, the integrity check runs **before** Playwright. If the check exits non-zero, Playwright is **not** spawned. The chain is documented in `package.json` `scripts.test`. Target shape (per sprint-plan.md §3 shared-edit-point #2): `"test": "npm run licenses:check && npm run test:fixtures:check && playwright test"`. Until Story 2.3 lands, the **interim** shape `"test": "npm run test:fixtures:check && playwright test"` is acceptable; Story 2.3 will rebase and prepend `licenses:check`.

2. **AC-03.2 — No new GitHub Actions job.** The check is hooked into the existing `npm test` invocation only. No new `.github/workflows/*.yml` file is created and no new step is added to existing workflows. *Verification: `git diff --stat .github/workflows` returns nothing.*

3. **AC-03.3 — Failure mode names both literals.** When the check exits non-zero, stdout/stderr contains a message that names **both** the expected and observed values for **both** literals tracked: `#importsnav li` (expected `2`) and `placements` (expected `54/54`). The message also points the developer at the docs section added in Story 3.2 (`docs/development-guide.md` §"Re-deriving the test-fixture literals after a `tests/assets/` change") even before Story 3.2 ships — the path is stable; the section will exist when the developer follows the pointer (Story 3.2 commits the section name verbatim).

4. **AC-03.4 — Manifest captures the current fixture set.** A new file `tests/assets/.fixture-manifest.json` (or equivalent — implementation choice between checksum manifest, directory snapshot, or name-list + size-list per overlay §4 FR-03 (c)) records the deterministic state of `tests/assets/` plus the two literal counts. The manifest is **committed** to the repo. **Manifest format (recommended; the dev may justify a different shape in the PR description):**

   ```json
   {
     "schema_version": 1,
     "captured_at": "<iso8601>",
     "literals": { "importsnav_count": 2, "placements_total": 54, "placements_max": 54 },
     "files": [
       { "path": "tests/assets/henny-penny.svg", "size": <bytes>, "sha256": "<hex>" },
       { "path": "tests/assets/mrs-saint-delafield.svg", "size": <bytes>, "sha256": "<hex>" }
     ]
   }
   ```

5. **AC-03.5 — Day-one false-positive free.** On a clean checkout of `main` (post Story 3.1's commit) the integrity check passes (`npm run test:fixtures:check` exits `0`). The implementing developer demonstrates this **and** demonstrates the check failing red on a deliberate fixture mutation (e.g., touch a byte in `tests/assets/henny-penny.svg`, or rename `mrs-saint-delafield.svg` → `mrs.svg`). PR description must include both the green and the deliberately-red transcripts.

6. **AC-03.6 — Test-latency rule respected.** `npm run test:fixtures:check` completes in **< 1 second** on a developer laptop (deterministic file walk; **no Playwright spawn**, **no Electron spawn**). Implementation must use Node-stable `fs` + `path` + `crypto` only — no new runtime dependency. *Verification: time the command 5× locally; report the p95 in the PR description.*

7. **AC-03.7 — Read-only over the fixture set.** The story does **not** rename, re-encode, or modify any existing file under `tests/assets/`. The only addition under `tests/assets/` is `.fixture-manifest.json` (or whatever the dev names the manifest file). *Verification: `git diff --stat tests/assets/ | grep -v fixture-manifest` returns nothing.*

8. **AC-03.8 — Spec literals unchanged.** The PR does **not** modify `tests/index.spec.ts`. The literals at line ~132 (`#importsnav li` count `2`) and line ~185 (`54/54`) are read by the check, **not** rewritten. *Verification: `git diff tests/index.spec.ts` returns nothing.*

9. **AC-03.9 — `project-context.md` §16 anti-patterns hold.** No new global on `window`, no new IPC channel, no new `// @ts-ignore`, no `--no-verify` commits, no edits to vendored utilities, no new runtime `dependencies` in `package.json` (the script must be zero-dep — Node-stable `fs`/`path`/`crypto` only). Reviewer verifies with `git diff` + `git log --pretty=fuller`.

10. **AC-03.10 — `npm test` regression-free against the NFR-01 baseline.** Total `npm test` wall-clock on the canonical CI cell stays within ±20 % of `_bmad-output/planning-artifacts/nfr01-baseline.json` `rolling_mean_ms` (16 746.6 ms). Since AC-03.6 budgets the check at < 1 s, the regression risk is the chain overhead only.

---

## Tasks / Subtasks

- [ ] **Task 1 — Capture the current `tests/assets/` state for the manifest seed (AC: #4)**
  - [ ] 1.1 Enumerate `tests/assets/` recursively at `main` HEAD (today: 2 files — `henny-penny.svg`, `mrs-saint-delafield.svg`). Record `path`, byte-size, and sha256 of each.
  - [ ] 1.2 Read `tests/index.spec.ts` line ~132 (the `expect(...#importsnav li...).toHaveCount(N)` assertion) and line ~185 (the `54/54` placement assertion). Record `N` and the placement total/max.
  - [ ] 1.3 If counts don't match the canonical (`#importsnav li = 2`, `54/54`) — **STOP**. The spec literals have drifted from sprint-plan / project-context. Escalate via `bmad-correct-course`.

- [ ] **Task 2 — Author the integrity-check script (AC: #1, #3, #4, #6, #9)**
  - [ ] 2.1 Decide on the script's home. Options: (a) `scripts/check-test-fixtures.mjs` (recommended; matches the location convention Story 2.2 will establish for `scripts/build-licenses.mjs`); (b) `helper_scripts/check-test-fixtures.mjs` (already excluded from packaged installer per the `!{examples,helper_scripts}` rule). **Pick one and document the choice in the PR description**. If (a), confirm `package.json` `build.files` excludes `scripts/**` *or* that the script is filtered out by another existing rule — if not, add the exclusion in this PR. If (b), no further wiring.
  - [ ] 2.2 Implement the script. Required behaviour:
    - **Default mode (`check`):** read the committed `tests/assets/.fixture-manifest.json`. Recompute the file-system state under `tests/assets/` (excluding `.fixture-manifest.json` itself). Read the two literals from `tests/index.spec.ts` by **regex**, not by importing the file (the spec is TypeScript and Playwright-imported; we want a non-Playwright-spawning read). Compare every captured field against the manifest. If any differ, print a unified human-readable diff and exit `1`. Otherwise exit `0`. Single-process; no fork.
    - **`update` mode (optional but recommended):** when invoked as `npm run test:fixtures:update` (or `node scripts/check-test-fixtures.mjs --update`), regenerate the manifest from the current file-system state + spec literals, write it back to disk, and exit `0`. This is the contributor's tool when a legitimate fixture edit happens. **Story 3.2 documents this**; the script must already support it so 3.2 is purely a docs change.
  - [ ] 2.3 Implement the spec-literal regex carefully. The patterns to extract:
    - `#importsnav li` count: regex like `expect\(\s*[^)]*#importsnav\s+li[^)]*\)\.toHaveCount\(\s*(\d+)\s*\)`.
    - Placement count: regex like `["']\s*(\d+)\s*\/\s*(\d+)\s*["']` constrained by surrounding context (e.g. preceded by `placements` or `toContainText` — read the spec at the actual line).
    - Both regexes must be tolerant of whitespace and quoting style. **If the regex fails to match the current spec, the script must exit `2` (distinct from drift exit `1`) with a message naming the line range searched** so a future spec-format change is immediately diagnosable.
  - [ ] 2.4 Failure-message contract (AC-03.3). The drift output must include a block like:
    ```
    [test:fixtures:check] FAIL — fixture set drifted from manifest.

    Expected (manifest):    Observed (working tree):
      importsnav_count = 2    importsnav_count = 2
      placements = 54/54      placements = 60/60   <-- drift
      henny-penny.svg ...     henny-penny.svg ...
                              foo.svg              <-- new, no manifest entry

    Re-derive the manifest after a deliberate fixture edit by following:
      docs/development-guide.md §"Re-deriving the test-fixture literals
      after a `tests/assets/` change" (added by Story 3.2).
    Fast path: `npm run test:fixtures:update && git add tests/assets/.fixture-manifest.json tests/index.spec.ts`.
    ```
  - [ ] 2.5 Performance budget. AC-03.6 caps the check at < 1 s on a developer laptop. Use `fs.readdirSync(... , { recursive: true })` + `fs.statSync` + `crypto.createHash('sha256').update(buffer).digest('hex')`. Avoid spawning subprocesses. **Time it 5× locally and record the p95** for the PR description.

- [ ] **Task 3 — Commit the seed manifest (AC: #4, #5)**
  - [ ] 3.1 Run the script in `--update` mode against `main` HEAD. Commit the resulting `tests/assets/.fixture-manifest.json`.
  - [ ] 3.2 Verify `npm run test:fixtures:check` (after Task 4 wires the script into `package.json`) exits `0` on the committed manifest.

- [ ] **Task 4 — Wire `test:fixtures:check` into `npm test` (AC: #1, #2)**
  - [ ] 4.1 Add a `package.json` scripts entry: `"test:fixtures:check": "node scripts/check-test-fixtures.mjs"` (or `helper_scripts/...`, matching Task 2.1's choice). Add `"test:fixtures:update": "node scripts/check-test-fixtures.mjs --update"`.
  - [ ] 4.2 **Sequencing-aware `scripts.test` edit** (per sprint-plan.md §3 shared-edit-point #2):
    - **If Story 2.3 has merged into `main` before this PR opens:** rebase onto `main` and **append** `test:fixtures:check` after the existing `licenses:check`. Target shape: `"test": "npm run licenses:check && npm run test:fixtures:check && playwright test"`.
    - **If Story 2.3 has not yet merged:** use the interim shape `"test": "npm run test:fixtures:check && playwright test"`. Story 2.3's PR will then rebase and prepend `licenses:check`. **Document this state explicitly in the PR description** so the reviewer knows which shape to expect.
    - **Do not introduce a `pretest` hook** — the chain belongs in `scripts.test` per overlay §3.3 and the precedent the sprint plan sets for Story 2.3.
  - [ ] 4.3 Verify the wire-in does not break `npm test`. Run locally; confirm the check runs first and Playwright runs after.

- [ ] **Task 5 — Demonstrate the gate (AC: #5)**
  - [ ] 5.1 On a working-copy mutation (e.g., `echo " " >> tests/assets/henny-penny.svg`), run `npm test`. Capture the **red** transcript: the check exits `1`, prints the drift message per AC-03.3, and Playwright **does not run**.
  - [ ] 5.2 Revert the mutation. Run `npm test`. Capture the **green** transcript: the check exits `0`, Playwright runs.
  - [ ] 5.3 Run `npm run test:fixtures:check` standalone 5× (after revert). Record the p95 wall-clock. Confirm < 1 s (AC-03.6).

- [ ] **Task 6 — NFR-01 regression check (AC: #10)**
  - [ ] 6.1 Run `npm test` end-to-end on the canonical CI cell (or simulate it locally on Linux + Node 22). Record the wall-clock duration.
  - [ ] 6.2 Compare against `_bmad-output/planning-artifacts/nfr01-baseline.json` `rolling_mean_ms = 16746.6`. Must be within ±20 % (13 397 .. 20 096 ms). Record the comparison in the PR description.
  - [ ] 6.3 If outside ±20 %: **STOP**. Most-likely-culprit hypotheses (in order): (a) the check is running > 1 s and the chain overhead has compounded; (b) the spec-literal regex is doing something pathological. Investigate before pushing.

- [ ] **Task 7 — Pre-commit hook in full (AC: #9)**
  - [ ] 7.1 Stage the changes. `git commit -m ...`. The hook (`husky` → `lint-staged` → `prettier --write && eslint --fix && playwright test`) must run end-to-end. **Never `--no-verify`** (anti-pattern §16.9).
  - [ ] 7.2 Note: the hook's full Playwright run will exercise the new check. Expect a single-digit-second increase in commit time vs. baseline.

- [ ] **Task 8 — PR composition (AC: all)**
  - [ ] 8.1 Open the PR against `main`. Title pattern: `feat(test): Story 3.1 — tests/assets/ integrity check + manifest (DEE-54 / FR-03)`.
  - [ ] 8.2 PR description must include:
    - The 10 AC blocks transposed to checkboxes.
    - The **green** and **deliberately-red** transcripts from Task 5 (in collapsed `<details>` blocks).
    - The script-location decision (Task 2.1) — `scripts/` vs. `helper_scripts/` — with rationale.
    - The 5× p95 wall-clock for `npm run test:fixtures:check` (Task 5.3).
    - The `npm test` total wall-clock vs. NFR-01 baseline (Task 6).
    - The chosen `scripts.test` shape (interim vs. canonical, per Task 4.2) and the rationale.
    - **The §16 anti-pattern checklist** — explicit one-line "✅ §16.X — not violated" or "N/A — story does not touch this surface" for every item 1..16. (Story 6.1 will land the PR template; until then, embed inline.)
    - A reference link to this story file: `_bmad-output/implementation-artifacts/3-1-implement-tests-assets-integrity-check-manifest-wire-into-npm-test.md`.
    - A reference link to the parent issue: DEE-54.
  - [ ] 8.3 Request review from Murat (TEA, NFR-01 + NFR-05 stewardship) **and** the CTO (sprint sign-off).

---

## Dev Notes

### Project context (binding)

- **Repo:** `deepnest-next` (community fork of Deepnest 2D bin-packing for Electron). See `_bmad-output/project-context.md` §1.
- **Stream:** Head of Stream B in MVP-1. Stream B sequence: B1 (this) → B2 (3.2 docs) → B3 (Epic 4 — main.js shutdown sentinel) → B4 (NFR-02 evidence). This story is the **only one in Stream B that has a wire-in dependency on Stream A** (the `package.json` `scripts.test` shape — see Task 4.2).
- **Why this gate matters.** From `_bmad-output/project-context.md` §12 and the DEE-42 deep-dive: `tests/index.spec.ts` enumerates `tests/assets/` *dynamically* and asserts on two literal counts (`#importsnav li = 2`, `placements = 54/54`). A contributor who re-encodes a fixture (e.g., to fix a path issue) can change the placement total without realising it. The current state has **no automated guard** between fixture mutation and spec-literal drift — the only signal is the spec failing on the very specific count. This story closes that gap with a fast, deterministic, single-process check that runs before Playwright in `npm test`.

### Current state of `tests/assets/` (verified at branch HEAD)

```
tests/assets/henny-penny.svg
tests/assets/mrs-saint-delafield.svg
```

Two SVG files. Per `docs/asset-inventory.md` §1, total 96 481 bytes. Glyphs derived from Google Fonts (SIL OFL). Provenance paperwork is Story 2.1's job — **not** this story.

### Current state of `tests/index.spec.ts` literals (verified at branch HEAD)

- Line ~132: `await expect(mainWindow.locator("#importsnav li")).toHaveCount(2);`
- Line ~185: spec asserts placement count contains `"54/54"` (e.g., `await expect(...).toContainText("54/54")` or similar).

These are the two literals the manifest must capture. **If the spec format has shifted by the time the dev runs Task 1, update the regex in Task 2.3 accordingly and document the exact line numbers in the PR description.** Don't hard-code line numbers in the script — use regex anchored on stable identifiers (`#importsnav li`, `placements`, etc.).

### Current state of `package.json` `scripts.test` (verified at branch HEAD)

```json
"test": "playwright test"
```

Plain Playwright invocation. **No** chain today. After this story (interim shape pending Story 2.3):

```json
"test": "npm run test:fixtures:check && playwright test"
```

After Story 2.3 lands and rebases:

```json
"test": "npm run licenses:check && npm run test:fixtures:check && playwright test"
```

The dev opening this PR may see Story 2.3 not yet merged — **default to the interim shape** and document.

### Architecture compliance (binding)

From `_bmad-output/planning-artifacts/architecture.md` §4 (FR-03) — verbatim constraints:

1. **(a)** Check runs **inside** the existing `npm test` invocation (no new GitHub Actions job per AC-03.2). *Enforced by Task 4 + AC-03.2.*
2. **(b)** Failure mode names **both** the expected and observed values for **both** literals. *Enforced by AC-03.3 + Task 2.4.*
3. **(c)** Implementation choice between (i) checksum manifest, (ii) directory snapshot, (iii) name-list + size-list — left to story-level implementation. Architecture only mandates **deterministic, fast, single-process** (no Playwright spawn for the integrity check). *Recommended: checksum manifest with sha256 — see AC-03.4.*
4. **(d)** `tests/assets/README.md` (FR-02 AC-02.3) is in the same set of files but referenced from a different concern (provenance vs. integrity). Coordinate with FR-02 to land both edits without trampling. *This story does not touch `tests/assets/README.md`. If a coordination question arises, the manifest file (`.fixture-manifest.json`) sits alongside it harmlessly.*

**Architecture overlay §3.3 (test-latency rule):** build-time gates must be fast — the integrity check is a single-process file walk. *AC-03.6 budgets < 1 s.*

**Independent revertibility** (overlay §4 FR-03): the check script is one file, the manifest is one file. Both can be reverted independently of each other and of the spec literals. *Honour this — keep the script and manifest in their own commits ahead of the `package.json` wire-in commit, so a future revert is surgical.*

### Files to create / edit (precise list)

**Create:**

- `scripts/check-test-fixtures.mjs` (or `helper_scripts/check-test-fixtures.mjs` — Task 2.1).
- `tests/assets/.fixture-manifest.json`.

**Edit:**

- `package.json` — add `scripts.test:fixtures:check`, `scripts.test:fixtures:update`, edit `scripts.test` per Task 4.2.
- (Optionally) `package.json` `build.files` — add `!scripts/**` if the script lives there and isn't otherwise excluded.

**Files NOT to touch in this story:**

- `tests/assets/henny-penny.svg`, `tests/assets/mrs-saint-delafield.svg` — read-only (AC-03.7).
- `tests/index.spec.ts` — read-only (AC-03.8).
- `docs/development-guide.md` — Story 3.2's surface; the script's failure message **points** to the docs section but does not write it.
- `tests/assets/README.md` — Story 2.1 / 3.2 coordination point.
- `main.js`, `main/` — out of scope.
- `.github/workflows/*` — explicitly forbidden by AC-03.2.

### Anti-pattern audit map (project-context.md §16)

| §16.X | Anti-pattern | This story's exposure | Verification |
|---|---|---|---|
| 1 | New global on `window` | None | `git diff` |
| 2 | `ipcRenderer.invoke('read-config'\|'write-config')` outside `config.service.ts` | None | `git diff` |
| 3 | New `background-*` IPC handler outside `nesting.service.ts` | None | `git diff` |
| 4 | New UI framework | None | `git diff` |
| 5 | Modify vendored utilities in `main/util/` | None — story does not touch `main/util/` | `git diff --stat \| grep main/util` returns nothing |
| 6 | Import from `main/util/_unused/` | None | `git diff` |
| 7 | New TypeScript decorator transform | None — script is `.mjs` (no decorators) | — |
| 8 | New `// @ts-ignore` | None — script is `.mjs` (no TS) | — |
| 9 | `--no-verify` | **Forbidden.** Pre-commit hook must run end-to-end. | `git log --pretty=fuller` |
| 10 | Drop / re-encode `tests/assets/*.svg` without re-deriving spec literals | **Story explicitly enforces this gate** — it does not violate it. | AC-03.7 + AC-03.8 |
| 11 | Double-convert mm/inch | None | `git diff` |
| 12 | Open external URLs by spawning a `BrowserWindow` | None | `git diff` |
| 13 | Add HTTP server / telemetry / DB | None | `git diff` |
| 14 | Assume Windows `clean`/`clean-all` works on Linux/macOS | N/A — story does not run those scripts | — |
| 15 | Remove `**/*.js` from ESLint global ignore | None | `git diff eslint.config.mjs` |
| 16 | New spinner glyph | None | `git diff main/img` |

**No new runtime dependency** (project-context.md §11 + ADR-008 cross-reference): the script must be zero-dep — Node-stable `fs` / `path` / `crypto` only. If a YAML or other parser is needed (for some optional schema), prefer a devDependency over a runtime dep, **but** this story's manifest is JSON — no parser needed.

### Pre-flight reads (binding — embedded per epic spec)

Before opening the PR, the implementing agent **must** have read:

1. `_bmad-output/project-context.md` §16 — full anti-pattern list (16 items). Audit map above.
2. `_bmad-output/project-context.md` §8 — cross-cutting behaviours that bite. *§8 not directly relevant to this story (no length-typed config, no NFP cache touch). Included for completeness.*
3. `_bmad-output/project-context.md` §11 — ESLint / Prettier rules, pre-commit hook (full Playwright on every commit; never `--no-verify`).
4. `_bmad-output/project-context.md` §17 — brownfield caveats. Note: the script is `.mjs`, ES-modules-native — sits cleanly outside the legacy CJS surface.
5. `_bmad-output/project-context.md` §6 — IPC contract. *Story does not add an IPC channel — the gate is build-time, not runtime.*
6. `_bmad-output/project-context.md` §12 — testing rules. Especially: "the `tests/assets/` directory is enumerated dynamically. Adding / removing / re-encoding a fixture requires re-deriving **two literal assertions** in the spec." This story makes that coupling explicit and machine-checked.
7. `_bmad-output/planning-artifacts/architecture.md` §3.1 + §4 (FR-03) + §3.3 (test-latency rule).
8. `_bmad-output/planning-artifacts/architecture.md` §5 ADR-008 (cross-reference — the enforcement pattern this story inherits).
9. `_bmad-output/planning-artifacts/prd.md` §FR-03 (AC-03.1..AC-03.5).
10. `_bmad-output/planning-artifacts/sprint-plan.md` §3 — sequencing context, especially shared-edit-point #2 for `package.json`.
11. `tests/index.spec.ts` (current literals — line ~132 + line ~185).
12. `tests/assets/` (current fixture set — captured in the manifest).

### Sprint risk callouts (from sprint-plan.md §5)

- **R1 (Low / High) — NFR-01 wall-clock regression > 20 %.** This story adds a < 1 s step before Playwright. Regression risk is mostly in the `npm` chain overhead (each `&&` step adds ~50–100 ms). Task 6 records the comparison.
- **R3 (Medium / Low) — `tests/assets/` manifest false-positive on legitimate fixture edit.** Accepted failure mode: a legitimate fixture edit becomes a documented two-line PR (manifest update + spec literals update). Story 3.2 documents the procedure. **Self-resolving** — no escalation.
- **R5 (Medium / Low) — Stream-A-head and Stream-B-head PRs both land before Story 6.1's PR template.** Mitigation: this story embeds the §16 audit checklist inline in the PR description (Task 8.2).

### Stream parallelism note + sequencing dependency

- Stories 1.1 (Stream A head), 3.1 (this), and 6.1 (Stream C head) **share no files**. They can land in any order or simultaneously. **No merge conflict** between them.
- **`package.json` is the one shared edit point** in MVP-1 (sprint-plan.md §3 shared-edit-point #2). Story 2.3 (Stream A4) lands `licenses:check` first; **this story rebases and appends `test:fixtures:check`**. The Task 4.2 decision tree handles both cases.
- The script + manifest commits in this PR are **independent of `package.json`** until the wire-in. The dev can land Tasks 1–3 even if Story 2.3 is mid-flight; the wire-in commit (Task 4) is the only one with the merge-order dependency.

### Project Structure Notes

- **Files touched are exactly:** new `scripts/check-test-fixtures.mjs` (or `helper_scripts/...`); new `tests/assets/.fixture-manifest.json`; edited `package.json`. Optionally: edited `package.json` `build.files`. **No** `.ts` files. **No** `tests/index.spec.ts` change. **No** `main/` change. **No** `.github/` change.
- **No `tsconfig.json` change** (project-context §10).
- **No `eslint.config.mjs` change** — `**/*.js` global ignore preserved (project-context §11). `.mjs` files inherit the same treatment by ESLint's flat config; no new disable needed.

### Testing standards summary

- The integrity check is **not** a new test — it's a **build-time gate** that runs in front of the existing test layer. Per project-context §12: "There is no unit-test runner. Anything below the UI is reachable only via E2E." This story does **not** introduce a unit-test runner — `check-test-fixtures.mjs` is invoked by `npm test` directly, not by a test framework.
- AC-03.5 demonstrates the gate via two transcripts (green + deliberately red). This is the test evidence; no Playwright spec change is needed.

---

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` lines 470–519 §"Story 3.1: Implement `tests/assets/` integrity check + manifest, wire into `npm test`"]
- [Source: `_bmad-output/planning-artifacts/epics.md` lines 457–468 §"Epic 3: Test-fixture integrity gate"]
- [Source: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row B1 + §3 shared-edit-point #2 + §3 "Parallelism note"]
- [Source: `_bmad-output/planning-artifacts/architecture.md` §3.1 row FR-03 + §3.3 test-latency rule + §4 §"FR-03"]
- [Source: `_bmad-output/planning-artifacts/prd.md` §FR-03 (AC-03.1..AC-03.5)]
- [Source: `_bmad-output/project-context.md` §16 (anti-patterns), §12 (testing rules), §11 (pre-commit)]
- [Source: `tests/index.spec.ts` line ~132 (`#importsnav li` count `2`) + line ~185 (`54/54`)]
- [Source: `tests/assets/` — current fixture set (`henny-penny.svg`, `mrs-saint-delafield.svg`)]
- [Source: `_bmad-output/planning-artifacts/nfr01-baseline.json` — `rolling_mean_ms = 16746.6`, `tolerance_pct = 20`]
- [Parent issue: DEE-54 (bmad-create-story follow-up to DEE-53)]
- [Sprint label: MVP-1; Sprint-Start gate OPEN per CTO sign-off in DEE-53]

---

## Dev Agent Record

### Agent Model Used

_To be filled by Amelia (Dev) on `bmad-dev-story` execution._

### Debug Log References

_To be filled during implementation._

### Completion Notes List

_To be filled at PR-ready time. Must include the script-location decision (`scripts/` vs. `helper_scripts/`) with rationale, and the chosen `scripts.test` shape (interim vs. canonical) with rationale._

### File List

_To be filled at PR-ready time. Expected shape: 1 new file under `scripts/` (or `helper_scripts/`), 1 new file under `tests/assets/`, 1 edit to `package.json`._
