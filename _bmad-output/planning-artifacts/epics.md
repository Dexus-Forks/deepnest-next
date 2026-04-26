---
project_name: deepnest-next
user_name: Paperclip
date: 2026-04-26
workflowType: 'epics-and-stories'
documentShape: 'single-file-canonical'
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/project-context.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
  - _bmad-output/planning-artifacts/architecture.md
  - docs/architecture.md
  - docs/asset-inventory.md
  - docs/development-guide.md
mvp_epic_count: 6
mvp_story_count: 12
fr02_story_split: 4
fr07_in_mvp: false
fr08_in_mvp: false
nfr01_baseline_strategy: 'ir-gate-prerequisite'
nfr01_baseline_owner: 'TEA (Murat) — bmad-testarch-nfr (NR)'
nfr01_baseline_persistence: '_bmad-output/planning-artifacts/nfr01-baseline.json'
generated_by: 'Winston (BMAD Architect) — bmad-create-epics-and-stories, headless mode'
---

# deepnest-next — Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the **deepnest-next** brownfield maintenance MVP slice (FR-01..06). It decomposes the requirements from the [PRD](./prd.md) and the architecture decisions from the [architecture overlay](./architecture.md) into implementable stories sized for **single-PR review**.

**Scope rules carried forward (binding):**

- **Six MVP epics, one per FR** (FR-01..06). FR-07 and FR-08 are **explicitly absent** from MVP per the PRD §Project Scoping & Phased Development table — they are Phase 2 / Growth.
- **Each MVP story references** (a) the relevant ADR(s) — typically ADR-008 (`LICENSES.md` generator) and ADR-009 (bg-worker shutdown sentinel) where applicable, and (b) `_bmad-output/project-context.md` §16 (anti-patterns) as a pre-flight read.
- **No code changes in this artefact.** This is the sprint-ready backlog; Amelia (Dev) executes via `bmad-create-story` (CS) → `bmad-dev-story` (DS) downstream.
- **NFR-01 baseline** is surfaced as a **pre-MVP-sprint Implementation-Readiness gate** owned by **TEA (Murat)** per architecture overlay §8 — see §Pre-MVP-Sprint IR Gates below.
- **Anti-pattern preservation (FR-06)** is the *cross-cutting* MVP gate. Every PR in MVP must pass it; Epic 6 lays the rails (PR template + reviewer checklist) so the other five epics can be measured against it.
- **No UX-DRs** — CU (`bmad-create-ux-design`) was deliberately skipped per PRD §UX Scope; the MVP slice has zero new user-facing surface.

## Requirements Inventory

### Functional Requirements

(Verbatim FR statements from `prd.md` §Functional Requirements. AC IDs preserved for traceability.)

- **FR-01** — Remove unused renderer-side assets (Phase 1 / MVP). A Maintainer can remove the documented dead-weight assets (five unused icons + the Lato dead-weight kit) from the repository so they no longer ship in the installer. ACs: AC-01.1..AC-01.5.
- **FR-02** — Record SIL OFL provenance for `tests/assets/` (Phase 1 / MVP) — *expanded scope per VP*: cover **all third-party / vendored assets and libraries** in the tree, not just `tests/assets/*.svg`. ACs: AC-02.1..AC-02.4.
- **FR-03** — Enforce test-fixture integrity in CI (Phase 1 / MVP). A Maintainer can rely on CI to fail fast when `tests/assets/` content drifts from what the literal assertions in `tests/index.spec.ts` expect. ACs: AC-03.1..AC-03.5.
- **FR-04** — Background-worker shutdown safety (Phase 1 / MVP). A primary user (Riya) can cancel a running nest, kill the app mid-nest, or quit normally during a nest, and the application leaves the NFP cache and renderer state in a consistent state across all three exit paths. ACs: AC-04.1..AC-04.5.
- **FR-05** — Close `SvgParserInstance` type gap (Phase 1 / MVP). A Maintainer working on `main/deepnest.js` can rely on `index.d.ts` to type-check every method actually called on `window.SvgParser`. ACs: AC-05.1..AC-05.3.
- **FR-06** — Anti-pattern preservation across MVP epics (Phase 1 / MVP). A reviewer of any MVP-phase PR can verify that none of the anti-patterns listed in `_bmad-output/project-context.md` §16 has been re-introduced. ACs: AC-06.1..AC-06.6.

**FRs explicitly out of MVP scope** (sequencing-only / Phase 2-3, no MVP epic):

- **FR-07** — Multiple background renderers (parallelism). Hard-deps on FR-04. **Out of MVP** per PRD; this document does **not** create an FR-07 epic.
- **FR-08** — Re-skinnable application icons. **Out of MVP**; deferred to Growth.

### NonFunctional Requirements

(Verbatim NFR statements from `prd.md` §Non-Functional Requirements.)

- **NFR-01** — Performance / regression freedom. ±20% wall-clock vs. rolling 5-run mean of pre-MVP baseline (canonical Playwright fixture set, on the canonical CI cell). **Baseline number is captured pre-MVP-sprint; see Pre-MVP-Sprint IR Gates below.**
- **NFR-02** — Reliability / worker shutdown. 15/15 trials (5 runs × 3 exit paths). Driven by FR-04.
- **NFR-03** — Maintainability / anti-pattern preservation. PR-template checklist; zero ticked-as-violated. Driven by FR-06.
- **NFR-04** — Reliability / native build portability. CI matrix (Linux + Windows × Node 20.x + 22.x), all 4 cells green per release.
- **NFR-05** — Maintainability / test-fixture integrity gate. Capability ↔ FR-03 implementation; this NFR is the audit lens.
- **NFR-06** — Security / posture preservation. ADR-004 invariant (`nodeIntegration: true`, `contextIsolation: false`, `enableRemoteModule: true`, `nativeWindowOpen: true`); 3 BrowserWindow constructors today, 3 expected at sign-off.
- **NFR-07** — Compatibility / settings round-trip. 1.5.6 `userData/settings.json` reads silently; legacy URL rewrite preserved. **Verification rides on existing happy-path Playwright run; no new story required in MVP.**
- **NFR-08** — Documentation freshness. `project-context.md` updated within 7 days of any §2/§6/§16 change. **Cross-cutting reviewer rule, baked into Epic 6's PR template.**

### Additional Requirements

Pulled from the architecture overlay (`architecture.md`) for items that affect epic / story decomposition.

- **No starter template.** This is a brownfield slice; Epic 1 Story 1 is *not* "set up project from starter template" — it is FR-01's asset removal. Architecture overlay confirms no scaffolding step.
- **`main.js` sequencing rule** (overlay §6 Open Q1). In MVP, *only FR-04 touches `main.js`*. Therefore MVP epics may be scheduled in any order — there is no inter-epic merge-churn risk on the runtime delta surface.
- **`winCount = 1` invariant** (overlay §3.1 + ADR-009). FR-04 must preserve `winCount = 1` in `createBackgroundWindows()`. Lifting the cap is FR-07's job (Phase 2) and is *explicitly forbidden* in MVP per AC-04.4.
- **Independent-revertibility discipline** (overlay §6 Open Q2). FR-04 (ADR-009) and FR-07 (Phase 2) live at *different* sites in `main.js` (shutdown path vs. startup / dispatch paths). Stories must preserve this locality so a future `git revert` of either is independent.
- **Build-time tooling lives under `helper_scripts/` or `scripts/`** (overlay §3.3 + ADR-008). FR-02's generator and FR-03's integrity check are **build-time-only** code — confirmed excluded from the packaged installer via the existing `build.files` rule (`!{examples,helper_scripts}`).
- **`npm test` is the integration point** for new build-time gates (FR-02 CI gate, FR-03 integrity check). No new GitHub Actions job is added.
- **Pre-commit hook is binding** (`project-context.md` §11): pre-commit runs the **full Playwright suite**. Stories must accept this latency — `--no-verify` is an anti-pattern (§16.9). Reflected in Epic 6.
- **No `npm run lint` exists** — story-level lint runs are `npx eslint .` / `npx prettier --check .` if needed.
- **Single-topology `tsconfig.json`** preserved (`project-context.md` §10). FR-05's type-only delta extends `index.d.ts`; it does **not** add `tsconfig.app.json` / `tsconfig.test.json`.
- **NFR-01 baseline is a pre-MVP-sprint gate** (overlay §8) — see §Pre-MVP-Sprint IR Gates below for its surfacing as an IR-gate prerequisite (not a regular MVP story).

### UX Design Requirements

**None.** CU (`bmad-create-ux-design`, Sally) was deliberately **skipped** per PRD §UX Scope: every MVP FR is a maintenance / integrity / type / asset-hygiene / process-hygiene requirement, none of FR-01..06 introduces a new user-facing flow, screen, dialog, or interaction pattern. Architecture overlay confirms zero new IPC channels, zero new `window` globals, zero new UI surfaces. There are no UX-DRs to extract or cover.

If a future epic (Phase 2 FR-07 / Phase 3 hardening / new feature) introduces UX surface, CU is re-invoked at that point.

### FR Coverage Map

Each MVP FR maps 1:1 to a single epic (per PRD §References & Handoff item 5 + architecture overlay §10).

