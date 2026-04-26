# Story 6.1: Add `.github/pull_request_template.md` anchored on `project-context.md` §16

Status: ready-for-dev

> Authored by John (PM, BMad) on 2026-04-26 via `bmad-create-story` for **MVP-1 / Stream C head**. Sprint plan reference: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row C1 (pulled to the front of Stream C). Epic anchor: `_bmad-output/planning-artifacts/epics.md` §"Story 6.1" lines 775–818.

---

## Story

As a **reviewer of any MVP-phase PR**,
I want **`.github/pull_request_template.md` to enumerate the 16 anti-patterns from `_bmad-output/project-context.md` §16 as a checkable list (or as a single "I have read §16 and verified none of the 16 items is violated" checkbox with the §16 item numbers cited in the body)**,
so that **the FR-06 / NFR-03 gate is measurable from the PR view alone, with zero ticked-as-violated allowed before approval**.

**Sprint role.** This story is the **head of Stream C** in the MVP-1 sprint plan, **pulled to the front of stream C** because the IR CONCERNS for Pre-condition #7 (PR template anchored on §16) should land as early in the sprint as possible — every subsequent PR in MVP-1 then reviews itself against the §16 checklist. **Mitigates IR CONCERNS Pre-condition #7** (per implementation-readiness-report verdict + sprint-plan §2 row #7).