| FR | Epic | Architectural delta (one-line) | NFR(s) measured against |
|---|---|---|---|
| **FR-01** | Epic 1 — Renderer asset hygiene | Removal-only delta in `main/img/` + `main/font/` + `docs/asset-inventory.md`. | NFR-01 (regression-free), NFR-03 (anti-patterns) |
| **FR-02** | Epic 2 — `LICENSES.md` generator + per-folder metadata | Generator + per-folder metadata + CI gate (ADR-008). 4-story epic. | NFR-03, NFR-08 |
| **FR-03** | Epic 3 — Test-fixture integrity gate | Build-time integrity check wired into `npm test`. | **NFR-05** (capability ↔ NFR pair), NFR-01 |
| **FR-04** | Epic 4 — Background-worker shutdown safety | Sentinel + bounded try/catch boundary in `main.js` (ADR-009). | **NFR-02** (15/15 trials), NFR-01 |
| **FR-05** | Epic 5 — `SvgParserInstance` type-gap closure | Type-only delta in `index.d.ts`. | NFR-03 |
| **FR-06** | Epic 6 — Anti-pattern preservation rails | PR template + reviewer checklist anchored on `project-context.md` §16. | **NFR-03** (capability ↔ NFR pair), NFR-08 |

**NFR-01** (baseline regression freedom) is the cross-cutting gate evaluated against **every** epic's PR — see Pre-MVP-Sprint IR Gates for the baseline-capture story.

**NFR-04, NFR-06, NFR-07** are **preservation rules** verified at MVP sign-off (CI matrix run, `BrowserWindow` constructor grep, settings round-trip manual repro). They do not generate stories of their own; they constrain every MVP story.

## Epic List

### Epic 1: Renderer asset hygiene
Remove the documented dead-weight assets (five unused icons + the Lato dead-weight kit) from the repository so they no longer ship in the installer, and record the saving in `docs/asset-inventory.md`. Single-PR epic, 1 story.
**FRs covered:** FR-01.

### Epic 2: `LICENSES.md` generator + per-folder metadata
Replace the hand-edited `LICENSES.md` (13 lines, ~12 entries shy of complete) with a deterministic generator script driven by per-folder `LICENSE.yml` metadata, fix the five VP-found data-hygiene issues, and wire a CI gate that fails fast when the committed `LICENSES.md` drifts from what the generator emits. Multi-story epic per ADR-008. 4 stories.
**FRs covered:** FR-02. **ADR:** ADR-008.

### Epic 3: Test-fixture integrity gate
Add a deterministic, single-process integrity check that captures the current `tests/assets/` set + the `54/54` placement count + the `2` import-nav count and fails CI fast when those couplings drift; document the re-derivation procedure so a legitimate fixture edit is a documented two-line PR review. 2 stories.
**FRs covered:** FR-03. **NFR coupling:** NFR-05.

### Epic 4: Background-worker shutdown safety
Resolve the two `// todo:` shutdown sites in `main.js` by introducing a module-scoped `app.shuttingDown` sentinel set in `app.before-quit` and read first-statement in the `background-response` and `background-progress` `ipcMain.on` handlers; preserve `winCount = 1` (FR-07 is Phase 2); collect 15/15 manual-repro evidence per NFR-02. 2 stories.
**FRs covered:** FR-04. **ADR:** ADR-009. **NFR coupling:** NFR-02.

### Epic 5: `SvgParserInstance` type-gap closure
Extend `SvgParserInstance` in `index.d.ts` to declare `transformParse` and `polygonifyPath` matching the actual call-site signatures in `main/deepnest.js`; preserve the `tsconfig.json` single-topology and the strict-TS-on-`main/**/*.ts`-only invariant (ADR-007); zero new `// @ts-ignore`. 1 story.
**FRs covered:** FR-05.

### Epic 6: Anti-pattern preservation rails
Add a PR template (or update the existing one) anchored on `_bmad-output/project-context.md` §16 with the 16 anti-patterns enumerated as a reviewer checklist; document the reviewer's "cite the §16 item number" workflow so contributors can resolve concerns via a single-line lookup. **Lays the rails for the FR-06 gate against which Epics 1–5 are measured.** 2 stories.
**FRs covered:** FR-06. **NFR coupling:** NFR-03, NFR-08.

## Pre-MVP-Sprint IR Gates

> **Not an MVP epic — surfaced as IR-gate prerequisites per the issue spec.** These items must be cleared *before* the IR (`bmad-check-implementation-readiness`) gate can return PASS. They are owned outside the FR-01..06 epics so the MVP epic count stays at six (one per FR), as required.

### Gate G-1 — NFR-01 baseline capture

- **Owner:** **TEA (Murat)** via `bmad-testarch-nfr` (`NR`) workflow downstream. Architect (Winston) sign-off acceptable as fallback if TEA is unavailable.
- **Why a gate, not a regular story:** capturing the baseline on a Paperclip worker / dev laptop produces a number on the wrong hardware (every future merge is measured on a CI runner) — apples-to-oranges baselines compound the GA's stochastic noise. This is intentionally deferred to a one-time CI-runner capture before the first MVP epic ships.
- **Procedure (single PR, pre-MVP):**
  1. Add a Playwright JSON reporter to `playwright.config.ts` (e.g. `reporter: [['html'], ['json', { outputFile: 'playwright-report/results.json' }]]`), guarded so it does not slow non-CI local runs. Reuse existing reporter wiring; no new test dependency. The JSON reporter is wired for diagnostic evidence (uploaded as a workflow artifact); it is **not** the timing source for the baseline.
  2. Run the canonical CI cell (Linux / Ubuntu-22.04 × Node 22.x) **5 times** (rerun-on-success on the same SHA, no code changes between runs).
  3. Time each run as the wall-clock duration of the `xvfb-run npm test` invocation (`(date +%s%N)` end − start, divided to ms). Capture the npm process `exit_code` alongside the duration.
  4. Commit `_bmad-output/planning-artifacts/nfr01-baseline.json` with schema (canonical, as implemented in DEE-52):
     ```json
     {
       "captured_at": "<iso8601>",
       "runner_cell": "ubuntu-22.04 / node-22.x",
       "git_sha": "<sha>",
       "runs": [
         { "ms": <wall-clock-ms>, "exit_code": <int> },
         ... 5 entries total ...
       ],
       "rolling_mean_ms": <number, 1 decimal>,
       "stddev_ms": <number, 1 decimal, population stddev>,
       "tolerance_pct": 20
     }
     ```
  5. Optionally: amend `prd.md` §NFR-01 to reference the file as the authoritative baseline (one-line edit, can land in the same PR).
- **IR-gate verdict (per architecture overlay §8):**
  - **PASS** if the file is present and well-formed (5 runs, schema correct).
  - **CONCERNS** if file is present but rolling-mean spread (max − min) exceeds 50% of the mean (flaky baseline; recommend re-capture).
  - **FAIL** if file is absent. **A FAIL on this gate blocks Sprint-Start for Epics 1–6.**
- **Pre-flight reads for the TEA agent that runs this gate:** `_bmad-output/planning-artifacts/architecture.md` §8 (full procedure), `_bmad-output/project-context.md` §12 (testing rules), §11 (pre-commit cost).

### Gate G-2 — Implementation Readiness pre-condition checklist

The architecture overlay §9 lists 9 IR pre-conditions (most are absent → FAIL gates, two are CONCERNS-tier). Most are satisfied **by this CE artefact** (#1, #4, #5, #6, #8, #9). The remaining ones require active work:

- **Pre-condition #3** (NFR-01 baseline file present) → satisfied by **Gate G-1** above.
- **Pre-condition #7** (PR template references `project-context.md` §16) → satisfied by **Epic 6** shipping.

Pre-condition #2 (ADR-008 + ADR-009 documented) is satisfied by the existing architecture overlay (`architecture.md` §5).

> **CE → IR handoff.** When IR (`bmad-check-implementation-readiness`, DEE-51) runs, it consumes this document for FR coverage + story sizing + ADR / §16 references, plus `_bmad-output/planning-artifacts/nfr01-baseline.json` for Gate G-1, plus the `.github/pull_request_template.md` (or equivalent) for Epic 6 / Pre-condition #7.

## Per-MVP-Story Pre-Flight Read List

> **Binding for Amelia (Dev) / Murat (TEA) on every MVP story.** The CA overlay's "CE invariants" make this list mandatory for each MVP story handoff.

Before opening any MVP story PR, the implementing agent **must** have read:

1. `_bmad-output/project-context.md` §16 — full anti-pattern list (16 items). Verifies the change does not re-introduce any.
2. `_bmad-output/project-context.md` §8 — cross-cutting behaviours that bite (esp. the mm/inch internal-store rule §8.1 if any length-typed config field is touched).
3. `_bmad-output/project-context.md` §11 — ESLint / Prettier rules, pre-commit hook (full Playwright on every commit; **never** `--no-verify`, anti-pattern §16.9).
4. `_bmad-output/project-context.md` §17 — brownfield caveats (mixed module systems, vendored utilities, active Rust migration).
5. `_bmad-output/project-context.md` §6 — IPC contract (`IPC_CHANNELS` is canonical; no new IPC channel outside it, anti-pattern §16.x via FR-06 AC-06.2).

The above is also embedded as the canonical pre-flight set in **every story** below under `**Pre-flight reads:**`. Story-specific deep-dive pointers are added per story.

---

## Epic 1: Renderer asset hygiene

**Epic goal.** Remove the five unused icons + the Lato dead-weight kit from `main/img/` and `main/font/` so they no longer ship in the installer; update `docs/asset-inventory.md` to record the removals and the resulting installer-size saving (target ≥ 1.57 MB; ≤ 2.27 MB upper bound). Single PR; trivially revertible per asset.

**FRs covered:** FR-01 (AC-01.1..AC-01.5).
**ADRs referenced:** None new (preserves ADR-005 — no new globals; preserves ADR-006 — no new Ractive instances).
**NFR coupling:** NFR-01 (`npm test` regression-free post-removal); NFR-03 (anti-patterns hold).
**Estimated PR size:** small (1 PR, ~10 file deletions + 1 doc edit). Reviewer count: 1.
**Test evidence required:** `npm test` (Playwright E2E) green on the PR; no new flakes.
**Sequencing:** independent of Epics 2–6; touches no `main.js`. Coordinate timing with Epic 2 Story 2.1 only insofar as removed assets must also be dropped from any per-folder `LICENSE.yml` introduced under `main/font/` (architecture overlay FR-01 constraint (a)). Both can land in either order; whichever ships second updates the other's reference.

### Story 1.1: Remove dead-weight renderer assets and record the saving

As a **Maintainer**,
I want **to delete the five unused icons + the Lato dead-weight kit and record the result in `docs/asset-inventory.md`**,
So that **the installer is ≥ 1.57 MB lighter and the reviewer can verify the saving against a documented inventory entry**.

**Pre-flight reads:**

- `_bmad-output/project-context.md` §16 (anti-patterns) + §8 + §11 + §17 + §6 (canonical pre-flight set above).
- `_bmad-output/project-context.md` §9.1 — UI / asset binding invariants (icons bound exclusively from `main/style.css`; verify by grep before deletion).
- `_bmad-output/project-context.md` §9.6 — notification-window typography island (Lato webfont removal must not break the notification window's `<link>` to `latolatinfonts.css`).
- `_bmad-output/planning-artifacts/architecture.md` §3.1 + §4 (FR-01 architectural constraints (a)–(d)).
- `docs/asset-inventory.md` (current) — the canonical list of "unused" candidates and the size estimates.

**Files touched (expected scope):**

- Delete: `main/img/auth0logo.svg`, `main/img/background.png`, `main/img/logo.svg`, `main/img/progress.svg`, `main/img/stop.svg`.
- Delete: Lato dead-weight subset under `main/font/` per `docs/asset-inventory.md` (`LatoLatin-BoldItalic.*`, demo specimen pages, `.eot`/`.ttf` for live weights).
- Edit: `docs/asset-inventory.md` — record removals + measured installer-size delta.

**Acceptance Criteria:**

**Given** the working tree at HEAD before the PR
**When** the PR is applied
**Then** the five icons listed in `docs/asset-inventory.md` (`auth0logo.svg`, `background.png`, `logo.svg`, `progress.svg`, `stop.svg`) are removed from `main/img/`
**And** the Lato dead-weight items listed in `docs/asset-inventory.md` are removed from `main/font/`
**And** no JS/TS file under `main/**` references any of the removed paths (verified by `grep -r` on the removed basenames).

**Given** the PR is reviewed
**When** the reviewer reads `docs/asset-inventory.md`
**Then** the file records the removals
**And** the file records the resulting installer-size reduction (target ≥ 1.57 MB; ≤ 2.27 MB upper bound), measured against the previous installer.

**Given** the canonical Playwright spec (`tests/index.spec.ts`)
**When** `npm test` runs on the PR
**Then** the test passes
**And** the placement count remains `54/54`
**And** the `#importsnav li` count remains `2`
**And** no UI element silently depended on a removed asset.

**Given** the project-context.md §16 anti-pattern list
**When** the reviewer audits the PR
**Then** no new global on `window` is introduced (AC-01.5 / §16.1)
**And** no new `// @ts-ignore` is introduced (§16.8)
**And** no new IPC channel is introduced (§16-via-FR-06 AC-06.2)
**And** no new entry under `main/util/_unused/` is touched (§16.x).

**Given** the notification window's webfont island (`project-context.md` §9.6)
**When** the notification window is opened in dev
**Then** the `<link>` to `latolatinfonts.css` resolves
**And** typography in the notification window renders correctly (no FOUT / fallback-only state).

---

## Epic 2: `LICENSES.md` generator + per-folder metadata

**Epic goal.** Replace the hand-edited `LICENSES.md` (13 lines today, structurally short ~12 entries vs. the actual third-party / vendored surface) with a deterministic generator script driven by per-folder `LICENSE.yml` metadata files (single source of truth per folder), fix the five VP-found data-hygiene issues, and wire a CI gate that fails fast when the committed `LICENSES.md` drifts from what the generator emits. Bootstraps the **drift-resistance pattern** that ADR-008 codifies. Multi-story epic per ADR-008's recommended split; the four stories below match the split exactly.

**FRs covered:** FR-02 (expanded scope per VP — AC-02.1..AC-02.4 + the VP-found data-hygiene set).
**ADRs referenced:** **ADR-008** (binding for the entire epic) — `LICENSES.md` is generated, not hand-edited; per-folder `LICENSE.yml` is the single source of truth; CI verifies generated == committed; generator lives in `scripts/` (or `helper_scripts/`) and is excluded from the packaged installer via the existing `build.files` rule. Cross-references: **ADR-003** (out-of-tree `@deepnest/*` packages — generator does **not** emit attribution for those), **ADR-007** (strict TS only on `main/**/*.ts` — generator is `.mjs`, outside that surface).
**NFR coupling:** NFR-03 (anti-patterns), NFR-08 (docs-freshness — `LICENSES.md` is the canonical surface and stays in sync via the gate).
**Estimated PR size:** medium per story. Story 2.1 is the biggest review (~25–30 metadata entries + 5 data-hygiene fixes + a regenerated `LICENSES.md`). Story 2.2 is small (script ~150–200 lines). Story 2.3 is small (`package.json` + 1 docs paragraph). Story 2.4 is small (1 docs section).
**Reviewer count:** 1 per story; Story 2.1 deserves a focused review on the metadata correctness.
**Test evidence required:** `npm test` green on every PR; Story 2.3 explicitly demonstrates the CI gate failing red when a metadata file is mutated and the regeneration is skipped.
**Sequencing within epic:** Story 2.1 → Story 2.2 → Story 2.3 → Story 2.4. Each story can be completed using only the previous stories' outputs (no forward dependencies). Story 2.1 leaves the repo with a complete, hand-validated `LICENSES.md` so Story 2.2 has a target to regenerate against.
**Sequencing vs. other epics:** independent of Epics 1, 3, 4, 5, 6 — touches no `main.js`, no `tests/assets/` content, no `index.d.ts`. Coordinate with Epic 1 Story 1.1 only on shared paths (`main/font/` is touched by both — bookkeeping only, no merge conflict).

### Story 2.1: Bootstrap per-folder `LICENSE.yml` metadata + regenerate `LICENSES.md` (data-hygiene fixes included)

As a **Maintainer**,
I want **per-folder `LICENSE.yml` metadata files under `main/util/`, `main/font/`, and `tests/assets/` capturing every third-party / vendored item, with the five VP-found data-hygiene issues in the existing `LICENSES.md` resolved as part of the bootstrap commit**,
So that **the next story's generator script has a complete, canonical source of truth and the bootstrap commit produces a `LICENSES.md` with no carry-over compliance gaps**.

**Pre-flight reads:**

- Canonical pre-flight set (§16 + §8 + §11 + §17 + §6).
- `_bmad-output/planning-artifacts/architecture.md` **§5 ADR-008** (full text — context, decision, alternatives, consequences, revertibility).
- `_bmad-output/planning-artifacts/architecture.md` §6 Open Q3 — the suggested 4-story split (this story is S1 of that split).
- `_bmad-output/planning-artifacts/prd-validation-report.md` §Open Q2 (table 3 — the five data-hygiene issues: `/main/uitil/filesaver.js` typo, `/main/util/clipper` wrong path, `/main/util/clippernode.js` wrong path, `/main/svgnest.js` stale entry, three `?` copyright placeholders).
- Existing `LICENSES.md` (13-line current state — input for the data-hygiene fixes).

**Files touched (expected scope):**

- Create: `main/util/LICENSE.yml`, `main/font/LICENSE.yml`, `tests/assets/LICENSE.yml` (and any other root the audit identifies, e.g. `main/util/_unused/` if vendored items live there).
- Edit: `LICENSES.md` — regenerated by hand for this bootstrap (subsequent regenerations are script-driven in Story 2.2). Five data-hygiene issues fixed; new entries from the audit added.
- Optional: `tests/assets/README.md` if the team prefers per-folder provenance link (per AC-02.3).

**Acceptance Criteria:**

**Given** the audit set in `_bmad-output/planning-artifacts/prd-validation-report.md` §Open Q2
**When** the bootstrap commit lands
**Then** `main/util/LICENSE.yml` enumerates each vendored library under `main/util/` with `path`, `name`, `license` (SPDX-style), `copyright`, `upstream_url`, optional `notes` for: `clipper.js`, `clippernode.js`, `filesaver.js`, `geometryutil.js`, `pathsegpolyfill.js`, `parallel.js`, `simplify.js`, `svgpanzoom.js`, `interact.js`, `ractive.js`, `HullPolygon.ts` (and any others the audit identifies)
**And** `main/font/LICENSE.yml` enumerates the live Lato webfont kit (`LatoLatin-{Bold,Regular,Light}.{woff,woff2}`, `lato-hai-webfont.*`, `lato-lig-webfont.*`) plus the two `@font-face` stylesheets, with SIL OFL 1.1 attribution
**And** `tests/assets/LICENSE.yml` enumerates every SIL OFL-derived SVG under `tests/assets/` with the upstream font family + SIL OFL 1.1 license + project URL.

**Given** the existing `LICENSES.md` data-hygiene issues
**When** the bootstrap commit lands
**Then** the path typo `/main/uitil/filesaver.js` is corrected to `/main/util/filesaver.js`
**And** the wrong path `/main/util/clipper` is corrected to the actual file path
**And** the wrong path `/main/util/clippernode.js` is corrected to the actual file path
**And** the stale entry `/main/svgnest.js` (file deleted) is removed
**And** the three `?` copyright placeholders are replaced with concrete attributions (or removed if no attribution can be sourced — *only* if removal is justified in the PR description).

**Given** `LICENSES.md` after the bootstrap
**When** a Sceptic (Sam-the-Sceptic) reads it
**Then** the format matches the existing convention (entry-per-third-party-item, with name + license + path + copyright + optional notes)
**And** every third-party item under `main/util/`, `main/font/`, and `tests/assets/` has an entry
**And** no actual asset file under `tests/assets/` is renamed or re-encoded as part of this story (per FR-02 AC-02.4 — avoids triggering FR-03 churn pre-emptively).

**Given** project-context.md §16 anti-pattern list
**When** the reviewer audits the PR
**Then** no new global on `window` is introduced
**And** no new IPC channel is introduced
**And** no new `// @ts-ignore` is introduced
**And** no edits are made to `main/util/_unused/` source files (only metadata for them, if any)
**And** no `--no-verify` commits are present.

### Story 2.2: Implement `scripts/build-licenses.mjs` generator script

As a **Maintainer**,
I want **a deterministic Node script under `scripts/` (or `helper_scripts/`) that walks the configured roots, reads each `LICENSE.yml`, and emits a canonical `LICENSES.md` that matches the bootstrap commit's hand-regenerated file byte-for-byte**,
So that **future additions to the third-party surface are a single-file metadata edit + one `npm run licenses:build` invocation, not a manual `LICENSES.md` rewrite**.

**Pre-flight reads:**

- Canonical pre-flight set.
- `_bmad-output/planning-artifacts/architecture.md` §5 ADR-008 (esp. items 2–3 of the Decision section + Consequences) and §3.3 (build-time-only tooling rule + `build.files` exclusion).
- The Story 2.1 commit's bootstrap `LICENSES.md` and `LICENSE.yml` files (the script's regeneration target).
- `package.json` `build.files` configuration (verify the `!{examples,helper_scripts}` exclusion covers wherever the script lands).

**Files touched (expected scope):**

- Create: `scripts/build-licenses.mjs` (or `helper_scripts/build-licenses.mjs` — choice driven by the existing `build.files` exclusion locality).
- Edit: `package.json` — add `npm run licenses:build` script entry. **Do not** add a new runtime dependency; use Node-stable `fs` + `path` only. If YAML parsing is needed, prefer a zero-dep parser inlined or a dev-only `js-yaml` (devDep, not runtime).

**Acceptance Criteria:**

**Given** the Story 2.1 bootstrap commit's `LICENSES.md` and `LICENSE.yml` files
**When** `npm run licenses:build` is invoked locally on a clean checkout
**Then** the script regenerates `LICENSES.md`
**And** the regenerated content is **byte-for-byte identical** to the committed file (idempotent on a clean tree).

**Given** the script
**When** a developer adds a new entry to one `LICENSE.yml` and re-runs `npm run licenses:build`
**Then** the regenerated `LICENSES.md` includes the new entry in the deterministic sort order (alphabetical by path, body sorted; header preserved verbatim).

**Given** ADR-008 Decision item 5 (script lives outside the packaged installer)
**When** the reviewer runs the equivalent of `npx electron-builder --dir` (or inspects the `build.files` exclusion glob)
**Then** the generator script and `LICENSE.yml` files are excluded from the packaged installer
**And** the exclusion is verified by a grep at sign-off.

**Given** ADR-007 (strict TS only on `main/**/*.ts`)
**When** the reviewer audits the PR
**Then** the script is `.mjs` (not under `main/`)
**And** `tsconfig.json` `include` is unchanged
**And** no new strict-TS surface is introduced.

**Given** project-context.md §16 anti-pattern list
**When** the reviewer audits the PR
**Then** no new IPC channel is introduced
**And** no new global on `window` is introduced
**And** no `--no-verify` commits are present
**And** no new runtime dependency is added to `package.json` `dependencies` (devDep allowed only if no zero-dep alternative).

### Story 2.3: Wire `licenses:check` into `npm test` (CI drift gate)

As a **Maintainer**,
I want **`npm run licenses:check` to regenerate the `LICENSES.md` to a temp string, diff it against the committed file, and exit non-zero on drift, hooked into the existing `npm test` invocation (no new GitHub Actions job)**,
So that **a contributor who edits a `LICENSE.yml` and forgets to re-run `npm run licenses:build` sees a red CI on the very next commit, not a delayed audit gap**.

**Pre-flight reads:**

- Canonical pre-flight set.
- `_bmad-output/planning-artifacts/architecture.md` §5 ADR-008 Decision item 3 (CI integration) + Consequences (drift resistance).
- Story 2.2's `scripts/build-licenses.mjs` (the script invoked in check mode).
- `package.json` `test` script — the existing chain into Playwright.
- `_bmad-output/project-context.md` §11 (pre-commit hook runs full Playwright on every commit; never `--no-verify`).

**Files touched (expected scope):**

- Edit: `scripts/build-licenses.mjs` (or sidecar `scripts/check-licenses.mjs`) — add a check mode that emits to a temp string, diffs against the committed `LICENSES.md`, and prints the diff + non-zero exit on drift.
- Edit: `package.json` — add `npm run licenses:check` entry, and integrate it into the `test` script (e.g. `"test": "npm run licenses:check && playwright test"`) **OR** as a pre-test hook (`pretest: "npm run licenses:check"`) — choice driven by Playwright's reporter ordering.

**Acceptance Criteria:**

**Given** the Story 2.1 + 2.2 commits with `LICENSES.md` and the generator in place
**When** `npm test` is invoked on a clean tree
**Then** `npm run licenses:check` runs first
**And** it exits with status 0 (no drift)
**And** Playwright runs after the check and produces its usual output.

**Given** a commit that modifies one `LICENSE.yml` entry without re-running `npm run licenses:build`
**When** `npm test` is invoked on that commit
**Then** `npm run licenses:check` exits with non-zero status
**And** the diff between expected (regenerated) and actual (committed) `LICENSES.md` is printed to stdout
**And** Playwright is **not** run (fail-fast).

**Given** the failure output
**When** the developer reads stderr/stdout
**Then** the message names the file path of the drifted entry (or, if not feasible, prints the full unified diff)
**And** the message hints at the resolution: `npm run licenses:build && git add LICENSES.md`.

**Given** the pre-commit hook (`project-context.md` §11)
**When** a developer commits a `LICENSE.yml` edit
**Then** the pre-commit hook chain (lint-staged → Playwright) catches the drift via the test step
**And** the developer is forced to run `npm run licenses:build` before commit succeeds
**And** no `--no-verify` is used.

**Given** the architecture overlay §3.3 (test-latency rule: build-time gates must be fast)
**When** the check is timed
**Then** `npm run licenses:check` completes in **< 1 second** on a developer laptop (deterministic file walk; no Playwright spawn).

### Story 2.4: Document the "add a new vendored library" workflow in `docs/development-guide.md`

As a **new contributor**,
I want **a section in `docs/development-guide.md` titled "Adding a new vendored library or third-party asset" that walks me through (a) creating the file under the right folder, (b) adding the `LICENSE.yml` entry, (c) running `npm run licenses:build`, (d) committing both files together**,
So that **a contributor opening their first PR doesn't trip the CI drift gate and doesn't need a maintainer to explain the contract**.

**Pre-flight reads:**

- Canonical pre-flight set (focus on §17 — brownfield caveats).
- `_bmad-output/planning-artifacts/architecture.md` §5 ADR-008 Consequences + Independent revertibility (the contract this docs section communicates).
- Existing `docs/development-guide.md` (current structure; pick the right insertion point).

**Files touched (expected scope):**

- Edit: `docs/development-guide.md` — add a new section ("Adding a new vendored library or third-party asset") with the 4-step workflow, an example `LICENSE.yml` snippet, and a cross-reference to ADR-008 (`_bmad-output/planning-artifacts/architecture.md`).

**Acceptance Criteria:**

**Given** the new section
**When** a new contributor reads it
**Then** the 4-step workflow is enumerated (file location → metadata entry → `npm run licenses:build` → single-PR commit)
**And** an example `LICENSE.yml` snippet is provided (one entry, all required fields populated)
**And** the section cross-references `_bmad-output/planning-artifacts/architecture.md` §5 ADR-008 for the design rationale
**And** the section names the failure mode of skipping step 3 (CI drift gate red on the next commit).

**Given** project-context.md §16 + NFR-08 (docs-freshness)
**When** the reviewer audits the PR
**Then** no other docs page is silently rewritten as a side effect (scope discipline)
**And** the new section's reference to `_bmad-output/project-context.md` is correct (sections cited match current header numbering).

---

## Epic 3: Test-fixture integrity gate

**Epic goal.** Add a deterministic, single-process integrity check that captures the current `tests/assets/` set + the `54/54` placement count + the `2` import-nav count and fails CI fast when those couplings drift; document the re-derivation procedure so a legitimate fixture edit is a documented two-line PR review (re-run codegen, update spec literals, update the manifest).

**FRs covered:** FR-03 (AC-03.1..AC-03.5).
**ADRs referenced:** None new. Inherits the **same enforcement pattern as ADR-008** (build-time check + CI gate via `npm test`); cross-referenced from FR-02 stories.
**NFR coupling:** **NFR-05** (capability ↔ NFR pair); NFR-01 (no perf regression introduced by the check).
**Estimated PR size:** small per story. Story 3.1 is the script + manifest. Story 3.2 is a docs section.
**Reviewer count:** 1 per story.
**Test evidence required:** Story 3.1 explicitly demonstrates the gate failing red on a deliberate fixture mutation, plus passing on the clean tree (per AC-03.5).
**Sequencing within epic:** Story 3.1 → Story 3.2.
**Sequencing vs. other epics:** independent. Coordinate with Epic 2 only on `tests/assets/README.md` (FR-02 AC-02.3 wants it for provenance; FR-03 references it for re-derivation pointers — both edits should not collide; whichever ships second updates the other's reference).

### Story 3.1: Implement `tests/assets/` integrity check + manifest, wire into `npm test`

As a **Maintainer**,
I want **a deterministic, single-process integrity check that captures the current `tests/assets/` set + the literal counts the spec depends on (`54/54` placements, `2` import-nav items) and fails CI fast when the fixture set changes without the literals being updated in the same change**,
So that **a contributor re-encoding `tests/assets/foo.svg` to fix a path issue cannot silently break the spec because the placement count drifts**.

**Pre-flight reads:**

- Canonical pre-flight set.
- `_bmad-output/planning-artifacts/architecture.md` §3.1 + §4 (FR-03 architectural constraints (a)–(d)).
- `_bmad-output/planning-artifacts/architecture.md` §3.3 (test-latency rule: deterministic, fast, single-process — **no Playwright spawn for the integrity check**).
- `_bmad-output/planning-artifacts/prd.md` §FR-03 (AC-03.1..AC-03.5).
- `tests/index.spec.ts` (current literals: `#importsnav li` count `2`, placement count `54/54`).
- `tests/assets/` (current fixture set — captured in the manifest).

**Files touched (expected scope):**

- Create: `scripts/check-test-fixtures.mjs` (or inline pre-test step in `package.json` if simpler — implementation choice between (i) checksum manifest, (ii) directory snapshot, (iii) name-list + size-list left to story author per architectural constraint (c)).
- Create: `tests/assets/.fixture-manifest.json` (or equivalent — the captured fixture set + literal counts).
- Edit: `package.json` — add `npm run test:fixtures:check` entry + integrate into `npm test` (e.g. `"test": "npm run licenses:check && npm run test:fixtures:check && playwright test"` or a `pretest` hook chain).

**Acceptance Criteria:**

**Given** the current `tests/assets/` fixture set + the spec literals (`54/54`, `2`)
**When** `npm test` is invoked on a clean tree
**Then** the integrity check runs first
**And** the check passes (per AC-03.5 — no false-positive on day one)
**And** Playwright runs after.

**Given** a commit that adds, removes, or content-changes a file under `tests/assets/`
**When** `npm test` is invoked on that commit
**Then** the integrity check exits non-zero
**And** Playwright is **not** run (fail-fast).

**Given** the failure output
**When** the developer reads stderr/stdout
**Then** the message names the **expected and observed values for *both* literals** (`#importsnav li = X (expected 2)`, `placements = N/M (expected 54/54)`)
**And** the message points the developer at the section in `docs/development-guide.md` that documents the re-derivation procedure (added in Story 3.2).

**Given** the architecture overlay §3.3 test-latency rule
**When** the check is timed
**Then** `npm run test:fixtures:check` completes in **< 1 second** on a developer laptop
**And** the implementation does **not** spawn Playwright or Electron.

**Given** project-context.md §16 anti-pattern list
**When** the reviewer audits the PR
**Then** no new IPC channel is introduced
**And** no new global on `window` is introduced
**And** no `--no-verify` commits are present
**And** no actual `tests/assets/` file is renamed or re-encoded as part of this story (the check is **read-only** over the fixture set).

### Story 3.2: Document the fixture-drift re-derivation procedure in `docs/development-guide.md`

As a **Maintainer**,
I want **a section in `docs/development-guide.md` titled "Re-deriving the test-fixture literals after a `tests/assets/` change" that walks the contributor through (a) running `npx playwright codegen` (or the existing `pw:codegen` script) to observe the new counts, (b) updating the literals in `tests/index.spec.ts`, (c) regenerating `tests/assets/.fixture-manifest.json`, (d) committing all three together as a single PR**,
So that **the failure message in Story 3.1's gate ("expected `54/54`, got `60/60`, update spec literals") is actionable in two lines of review**.

**Pre-flight reads:**

- Canonical pre-flight set.
- `_bmad-output/planning-artifacts/architecture.md` §3.1 + §4 (FR-03 architectural constraint (d) — `tests/assets/README.md` coordination with FR-02).
- `_bmad-output/planning-artifacts/prd.md` §FR-03 AC-03.4.
- Existing `docs/development-guide.md` (current structure).
- `package.json` `pw:codegen` script entry (the codegen helper that re-derives counts).

**Files touched (expected scope):**

- Edit: `docs/development-guide.md` — add the re-derivation section.
- Optional: `tests/assets/README.md` — if not added by Epic 2 Story 2.1, add a stub here pointing at the development-guide section. Coordinate with FR-02 to avoid double-write.

**Acceptance Criteria:**

**Given** the new section
**When** a contributor reads it after seeing a red CI from Story 3.1's gate
**Then** the 4-step procedure is enumerated (codegen → update literals → regenerate manifest → single-PR commit)
**And** the section cross-references `tests/index.spec.ts` (the file holding the literals) and `tests/assets/.fixture-manifest.json` (the file the manifest update lands in)
**And** the section names the codegen invocation (`npm run pw:codegen` or equivalent).

**Given** the gate failure message in Story 3.1
**When** the reviewer follows the pointer
**Then** the pointer resolves to the new docs section
**And** the section's first paragraph explains *why* the gate exists (Marco-the-Maintainer fixture-drift journey).

**Given** project-context.md §16 + NFR-08 (docs-freshness)
**When** the reviewer audits the PR
**Then** no unrelated docs page is rewritten
**And** the section's references are accurate (citing current section numbers in `_bmad-output/project-context.md`).

---

## Epic 4: Background-worker shutdown safety

**Epic goal.** Resolve the two `// todo:` shutdown sites in `main.js` (around `background-response` and `background-progress`) by introducing a module-scoped `app.shuttingDown` sentinel set in `app.before-quit` and read first-statement in each handler; preserve `winCount = 1` (FR-07 is Phase 2); collect 15/15 manual-repro evidence per NFR-02 (5 runs × 3 exit paths) and attach it to the PR. The sentinel is the **shutdown idiom for `main.js`** going forward (codified in ADR-009).

**FRs covered:** FR-04 (AC-04.1..AC-04.5).
**ADRs referenced:** **ADR-009** (binding for the entire epic) — sentinel + bounded try/catch boundary, anchored on `app.before-quit`. Cross-references: ADR-001 (multi-process compute) preserved; `project-context.md` §6 (`background-stop` semantics) preserved; `project-context.md` §8.4 (scratch-dir cleanup on `app.before-quit`) preserved — sentinel is set before the existing purge runs.
**NFR coupling:** **NFR-02** (capability ↔ NFR pair, 15/15 trials × 3 exit paths); NFR-01 (no perf regression); NFR-06 (no `BrowserWindow` constructor change — invariant preserved).
**Estimated PR size:** Story 4.1 is small in code surface (3 short edits in `main.js`) but **medium in review weight** (the sentinel pattern + the `before-quit` race reasoning needs a careful read). Story 4.2 is small (15 manual reproductions + a brief evidence write-up).
**Reviewer count:** 1 per story; Story 4.1 reviewer should re-read ADR-009 first.
**Test evidence required:** Story 4.2 produces the **15/15 trial evidence** that gates AC-04.2 / AC-04.3 acceptance.
**Sequencing within epic:** Story 4.1 → Story 4.2 (Story 4.2 cannot run without Story 4.1's code in place).
**Sequencing vs. other epics:** **only MVP epic that touches `main.js`** (per architecture overlay §6 Open Q1 confirmation). No other MVP epic competes for `main.js` merge surface — schedule freely. **Phase 2 FR-07 must land strictly after this epic** per PRD hard-dep + ADR-009 §Independent revertibility.

### Story 4.1: Implement `app.shuttingDown` sentinel + bounded try/catch boundary in `main.js`

As a **primary user (Riya)**,
I want **the application's two `// todo:` shutdown sites in `main.js` (around `background-response` and `background-progress`) to short-circuit cleanly when the app is shutting down so that NFP-cache state stays consistent across all three exit paths (graceful quit, in-app cancel, OS-level kill)**,
So that **a kill-during-nest does not leak orphaned scratch dirs under `os.tmpdir()/nfpcache` and the next nest computes correctly**.

**Pre-flight reads:**

- Canonical pre-flight set.
- `_bmad-output/planning-artifacts/architecture.md` **§5 ADR-009** (full text — context, decision, alternatives, consequences, revertibility — esp. items 1–5 of the Decision section + the bounded try/catch boundary explanation).
- `_bmad-output/planning-artifacts/architecture.md` §3.1 (FR-04 row) + §4 (FR-04 architectural constraints (a)–(e)).
- `_bmad-output/planning-artifacts/architecture.md` §6 Open Q2 (revert recipe — preserve site locality so FR-07 reverts cleanly).
- `_bmad-output/project-context.md` §3 (process / window topology — read before touching `main.js`).
- `_bmad-output/project-context.md` §6 (IPC contract — `background-stop` semantics preserved; no new IPC channel).
- `_bmad-output/project-context.md` §8.4 (scratch-dir cleanup on `app.before-quit`).
- `_bmad-output/project-context.md` §8.5 (`EventEmitter.defaultMaxListeners = 30` cap).
- `main.js` (current state — locate the two `// todo:` sites + the `app.before-quit` handler + `createBackgroundWindows()`).

**Files touched (expected scope):**

- Edit: `main.js` only. Three sites:
  1. Sentinel declaration (top of `main.js`, before any handler bindings — module-scoped boolean, e.g. `let appShuttingDown = false`).
  2. `app.on('before-quit', ...)` — set the sentinel to `true` as the first statement (before the existing scratch-dir purge).
  3. The two `// todo:` `ipcMain.on` handlers (`background-response`, `background-progress`) — first statement of each is the sentinel check (`if (appShuttingDown) return`). Replace `// todo:` markers with `// fr-04:` comments to mark the resolution.

**Acceptance Criteria:**

**Given** the current `main.js` with the two `// todo:` sites
**When** the PR is applied
**Then** a module-scoped sentinel boolean is declared at the top of `main.js`
**And** `app.on('before-quit', ...)` sets the sentinel to `true` as its first statement
**And** the `background-response` handler checks the sentinel as its first statement and returns early when `true`
**And** the `background-progress` handler checks the sentinel as its first statement and returns early when `true`
**And** the original `// todo:` markers are removed (replaced with `// fr-04:` resolution comments).

**Given** AC-04.4 (the `winCount = 1` invariant)
**When** the reviewer reads the PR
**Then** `createBackgroundWindows()` is **not** modified
**And** the `winCount` literal remains `1`
**And** the `background-start` round-robin matching is **not** modified.

**Given** the IPC contract (`project-context.md` §6 + ADR-009 Decision item 5)
**When** the reviewer audits the PR
**Then** no new IPC channel is added to `main/ui/types/index.ts` `IPC_CHANNELS`
**And** the `background-response` / `background-progress` / `background-stop` channel names and payloads are unchanged
**And** the `background-stop` (in-app cancel) handler retains its existing destroy + recreate semantics — the sentinel does **not** apply to `background-stop` (the app is not shutting down, only the workers are).

**Given** project-context.md §8.4 (scratch-dir cleanup on `app.before-quit`)
**When** the reviewer reads the `before-quit` handler
**Then** the sentinel is set **before** the existing scratch-dir / nfpcache purge runs
**And** the existing purge logic is preserved verbatim
**And** no new cleanup path is introduced.

**Given** project-context.md §16 anti-pattern list
**When** the reviewer audits the PR
**Then** no new global on `window` is introduced
**And** no new `// @ts-ignore` is introduced
**And** no `--no-verify` commits are present
**And** no edits to vendored utilities (`clipper.js`, `simplify.js`, etc.) are present
**And** no edits to `main/util/_unused/` are present.

**Given** the canonical Playwright spec (`tests/index.spec.ts`)
**When** `npm test` runs on the PR
**Then** the test passes
**And** placement count remains `54/54`
**And** no new flakiness is introduced (per AC-04.5).

### Story 4.2: NFR-02 manual-repro evidence — 15/15 trials across 3 exit paths

As a **reviewer (Murat / Winston)**,
I want **the FR-04 PR description to include the 15/15 manual-repro evidence (5 runs each across graceful quit, in-app `background-stop` cancel, OS-level kill) demonstrating no NFP-cache corruption and no `EventEmitter` listener-cap warning**,
So that **NFR-02 acceptance is verifiable from the PR alone — no separate after-the-fact gate**.

**Pre-flight reads:**

- Canonical pre-flight set.
- `_bmad-output/planning-artifacts/prd.md` §NFR-02 (15/15 trials definition + the listener-cap guard).
- `_bmad-output/planning-artifacts/architecture.md` §5 ADR-009 Consequences (`+` improvements expected; the testability cost is acknowledged — manual repro is the contract).
- `_bmad-output/planning-artifacts/architecture.md` §7 (overlay-specific risks: ADR-009 sentinel race during in-flight `background-stop` followed by `before-quit` in quick succession — the implementation comment should note this is bounded by single-process EventLoop ordering).
- Story 4.1's PR / commit (the code under test).

**Files touched (expected scope):**

- This story produces **evidence**, not code. Evidence is attached to the Story 4.1 PR description (or to a follow-up PR if Story 4.1 lands separately for reviewability) as a structured table:

  | Trial | Exit path | Outcome | Listener count post-relaunch | NFP-cache state |
  |---|---|---|---|---|
  | 1 | Graceful quit during nest | PASS | ≤ 30 | clean |
  | 2 | Graceful quit during nest | PASS | ≤ 30 | clean |
  | … | … | … | … | … |
  | 15 | OS-level kill during nest | PASS | ≤ 30 | clean |

- Optional: a short prose note on any observed quirks (e.g. on Linux vs. Windows, since CI matrix runs both).

**Acceptance Criteria:**

**Given** Story 4.1's code is in place
**When** the manual repro is executed
**Then** **5 trials × 3 exit paths = 15/15 trials pass** with the criteria from NFR-02 (no NFP-cache corruption; no orphaned `os.tmpdir()/nfpcache` directories beyond the one cleared on `app.before-quit`; next nest completes correctly).

**Given** the listener-cap guard (`EventEmitter.defaultMaxListeners = 30`)
**When** the post-trial console output is inspected
**Then** **no listener-cap warning** appears across all 15 trials
**And** the listener count is recorded for each trial.

**Given** the evidence table is included in the PR description (Story 4.1 PR or a follow-up evidence PR)
**When** the reviewer reads it
**Then** the table enumerates 15 trials with PASS for each
**And** the table identifies the OS / Node version each trial ran on
**And** any observed anomaly (even non-failing) is noted in prose.

**Given** the architecture overlay §7 risk note (sentinel race during `background-stop` immediately followed by `before-quit`)
**When** the trial set covers this sequence (at least 1 trial)
**Then** the trial passes
**And** the result is noted explicitly in the evidence table.

---

## Epic 5: `SvgParserInstance` type-gap closure

**Epic goal.** Extend `SvgParserInstance` in `index.d.ts` to declare `transformParse` and `polygonifyPath` matching the actual call-site signatures in `main/deepnest.js`; preserve the `tsconfig.json` single-topology and the strict-TS-on-`main/**/*.ts`-only invariant (ADR-007); zero new `// @ts-ignore`. Single PR; type-only delta.

**FRs covered:** FR-05 (AC-05.1..AC-05.3).
**ADRs referenced:** None new. **Preserves ADR-005** (no new globals on `window`; `index.d.ts` is the only legitimate growth surface) and **ADR-007** (strict TS only on `main/**/*.ts`; `tsconfig.json` `include` not extended).
**NFR coupling:** NFR-03 (anti-patterns); no perf concern.
**Estimated PR size:** very small (~10 lines of type declarations + reading the call sites). Reviewer count: 1.
**Test evidence required:** `tsc --noEmit` over `main/**/*.ts` + `main/ui/**/*.ts` zero new errors; `npm test` green.
**Sequencing:** independent of all other MVP epics; touches only `index.d.ts` (and optionally `main/ui/types/index.ts` if `SvgParserInstance` is also referenced there).

### Story 5.1: Add `transformParse` and `polygonifyPath` to `SvgParserInstance` in `index.d.ts`

As a **Maintainer working on `main/deepnest.js`**,
I want **`index.d.ts` to declare `transformParse` and `polygonifyPath` on `SvgParserInstance` with signatures matching the actual call sites, so that `tsc --noEmit` over `main/**/*.ts` + `main/ui/**/*.ts` passes with zero new errors and zero new `// @ts-ignore` directives**,
So that **the gap is closed by extending the type, not by deleting the call (per AC-05.3 and `project-context.md` §7)**.

**Pre-flight reads:**

- Canonical pre-flight set.
- `_bmad-output/project-context.md` §7 — data model invariants (`index.d.ts` is canonical).
- `_bmad-output/project-context.md` §10 — TypeScript / language rules (`lib`/`target` invariants; single-topology `tsconfig.json` preserved).
- `_bmad-output/planning-artifacts/architecture.md` §3.1 (FR-05 row) + §4 (FR-05 architectural constraints (a)–(d)).
- `_bmad-output/planning-artifacts/prd.md` §FR-05 (AC-05.1..AC-05.3).
- `index.d.ts` (current `SvgParserInstance` type — the surface to extend).
- `main/deepnest.js` (the call sites for `transformParse` and `polygonifyPath` — read each one before authoring the signature, per AC-05.3).
- `main/ui/types/index.ts` (verify whether `SvgParserInstance` is referenced there; if so, the type extension may need to be reflected — verify before edit).

**Files touched (expected scope):**

- Edit: `index.d.ts` — extend `SvgParserInstance` interface with `transformParse(...)` and `polygonifyPath(...)` declarations matching the call-site signatures in `main/deepnest.js`.
- Optional edit: `main/ui/types/index.ts` — only if `SvgParserInstance` is referenced there and needs the same extension.

**Acceptance Criteria:**

**Given** the current `index.d.ts` `SvgParserInstance` interface
**When** the PR is applied
**Then** `transformParse` is declared on `SvgParserInstance` with a signature matching its call sites in `main/deepnest.js`
**And** `polygonifyPath` is declared on `SvgParserInstance` with a signature matching its call sites in `main/deepnest.js`
**And** the signatures are derived from reading the call sites (per AC-05.3 — the gap is closed by extending the type, not by deleting the call).

**Given** `tsc --noEmit` over `main/**/*.ts` + `main/ui/**/*.ts`
**When** the type-check is invoked on the PR
**Then** the type-check passes with **zero new errors** (relative to the pre-PR baseline)
**And** **zero new `// @ts-ignore` directives** are introduced (anti-pattern §16.8).

**Given** `tsconfig.json` (single-topology per `project-context.md` §10)
**When** the reviewer audits the PR
**Then** `tsconfig.json` is **not** modified
**And** no new `tsconfig.app.json` / `tsconfig.test.json` / `tsconfig.node.json` is added
**And** `lib` and `target` are unchanged (the new signatures use only project-internal types — no new lib needed).

**Given** ADR-005 (globals on `window` — DeepNest, SvgParser, config, nest)
**When** the reviewer audits the PR
**Then** no new global is added to `window`
**And** the existing `SvgParser` global's surface is extended only via the type declaration (not via runtime code).

**Given** the canonical Playwright spec
**When** `npm test` runs on the PR
**Then** the test passes (no runtime change; type-only delta)
**And** placement count remains `54/54`.

**Given** project-context.md §16 anti-pattern list
**When** the reviewer audits the PR
**Then** no new IPC channel is introduced
**And** no new `// @ts-ignore` is introduced
**And** no `--no-verify` commits are present
**And** no call site in `main/deepnest.js` is removed or "fixed" to side-step the type extension (per AC-05.3 explicit guard from `project-context.md` §7).

---

## Epic 6: Anti-pattern preservation rails

**Epic goal.** Add (or update) `.github/pull_request_template.md` so that every PR's review surface is anchored on the 16 anti-patterns in `_bmad-output/project-context.md` §16; document the reviewer's "cite the §16 item number" workflow so contributors can resolve concerns in a single-line lookup. **Lays the rails for the FR-06 gate against which Epics 1–5 are measured.** This epic should ship **first** in the MVP sprint so subsequent PRs have the template to fill in.

**FRs covered:** FR-06 (AC-06.1..AC-06.6).
**ADRs referenced:** None new. **Preserves the binding rule** that `project-context.md` §16 is the canonical anti-pattern list (per architecture overlay §2 + every other MVP story's pre-flight set).
**NFR coupling:** **NFR-03** (capability ↔ NFR pair — PR-template checklist is the measurement surface for "zero ticked-as-violated"); NFR-08 (docs-freshness — the template's reference to §16 must stay valid when GPC is updated; covered in Story 6.2).
**Estimated PR size:** small per story. Story 6.1 is the template file itself. Story 6.2 is a short docs / contributor-guide update.
**Reviewer count:** 1 per story.
**Test evidence required:** None (process delta, no code surface). Sign-off is "the template exists and the reviewer-checklist workflow is documented".
**Sequencing within epic:** Story 6.1 → Story 6.2.
**Sequencing vs. other epics:** **should ship first** in the sprint so Epics 1–5 PRs use the template from day one. If a sequencing constraint forces it later, Epics 1–5 PR descriptions should still embed the 16-item check inline as a placeholder for the template.

### Story 6.1: Add `.github/pull_request_template.md` anchored on `project-context.md` §16

As a **reviewer of any MVP-phase PR**,
I want **`.github/pull_request_template.md` to enumerate the 16 anti-patterns from `_bmad-output/project-context.md` §16 as a checkable list (or as a single "I have read §16 and verified none of the 16 items is violated" checkbox with the §16 item numbers cited in the body)**,
So that **the FR-06 / NFR-03 gate is measurable from the PR view alone, with zero ticked-as-violated allowed before approval**.

**Pre-flight reads:**

- Canonical pre-flight set.
- `_bmad-output/planning-artifacts/architecture.md` §3.1 (FR-06 row) + §4 (FR-06 architectural constraints (a)–(c)).
- `_bmad-output/planning-artifacts/prd.md` §FR-06 (AC-06.1..AC-06.6) and §NFR-03.
- `_bmad-output/project-context.md` §16 — full anti-pattern list (16 items; the template's source of truth).
- `_bmad-output/project-context.md` §11 — pre-commit hook / no-`--no-verify` rule (anti-pattern §16.9).
- Existing `.github/pull_request_template.md` (if present; if absent, create from scratch).

**Files touched (expected scope):**

- Create or edit: `.github/pull_request_template.md`. Two acceptable shapes (FR-06 architectural constraint (a) wording — either is fine):
  1. **Per-anti-pattern checklist** — one checkbox per §16 item, ticked as "not violated" by the contributor before requesting review.
  2. **Single attestation checkbox** — "I have read `_bmad-output/project-context.md` §16 and verified none of the 16 items is violated" + a link to §16 in the body.
- Either shape MUST include: (a) the §16 link / reference, (b) explicit pre-flight reminders for §16, §8, §11, §17, §6 (the canonical pre-flight set), (c) a "Touched files" section so the reviewer can quickly verify the change scope, (d) a "Test evidence" section so PRs that need NFR-02 / NFR-01 evidence have a placeholder.

**Acceptance Criteria:**

**Given** the new / updated PR template
**When** a contributor opens a new PR
**Then** the template body is auto-populated
**And** the §16 anti-pattern reference (link or checkbox set) is present in the template
**And** the canonical pre-flight read list (§16, §8, §11, §17, §6) is named in the template
**And** the "Touched files" + "Test evidence" sections are present.

**Given** the FR-06 ACs (AC-06.1..AC-06.6)
**When** the reviewer applies the template's checklist to any of the six listed AC areas
**Then** each AC is verifiable from the PR view alone (no new global on `window`, no new IPC channel, no new `// @ts-ignore`, no `--no-verify`, no edits to vendored utilities or `_unused/`, no mm/inch double-conversion regression).

**Given** NFR-03 (PR-template checklist; zero ticked-as-violated allowed)
**When** the reviewer counts violations
**Then** the template makes the count trivial — explicit checkboxes (or a single attestation) with §16 item-number citation
**And** the merge-block rule is documented in the template body (any ticked-as-violated → request changes, not approve).

**Given** project-context.md §16 + NFR-08 (docs-freshness)
**When** the reviewer audits the PR
**Then** the template's §16 reference is correct (current section number — verify against `_bmad-output/project-context.md` `## 16. Critical anti-patterns`)
**And** no other docs page is silently rewritten as a side effect.

### Story 6.2: Document the "cite the §16 item number" reviewer workflow in `docs/development-guide.md`

As a **new contributor whose PR was flagged for an anti-pattern violation**,
I want **a short section in `docs/development-guide.md` titled "Resolving an anti-pattern flag in PR review" that explains the reviewer's "cite the §16 item number" convention (e.g. "§16.1 — no new globals on window" → "rename your `window.thing` to a local module export and re-request review")**,
So that **a contributor can resolve the flag in a single-line lookup, not a multi-thread back-and-forth**.

**Pre-flight reads:**

- Canonical pre-flight set.
- `_bmad-output/planning-artifacts/prd.md` §FR-06 + §NFR-03.
- `_bmad-output/planning-artifacts/architecture.md` §4 (FR-06 architectural constraint (c) — reviewer can cite the exact §16 item number).
- `_bmad-output/project-context.md` §16 — the full list, for the example mappings.
- Existing `docs/development-guide.md` (current structure; pick the right insertion point — after the "Adding a new vendored library" section from Epic 2 Story 2.4 if it exists, otherwise create the appropriate section).

**Files touched (expected scope):**

- Edit: `docs/development-guide.md` — add the "Resolving an anti-pattern flag in PR review" section.

**Acceptance Criteria:**

**Given** the new section
**When** a contributor reads it after a PR review flag
**Then** the section explains the "§16.X — short label" convention
**And** the section provides 2–3 concrete examples (e.g. §16.1 / §16.8 / §16.9 — most-likely flags during MVP)
**And** each example shows the reviewer's flag wording + the contributor's resolution path.

**Given** Story 6.1's PR template
**When** the reviewer flags a violation
**Then** the reviewer cites the §16 item number (per FR-06 architectural constraint (c))
**And** the contributor follows the docs section to resolve in one line.

**Given** project-context.md §16 + NFR-08 (docs-freshness)
**When** the reviewer audits the PR
**Then** the section's §16 references are accurate (citing current item numbers)
**And** no unrelated docs page is rewritten.

---

## Final Validation Summary

> **Step-04 validation completed in this artefact.** The five validation lenses from `step-04-final-validation.md` are applied below.

### 1. FR Coverage Validation

Every MVP FR is covered by exactly one epic, with at least one story per FR:

| FR | Epic | Story count | All ACs covered? |
|---|---|---|---|
| FR-01 | Epic 1 | 1 | ✅ AC-01.1..AC-01.5 |
| FR-02 | Epic 2 | 4 | ✅ AC-02.1..AC-02.4 + VP data-hygiene |
| FR-03 | Epic 3 | 2 | ✅ AC-03.1..AC-03.5 |
| FR-04 | Epic 4 | 2 | ✅ AC-04.1..AC-04.5 + NFR-02 evidence |
| FR-05 | Epic 5 | 1 | ✅ AC-05.1..AC-05.3 |
| FR-06 | Epic 6 | 2 | ✅ AC-06.1..AC-06.6 |
| **Totals** | **6 epics** | **12 stories** | **All ACs accounted for** |

**FR-07 / FR-08 absent from MVP** — verified. No story references either.

### 2. Architecture Implementation Validation

- **No starter template** — confirmed in PRD §Project Classification + architecture overlay (brownfield slice). Epic 1 Story 1 is correctly **not** a "set up project from starter template" story.
- **Database / entity creation** — N/A (no database; no entity model in the slice).
- **Build-time tooling locality** — Epics 2 + 3 add build-time scripts under `scripts/` (or `helper_scripts/`); both are excluded from the packaged installer per the existing `build.files` rule. Verified via the architecture overlay §3.3 cross-cutting concerns.
- **`main.js` sequencing** — only Epic 4 touches `main.js`; rule from architecture overlay §6 Open Q1 is satisfied vacuously in MVP.

### 3. Story Quality Validation

Each story is:
- ✅ Completable by a single dev agent.
- ✅ Has clear AC in Given/When/Then format with file-level scope.
- ✅ References specific FRs + ADRs + `project-context.md` §16 + relevant deep-dive sections.
- ✅ No forward dependencies (every story can be completed using only previous stories' outputs — see §5 below).
- ✅ Includes the canonical pre-flight read list embedded explicitly per story.

### 4. Epic Structure Validation

- ✅ Epics deliver user value (per the four PRD personas: Riya happy-path / Riya interrupted / Marco fixture-drift / Sam supply-chain). Each FR-driven epic maps to at least one persona's journey.
- ✅ Foundation stories only set up what they need (no big upfront technical work).
- ✅ Dependencies flow naturally — Epic 6 (PR template) ships first to lay rails; Epics 1–5 then ride the template through review.

### 5. Dependency Validation

**Epic Independence:**

- Each epic delivers complete functionality for its FR. No epic requires another epic to function.
- The only inter-epic coordination items (not dependencies) are **bookkeeping-only**:
  - Epic 1 Story 1.1 + Epic 2 Story 2.1 both touch `main/font/` (Epic 1 deletes assets; Epic 2 catalogues them) — whichever ships second updates the other's reference.
  - Epic 2 Story 2.1 + Epic 3 Story 3.2 both potentially edit `tests/assets/README.md` — whichever ships second updates / extends the file.

**Within-Epic Story Dependencies:**

- **Epic 2 (4 stories):** Story 2.1 → 2.2 → 2.3 → 2.4. Story 2.2 needs Story 2.1's metadata + bootstrap `LICENSES.md` to validate against; Story 2.3 needs Story 2.2's script; Story 2.4 documents the workflow Stories 2.1–2.3 establish. No forward dependencies.
- **Epic 3 (2 stories):** Story 3.1 → 3.2. Story 3.2 documents Story 3.1's gate. No forward dependencies.
- **Epic 4 (2 stories):** Story 4.1 → 4.2. Story 4.2 produces evidence against Story 4.1's code. No forward dependencies.
- **Epic 6 (2 stories):** Story 6.1 → 6.2. Story 6.2 documents Story 6.1's template. No forward dependencies.

**No epic — and no story — depends on a future story.** Sprint can execute Epics 1–6 in any order (subject to the recommendation that Epic 6 ship first to lay rails).

### 6. Pre-MVP-Sprint IR Gates Status

- **Gate G-1 (NFR-01 baseline):** Open. Owned by **TEA (Murat)**. Persistence: `_bmad-output/planning-artifacts/nfr01-baseline.json`. Procedure documented in this artefact + architecture overlay §8.
- **Gate G-2 (IR pre-condition checklist):** Most pre-conditions satisfied by *this artefact*. Pre-condition #3 (NFR-01 baseline file) is gated by G-1; pre-condition #7 (PR template) is gated by Epic 6 shipping.

---

## References

### Source-of-truth documents

- `_bmad-output/planning-artifacts/prd.md` (DEE-47 CP) — capability contract.
- `_bmad-output/planning-artifacts/prd-validation-report.md` (DEE-48 VP) — must-absorb findings (FR-02 expansion, NFR-01 deferral).
- `_bmad-output/planning-artifacts/architecture.md` (DEE-49 CA) — MVP architecture overlay (ADR-008, ADR-009, per-FR architecture, NFR-01 baseline gate, IR pre-conditions).
- `_bmad-output/project-context.md` (DEE-46 GPC) — primary context; §16 anti-pattern list is binding for every MVP PR.
- `docs/architecture.md` — anchor (ADR-001..007 preserved verbatim; this slice does not modify it).
- `docs/asset-inventory.md` — Epic 1's input + output surface.
- `docs/development-guide.md` — Epic 2 / 3 / 6 docs surface.

### BMad chain status (post this artefact)

| Step | Skill | Owner | Output | Status |
|---|---|---|---|---|
| 1 | DP — `bmad-document-project` | Paige | `docs/` corpus | **Done** (DEE-45, merged) |
| 2 | GPC — `bmad-generate-project-context` | Paige | `_bmad-output/project-context.md` | **Done** (DEE-46, merged) |
| 3 | CP — `bmad-create-prd` | John | `prd.md` | **Done** (DEE-47, merged) |
| 4 | VP — `bmad-validate-prd` | John | `prd-validation-report.md` (CONCERNS) | **Done** (DEE-48, merged) |
| 5 | CA — `bmad-create-architecture` | Winston | `architecture.md` | **Done** (DEE-49, merged) |
| (CU skipped) | — | — | — | Per PRD §UX Scope |
| 6 | **CE — `bmad-create-epics-and-stories`** | **Winston** | **This document** | **This step** (DEE-50) |
| 7 | IR — `bmad-check-implementation-readiness` | Winston | PASS / CONCERNS / FAIL | **Next** (DEE-51, branched off post-CE integration) |
| Pre-MVP-sprint gate | NFR-01 baseline capture | TEA (Murat) | `nfr01-baseline.json` | **Open** (Gate G-1) |

### Open questions for IR (DEE-51)

These are intentionally surfaced for IR's pre-condition checklist (architecture overlay §9):

1. **Pre-condition #3** — `_bmad-output/planning-artifacts/nfr01-baseline.json` does not exist yet. IR must verify the file is present before returning PASS. **Owner:** TEA (Murat). **Block on FAIL.**
2. **Pre-condition #7** — `.github/pull_request_template.md` must reference `_bmad-output/project-context.md` §16. Satisfied when **Epic 6 ships**, not before. IR may return CONCERNS if the template is absent at IR time but Epic 6 is queued; FAIL only if Epic 6 is dropped from the sprint.
3. **Coordination items between Epics 1 + 2 (`main/font/`) and Epics 2 + 3 (`tests/assets/README.md`)** — bookkeeping only; IR should note them but not gate on them.
4. **Story-author-time naming** — the sentinel name in ADR-009 (`app.shuttingDown` or `appShuttingDown` or equivalent) is finalised in Epic 4 Story 4.1. IR may verify the chosen name is documented in the PR description.

### Estimated total MVP PR size (rough)

| Epic | Story count | Code-LOC estimate | Docs-LOC estimate | Notes |
|---|---|---|---|---|
| 1 | 1 | ~10 deletions | ~20 (asset-inventory edit) | File deletes dominate |
| 2 | 4 | ~250 (script + metadata YAML) | ~80 (dev-guide section) | Story 2.1 dominates review weight |
| 3 | 2 | ~150 (check script + manifest JSON) | ~60 (dev-guide section) | Fast-path script |
| 4 | 2 | ~30 (sentinel + 2 handler edits) | ~30 (PR-description evidence table) | Code small, evidence weight medium |
| 5 | 1 | ~10 (type declarations) | 0 | Trivial diff |
| 6 | 2 | 0 | ~120 (PR template + dev-guide section) | Pure process delta |
| **Totals** | **12 stories** | **~450 LOC code** | **~310 LOC docs** | **6 PRs minimum if 1 PR per epic; 12 if 1 per story** |

**Recommended PR cadence:** **one PR per story** (12 PRs total) to preserve single-PR-review sizing per PRD §Project Scoping. Epic 4's Stories 4.1 + 4.2 may bundle into one PR (code + evidence in the same description) at the implementer's discretion.

---

*End of `_bmad-output/planning-artifacts/epics.md`. Authored by Winston (BMAD Architect) on 2026-04-26.*