**FR/AC coverage:** FR-06 (PRD §FR-06) — AC-06.1 .. AC-06.6.
**ADRs preserved (no new ADR introduced):** Preserves the binding rule that `_bmad-output/project-context.md` §16 is the canonical anti-pattern list (per architecture overlay §2 + every other MVP story's pre-flight set). Preserves ADR-005 (no new globals on `window`).
**NFR coupling measured:** NFR-03 (capability ↔ NFR pair — PR-template checklist is the measurement surface for "zero ticked-as-violated"); NFR-08 (docs-freshness — the template's reference to §16 must stay valid when GPC is updated; Story 6.2 documents the maintenance loop).

---

## Acceptance Criteria

1. **AC-06.1 (template-side) — File created at the canonical path.** `.github/pull_request_template.md` exists at the repo root's `.github/` folder. GitHub auto-populates the PR description from this file for every new PR (verified post-merge by opening a draft PR against `main`).

2. **AC-06.2 (template-side) — §16 anti-pattern list is the spine.** The template either (a) enumerates **all 16 anti-patterns** as individual checkboxes (one per item, ticked as "not violated" by the contributor before requesting review), **or** (b) carries a single attestation checkbox (`- [ ] I have read \`_bmad-output/project-context.md\` §16 and verified none of the 16 items is violated`) with the **16 item numbers** named inline in the body so a reviewer can cite the exact item in a comment. **Either shape is acceptable per architecture overlay §4 FR-06 (a). Recommendation: ship shape (a) — it is more measurable and matches NFR-03's "zero ticked-as-violated" wording verbatim.**

3. **AC-06.3 — Pre-flight read reminder is present.** The template names the canonical pre-flight set (`§16, §8, §11, §17, §6` of `_bmad-output/project-context.md`) and links the contributor to that file. The reminder is positioned **above** the §16 checklist so a contributor opening their first PR sees it before the checkboxes.

4. **AC-06.4 — "Touched files" section is present.** The template carries a "Touched files" section (or "Scope of change") so the reviewer can quickly verify the change scope. Free-text; the contributor pastes / lists the changed paths or an `git diff --stat` summary.

5. **AC-06.5 — "Test evidence" section is present.** The template carries a "Test evidence" section as a placeholder for: `npm test` exit code, NFR-01 wall-clock vs. baseline (for any PR that touches `main/`, `tests/`, or `package.json`), NFR-02 manual-repro evidence (for FR-04 PRs), and the explicit drift-gate transcripts (for FR-02 / FR-03 PRs). Free-text; PRs without applicable evidence write "N/A — story does not require test evidence beyond `npm test` green".

6. **AC-06.6 — Merge-block rule is documented in the template.** The template body explicitly states: **"any anti-pattern checkbox ticked as violated → request changes, not approve"**. NFR-03 measures "zero ticked-as-violated"; the template makes the rule legible to first-time reviewers.

7. **AC-06.7 — All six FR-06 ACs are verifiable from the PR view.** Per architecture overlay §3.1 row FR-06: the template's checklist makes each of AC-06.1..AC-06.6 (PRD §FR-06) verifiable from the PR view alone — no new global on `window` (AC-06.1 / §16.1), no new IPC channel (AC-06.2 / §16.3), no new `// @ts-ignore` (AC-06.3 / §16.8), no `--no-verify` (AC-06.4 / §16.9), no edits to vendored utilities or `_unused/` (AC-06.5 / §16.5–§16.6), no mm/inch double-conversion regression (AC-06.6 / §16.11). **The 16-item template covers all six PRD ACs because §16 is a superset.**

8. **AC-06.8 — §16 references resolve.** The template's links / section numbers cite the **current** `_bmad-output/project-context.md` `## 16. Critical anti-patterns` heading. Verify by `grep -n "## 16. Critical anti-patterns" _bmad-output/project-context.md` resolving cleanly. Each numbered item in the template (§16.1 .. §16.16) maps 1:1 to the numbered list in the source file.

9. **AC-06.9 — Reviewer "cite the §16 item number" workflow is implicit.** The template's checkbox labels each begin with `§16.X — <one-line label>` so a reviewer flagging a violation can write `§16.1 — new \`window\` global introduced; please remove` and the contributor knows exactly which item to look up. **Story 6.2 documents the explicit reviewer convention; this story makes the affordance present.**

10. **AC-06.10 — `project-context.md` §16 anti-patterns hold for *this* PR.** No new global on `window`, no new IPC channel, no new `// @ts-ignore`, no `--no-verify` commits, no edits to vendored utilities, no edits to `main/util/_unused/`. *This story is template-only (no code surface), so the audit is largely vacuous — but the implementing dev still applies the audit to themselves as the first user of the new template.*

11. **AC-06.11 — `npm test` regression-free.** The pre-commit hook (`husky` → `lint-staged` → `prettier --write && eslint --fix && playwright test`) runs end-to-end on the dev's commit. **Note:** this story adds **only** `.github/pull_request_template.md`. The Playwright spec is not exercised by a `.github/` change; the hook still runs it (per project-context.md §11 — full Playwright on every commit). The lint-staged glob does not include `.md` (Task 3 explains why this is intentional and forbids broadening it in this story). Wall-clock stays within ±20 % of `nfr01-baseline.json` `rolling_mean_ms = 16746.6 ms`.

---

## Tasks / Subtasks

- [ ] **Task 1 — Confirm `.github/pull_request_template.md` is absent (AC: #1)**
  - [ ] 1.1 Verify `.github/pull_request_template.md` does not exist on `main` HEAD. Confirmed at story-creation time (DEE-54): the file is absent; `.github/` contains only `ISSUE_TEMPLATE/` and `workflows/`.
  - [ ] 1.2 If, by the time the dev opens the PR, the file exists (some other PR created it concurrently): **STOP**, escalate via `bmad-correct-course` to merge or re-target the work.

- [ ] **Task 2 — Author the PR template (AC: #2, #3, #4, #5, #6, #7, #9)**
  - [ ] 2.1 Create `.github/pull_request_template.md`. Use the **recommended template skeleton** below verbatim (or a close variant the dev justifies in the PR description).
  - [ ] 2.2 Embed all 16 §16 items as labelled checkboxes (shape (a) per AC-06.2). Each label format: `§16.X — <single-line summary>`. Map (canonical, taken from `_bmad-output/project-context.md` §16):
    - `§16.1 — Do not add new globals on \`window\` (only the canonical set declared in \`index.d.ts\` is sanctioned: \`config\`, \`DeepNest\`, \`SvgParser\`, \`nest\`, \`loginWindow\` — ADR-005). Note: project-context.md §16.1 currently says "four" but \`index.d.ts\` and project-context.md §7 enumerate five — match the index.d.ts list verbatim and flag the §16.1 wording for an NFR-08 follow-up.`
    - `§16.2 — Do not call \`ipcRenderer.invoke('read-config'\|'write-config')\` outside \`config.service.ts\`.`
    - `§16.3 — Do not register \`background-*\` IPC handlers outside \`nesting.service.ts\`.`
    - `§16.4 — Do not add a new UI framework (Ractive stays on the existing two views).`
    - `§16.5 — Do not modify vendored utilities in \`main/util/\` (\`clipper.js\`, \`simplify.js\`, \`interact.js\`, \`ractive.js\`, \`parallel.js\`, \`pathsegpolyfill.js\`, \`svgpanzoom.js\`).`
    - `§16.6 — Do not import from \`main/util/_unused/\`.`
    - `§16.7 — Do not introduce a TypeScript decorator transform pipeline.`
    - `§16.8 — Do not \`// @ts-ignore\` to silence strict-mode errors.`
    - `§16.9 — Do not use \`--no-verify\` to skip the pre-commit hook.`
    - `§16.10 — Do not drop or re-encode \`tests/assets/*.svg\` without re-deriving the two literal assertions in \`tests/index.spec.ts\`.`
    - `§16.11 — Do not double-convert mm / inch (internal store is inches; existing guards in \`initializeConfigForm()\`).`
    - `§16.12 — Do not open external URLs by spawning a \`BrowserWindow\` (\`setWindowOpenHandler\` already routes them to the OS shell).`
    - `§16.13 — Do not add an HTTP server, telemetry, or persistent database.`
    - `§16.14 — Do not assume the Windows \`clean\` / \`clean-all\` scripts work on Linux/macOS.`
    - `§16.15 — Do not remove \`**/*.js\` from the ESLint global ignore without a per-file migration plan.`
    - `§16.16 — Do not add a new spinner glyph; reuse \`spin.svg\`.`
  - [ ] 2.3 Place the pre-flight read reminder above the checklist (AC-06.3): "Before opening this PR, you have read `_bmad-output/project-context.md` §16, §8, §11, §17, §6."
  - [ ] 2.4 Add the "Touched files" (AC-06.4) and "Test evidence" (AC-06.5) sections after the checklist.
  - [ ] 2.5 Add the merge-block rule (AC-06.6) in a callout / note block at the top of the file: e.g. **"Reviewer rule: any anti-pattern checkbox ticked as violated → request changes, not approve."**
  - [ ] 2.6 **Self-test the new template against this very PR** (the PR that introduces the template). The template is the first thing the dev fills in. Every checkbox should be tickable as "not violated" (template-only PRs trivially satisfy §16). This validates AC-06.10 in real time.

- [ ] **Task 3 — Pre-commit hook compatibility (AC: #11)**
  - [ ] 3.1 The lint-staged glob (`**/*.{ts,html,css,scss,less,json}` per `project-context.md` §11) **does not include `.md`**. Markdown will not run through `prettier --write && eslint --fix` automatically. **This is fine** — Markdown is not currently formatted in the project's workflow. **Do not** broaden the lint-staged glob in this story (scope discipline). If a future story wants Markdown formatting, it owns that scope.
  - [ ] 3.2 Confirm the `husky` pre-commit hook still runs successfully (Playwright suite). Adding a `.github/` file does not affect Playwright; the hook should be green by default.

- [ ] **Task 4 — Self-validate the §16 mapping (AC: #8)**
  - [ ] 4.1 Run `grep -n "## 16. Critical anti-patterns" _bmad-output/project-context.md` and confirm exactly one match.
  - [ ] 4.2 Visually walk the 16 numbered items in `_bmad-output/project-context.md` §16 vs. the 16 checkboxes in the template. Each must align 1:1. **If any §16 item has changed wording since this story was authored, update the template label to match — `project-context.md` is the source of truth (NFR-08).**
  - [ ] 4.3 Capture the alignment evidence in the PR description: a side-by-side or a "verified 16/16 by hand on 2026-04-XX against `_bmad-output/project-context.md` HEAD `<sha>`" line.

- [ ] **Task 5 — Pre-commit hook in full (AC: #11)**
  - [ ] 5.1 Stage the changes. `git commit -m ...`. The hook must run end-to-end. **Never `--no-verify`** (anti-pattern §16.9).
  - [ ] 5.2 Record the wall-clock duration of the Playwright run from the hook output (or from the post-commit CI run on the canonical CI cell). Compare against `nfr01-baseline.json` `rolling_mean_ms`. Must be within ±20 %.

- [ ] **Task 6 — PR composition (AC: all)**
  - [ ] 6.1 Open the PR against `main`. Title pattern: `feat(governance): Story 6.1 — add .github/pull_request_template.md anchored on project-context.md §16 (DEE-54 / FR-06)`.
  - [ ] 6.2 The PR description **uses the new template itself** (Task 2.6) — this is the template's first real-world test. Every checkbox is filled. The dev cites Task 4 evidence in the "Touched files" section and Task 5.2 evidence in the "Test evidence" section.
  - [ ] 6.3 PR description must additionally include:
    - The 11 AC blocks transposed to checkboxes.
    - The 16-item alignment evidence from Task 4.3.
    - The Playwright run wall-clock vs. NFR-01 baseline (Task 5.2).
    - A reference link to this story file: `_bmad-output/implementation-artifacts/6-1-add-github-pull-request-template-md-anchored-on-project-context-md-16.md`.
    - A reference link to the parent issue: DEE-54.
  - [ ] 6.4 Request review from the CTO (sprint sign-off) and Sally (UX, only because this is a process-surface PR with reviewer ergonomics — Sally's input on "is this template easy to read" is welcome but non-blocking).

---

## Dev Notes

### Project context (binding)

- **Repo:** `deepnest-next` (community fork of Deepnest 2D bin-packing for Electron). See `_bmad-output/project-context.md` §1.
- **Stream:** Head of Stream C in MVP-1, **pulled to the front of Stream C** so subsequent MVP PRs (Stories 1.1, 2.1..2.4, 3.1..3.2, 4.1..4.2, 5.1, 6.2) can use the template from day one (sprint-plan.md §3 row C1 + §3 "Parallelism note").
- **Why this story matters now.** From the IR report (`_bmad-output/planning-artifacts/implementation-readiness-report.md`) and sprint-plan.md §2 row #7: the IR Pre-condition #7 was CONCERNS at IR time because no PR template existed at the canonical path. The CTO sprint-start gate accepted the CONCERNS conditional on this story shipping inside MVP-1. **Landing this story closes the IR Pre-condition #7 CONCERNS verdict.**
- **Process delta only.** No code surface. No runtime change. No new test. No new CI workflow.

### Recommended template skeleton (verbatim — Task 2.1)

```markdown
<!-- .github/pull_request_template.md — anchored on _bmad-output/project-context.md §16 -->

## Summary

<!-- 1-3 sentences: what this PR does and why. Link the parent issue / story. -->

> **Reviewer rule:** any anti-pattern checkbox below ticked as violated → request changes, not approve. (NFR-03 — zero ticked-as-violated allowed.)

## Pre-flight reads (binding)

Before opening this PR I have read:

- [ ] `_bmad-output/project-context.md` §16 — anti-patterns (full list — 16 items)
- [ ] `_bmad-output/project-context.md` §8 — cross-cutting behaviours that bite
- [ ] `_bmad-output/project-context.md` §11 — ESLint / Prettier / pre-commit hook
- [ ] `_bmad-output/project-context.md` §17 — brownfield caveats
- [ ] `_bmad-output/project-context.md` §6 — IPC contract

## Anti-pattern checklist (`_bmad-output/project-context.md` §16)

Tick each item as **NOT violated**. If any item is violated, ✅ describe the carve-out below the checklist or **do not request review**.

- [ ] §16.1 — No new globals on `window` (only the canonical set declared in `index.d.ts`: `config`, `DeepNest`, `SvgParser`, `nest`, `loginWindow` — ADR-005)
- [ ] §16.2 — No `ipcRenderer.invoke('read-config'|'write-config')` outside `config.service.ts`
- [ ] §16.3 — No new `background-*` IPC handlers outside `nesting.service.ts`
- [ ] §16.4 — No new UI framework (Ractive stays on the existing two views)
- [ ] §16.5 — No modifications to vendored utilities in `main/util/` (`clipper.js`, `simplify.js`, `interact.js`, `ractive.js`, `parallel.js`, `pathsegpolyfill.js`, `svgpanzoom.js`)
- [ ] §16.6 — No imports from `main/util/_unused/`
- [ ] §16.7 — No new TypeScript decorator transform pipeline
- [ ] §16.8 — No new `// @ts-ignore` directives
- [ ] §16.9 — No `--no-verify` commits in this PR
- [ ] §16.10 — No drops / re-encodes of `tests/assets/*.svg` without re-deriving the two spec literals (`#importsnav li = 2`, `54/54`)
- [ ] §16.11 — No mm/inch double-conversion (internal store is inches; existing guards in `initializeConfigForm()` preserved)
- [ ] §16.12 — No external URLs opened by spawning a `BrowserWindow` (`setWindowOpenHandler` already routes them to the OS shell)
- [ ] §16.13 — No HTTP server / telemetry / persistent database introduced
- [ ] §16.14 — No assumption that Windows `clean` / `clean-all` scripts work on Linux/macOS
- [ ] §16.15 — No removal of `**/*.js` from the ESLint global ignore (without a per-file migration plan)
- [ ] §16.16 — No new spinner glyph; `spin.svg` is reused

> Reviewer convention: cite the §16 item number when flagging (e.g., "§16.1 — new `window` global introduced; please remove"). The contributor's resolution path lives in `docs/development-guide.md` §"Resolving an anti-pattern flag in PR review" (added by Story 6.2).

## Touched files

<!-- Paste `git diff --stat` summary or list changed paths. Reviewer uses this to scope the review. -->

## Test evidence

<!-- Required for any PR that touches main/, tests/, package.json, or .github/workflows/.
     Otherwise: write "N/A — story does not require test evidence beyond npm test green". -->

- `npm test` exit code: <0 / non-zero>
- NFR-01 wall-clock vs. `nfr01-baseline.json` (rolling_mean_ms = 16746.6, ±20% = 13397..20096 ms): <ms> (Δ <pct>%)
- NFR-02 manual-repro evidence (FR-04 PRs only): <link to evidence write-up or "N/A">
- Drift-gate transcripts (FR-02 / FR-03 PRs only): <green + deliberately-red transcripts or "N/A">

## Linked issue / story

- Issue: DEE-NN
- Story file: `_bmad-output/implementation-artifacts/<story-key>.md`
```

### Architecture compliance (binding)

From `_bmad-output/planning-artifacts/architecture.md` §4 (FR-06) — verbatim constraints:

1. **(a)** PR-template item per anti-pattern OR a single "I have read `_bmad-output/project-context.md` §16 and verified none of the 16 items is violated" checkbox with reviewer-citable section numbers. *Recommended path: shape (a) — see AC-06.2.*
2. **(b)** No new lint rule, no new test (per `project-context.md` §11 — type-aware lint deferred). *Enforced — this story is template-only.*
3. **(c)** Reviewer can cite the exact §16 item number for any concern raised, so contributors can resolve via a single-line lookup. *Enforced by AC-06.9 — checkbox labels are prefixed with `§16.X`.*

**Independent revertibility** (overlay §4 FR-06): template-only. Trivially reverted; the underlying anti-pattern list lives in the GPC (`_bmad-output/project-context.md` §16). *Honour this — keep the PR a single-file change.*

### Files to create / edit (precise list)

**Create:**

- `.github/pull_request_template.md` — the only deliverable.

**Edit:** none.

**Files NOT to touch in this story:**

- `_bmad-output/project-context.md` §16 — referenced, not edited (overlay §4 FR-06 "Touched components" is explicit).
- `docs/development-guide.md` — Story 6.2 owns the reviewer-workflow docs section.
- `package.json`, `eslint.config.mjs` — overlay §4 FR-06 (b) forbids new lint rule / new test.
- `.github/workflows/*` — out of scope (no new CI step needed).
- Any code under `main/`, `tests/`, `scripts/` — out of scope.

### Anti-pattern audit map (project-context.md §16)

| §16.X | Anti-pattern | This story's exposure | Verification |
|---|---|---|---|
| 1 | New global on `window` | None — story is `.md` only | `git diff` |
| 2..16 | (all other items) | None — story is `.md` only | `git diff --stat` shows only `.github/pull_request_template.md` added |
| 9 | `--no-verify` | **Forbidden.** Pre-commit hook runs end-to-end. | `git log --pretty=fuller` |

The audit is largely vacuous because this story has **no code surface**. The template's *content* enumerates the 16 items so future stories will be measured against them. The dev applying the template to this very PR (Task 2.6) is the first end-to-end test.

### Pre-flight reads (binding — embedded per epic spec)

Before opening the PR, the implementing agent **must** have read:

1. `_bmad-output/project-context.md` §16 — **the source of truth** for the template's content. The template's 16 checkboxes mirror this section verbatim (or close to verbatim, summary-style).
2. `_bmad-output/project-context.md` §8 — cross-cutting behaviours. *Not directly relevant to a `.md`-only PR; included for completeness.*
3. `_bmad-output/project-context.md` §11 — pre-commit hook (lint-staged glob excludes `.md`; template file will not be auto-formatted; **do not** broaden the lint-staged glob in this story — scope discipline).
4. `_bmad-output/project-context.md` §17 — brownfield caveats. *Not directly relevant to a `.md`-only PR.*
5. `_bmad-output/project-context.md` §6 — IPC contract. *Not directly relevant; story does not add a channel.*
6. `_bmad-output/planning-artifacts/architecture.md` §3.1 row FR-06 + §4 §"FR-06" + §9 (IR pre-condition #7).
7. `_bmad-output/planning-artifacts/prd.md` §FR-06 (AC-06.1..AC-06.6) and §NFR-03.
8. `_bmad-output/planning-artifacts/implementation-readiness-report.md` — the IR CONCERNS verdict for Pre-condition #7 that this story closes.
9. Existing `.github/pull_request_template.md` (verified absent at story-creation time; if present at PR-open time, see Task 1.2).

### Sprint risk callouts (from sprint-plan.md §5)

- **R5 (Medium / Low) — Epic 6 PR template (this story) is contested on wording and blocks review of A1 / B1 PRs that land before C1.** Mitigation per sprint plan: C1 is sequenced as head of Stream C and lands within the first wave (A1 / B1 / C1 are interchangeable); reviewer notes track §16 items by hand even pre-C1. **This story aims to land in the first wave** so no other PR has to use the inline-checklist fallback for long. *Fallback is benign — Stories 1.1 and 3.1 already embed the §16 audit checklist inline in their PR descriptions.*
- **R7 (Medium / Low) — Sprint runs over capacity.** Per sprint plan: spillover is acceptable as long as Story 6.1 lands in MVP-1 (clears IR Pre-condition #7). **This story is critical-for-sprint-DoD even if other stories slip.**

### Stream parallelism note + sequencing

- Stories 1.1 (Stream A head), 3.1 (Stream B head), and 6.1 (this) **share no files**. They can land in any order or simultaneously. **No merge conflict** between them.
- After this story lands, every subsequent MVP PR uses the new template. Until this story lands, Stories 1.1 and 3.1 (and any other PR that opens before this one) inline the §16 checklist in their PR description — same content, different surface.

### Project Structure Notes

- **Files touched are exactly:** new `.github/pull_request_template.md`. Single file. **No** code change. **No** `package.json` change. **No** `eslint.config.mjs` change. **No** `_bmad-output/project-context.md` change. **No** `docs/development-guide.md` change.
- **No `tsconfig.json` change** (project-context §10).
- **No new test added.** Architecture overlay §4 FR-06 (b) explicitly forbids new lint rule / new test for this story.

### Testing standards summary

- The template is the test surface for **future** PRs (it makes the FR-06 / NFR-03 gate measurable). For *this* PR, the test evidence is Task 4 (the 16-item alignment audit) + Task 5 (pre-commit hook green).
- No Playwright spec change; the existing spec runs unchanged in the pre-commit hook.

---

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` lines 775–818 §"Story 6.1: Add `.github/pull_request_template.md` anchored on `project-context.md` §16"]
- [Source: `_bmad-output/planning-artifacts/epics.md` lines 762–773 §"Epic 6: Anti-pattern preservation rails"]
- [Source: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row C1 + §3 "Parallelism note" + §2 row #7 (IR Pre-condition #7 mitigation)]
- [Source: `_bmad-output/planning-artifacts/architecture.md` §3.1 row FR-06 + §4 §"FR-06" + §9 row #7]
- [Source: `_bmad-output/planning-artifacts/prd.md` §FR-06 (AC-06.1..AC-06.6) + §NFR-03]
- [Source: `_bmad-output/planning-artifacts/implementation-readiness-report.md` — IR CONCERNS Pre-condition #7]
- [Source: `_bmad-output/project-context.md` §16 (canonical anti-pattern list — 16 items) + §11 (pre-commit / lint-staged)]
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

_To be filled at PR-ready time. Must include the 16-item alignment evidence (Task 4.3) and confirmation that the new template was used for this PR's own description (Task 6.2)._

### File List

_To be filled at PR-ready time. Expected shape: 1 new file (`.github/pull_request_template.md`). No edits, no deletions._
