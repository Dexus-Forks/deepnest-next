# Story 2.4: Document the "add a new vendored library" workflow in `docs/development-guide.md`

Status: ready-for-dev

> Authored by John (PM, BMad) on 2026-04-29 via `bmad-create-story` ([DEE-239](/DEE/issues/DEE-239) — CTO triage of [DEE-149](/DEE/issues/DEE-149) Risk-1 doc-trio CTO escalation, 3-standup ownership threshold) for **MVP-1 / Stream-A continuation (A5 — Epic-2 closer doc)**. Epic anchor: `_bmad-output/planning-artifacts/epics.md` §"Story 2.4" (Epic 2 / FR-02). PRD anchor: `_bmad-output/planning-artifacts/prd.md` §FR-02 (AC-02.1..AC-02.4). Architecture anchor: `_bmad-output/planning-artifacts/architecture.md` §5 ADR-008 ("Decision" steps 1–5 + "Schema reference" + "Consequences" + "Independent revertibility"). Predecessors (all `done`, all on `main`): Story 2.1 (DEE-84 / [PR #19](https://github.com/Dexus-Forks/deepnest-next/pull/19) — bootstrap metadata), Story 2.2 (DEE-92 / [PR #23](https://github.com/Dexus-Forks/deepnest-next/pull/23) — `scripts/build-licenses.mjs` generator), Story 2.3 (DEE-124 / [PR #36](https://github.com/Dexus-Forks/deepnest-next/pull/36) — `npm test` wire-in / 750 ms wall-clock guard / `onFail` harness). Sibling docs-trio (parallel, NOT prerequisites): Story 3.2 (`ready-for-dev`, fixture-drift re-derivation), Story 6.2 (`ready-for-dev`, §16 reviewer workflow). Carry-overs from Epic-1 retrospective (`_bmad-output/implementation-artifacts/epic-1-retrospective.md` §5) explicitly applied below.

---

## Story

As a **new contributor**,
I want **a section in `docs/development-guide.md` titled "Adding a new vendored library or third-party asset" that walks me through (a) putting the new file under the right folder, (b) adding the `LICENSE.yml` entry, (c) running `npm run licenses:build`, (d) committing both files together as a single PR**,
so that **a contributor opening their first PR doesn't trip the CI drift gate (`npm run licenses:check` exit-1) and doesn't need a maintainer to explain the contract via PR review**.

**Sprint role.** This is **A5 — Stream-A's fifth and final item**. With Stories 2.1 / 2.2 / 2.3 all merged, the licenses-toolchain (per-folder metadata → generator → CI drift gate) is fully wired. Story 2.4 is the **doc-side closure** that makes the toolchain self-onboarding for first-time contributors. **It is the single doc-deliverable left before the Epic-2 retrospective (`epic-2-retrospective: optional → done`).**

**FR/AC coverage:** FR-02 (PRD §FR-02 expanded scope). Closes the FR-02 docs surface that Stories 2.1–2.3 deferred to this story per ADR-008 step 4 implication ("contributor adds a new vendored library inside an already-configured root … CI gate is the explicit catch — failure mode names the missing file path") + ADR-008 Cross-references row "Mitigated by the PR template's vendored-library checklist (FR-06)" — Story 6.2 is the FR-06 reviewer-side counterpart; Story 2.4 is the contributor-side onboarding doc.
**ADR binding:** **ADR-008** (decision steps 1–5; schema reference; consequences; independent revertibility). No new ADR. Cross-reference is mandatory in the new section per AC-02.4.3 below.
**NFR coupling measured:** **NFR-08** (docs-freshness — the new section's references to `package.json` script names, `scripts/build-licenses.mjs` exit codes, file paths, ADR section numbers, and `_bmad-output/project-context.md` section numbers MUST be accurate at write-time and re-verifiable with a single `git grep`). NFR-01 is **not** coupled (docs-only PR; no CI wall-clock change expected).

---

## Acceptance Criteria

1. **AC-02.4.1 — New section added to `docs/development-guide.md`.** Section heading: **`### Adding a new vendored library or third-party asset`** (H3, inside the existing `## Common Workflows` H2 chapter at `docs/development-guide.md:123`). The section is the **fourth `###` entry** under `## Common Workflows`, slotted **after** `### Adding a new export format` (`docs/development-guide.md:141-145`) so the existing three sibling workflows (config option / IPC channel / export format) are preserved verbatim and the new section lands in the same canonical "how to extend X" register.

   **Heading-depth rationale (binding).** The three existing sibling workflows under `## Common Workflows` (`docs/development-guide.md:125`, `:133`, `:141`) all use **H3** (`### Adding a new …`). The new section MUST match — not H2, not H4. Story 6.2 (`_bmad-output/implementation-artifacts/6-2-…md` AC-06.2.1) explicitly anchors itself to "after the 'Adding a new vendored library' section from Story 2.4 if it exists at write-time" — so the H3 heading + the slot order **also fix the insertion point that Story 6.2 will read**. Do not change the heading text or the slot.

2. **AC-02.4.2 — Four-step procedure enumerated, in this order.** The section body MUST contain a numbered list of exactly **four** steps, in this order (the wording below is the recommended phrasing — Dev MAY tighten verbs or expand sub-bullets, but the **step count, the order, and the four named actions** are binding):

   1. **Place the new file under the correct folder.** The folder choice is determined by where the runtime imports / loads it from (parallel to `_bmad-output/project-context.md` §4 module-boundary table). Vendored JS utilities → `main/util/`. Webfont kit additions → `main/font/fonts/`. Test-only fixtures → `tests/assets/` **with a cross-link to the §"Re-deriving the test-fixture literals after a tests/assets/ change" section** authored by Story 3.2 (link target is sibling-section-relative; works whether 3.2 lands before or after this PR — see AC-02.4.7 for the link discipline).
   2. **Add a `LICENSE.yml` entry under the same folder.** If the folder already has a `LICENSE.yml` (`main/LICENSE.yml`, `main/util/LICENSE.yml`, `main/font/LICENSE.yml`, `tests/assets/LICENSE.yml` — name them all so the contributor knows the closed-set), append a new entry per the schema reference in **ADR-008 §5 step 1** (`_bmad-output/planning-artifacts/architecture.md:240-250`). If the folder is a **new root** (none of the four above), the section MUST name this as a deliberate two-file PR — `LICENSE.yml` + an extension to `LICENSE_YML_FILES` at `scripts/build-licenses.mjs:39-44` — with a one-line callout cross-referencing ADR-008 Consequences row "(+) Drift resistance" (`_bmad-output/planning-artifacts/architecture.md:273`) and Risks row "Contributor adds a new vendored library under a *new* root not in `LICENSE_YML_FILES`" (`_bmad-output/planning-artifacts/architecture.md:424`).
   3. **Run `npm run licenses:build`.** The section MUST quote the exact command and explain the effect (regenerates `LICENSES.md` from the per-folder metadata → first-party block, then ASCII-byte-sorted third-party block). Cross-reference: `LICENSES.md` is the canonical artefact; the contributor stages it alongside the `LICENSE.yml` change.
   4. **Commit `LICENSE.yml` + `LICENSES.md` (and the new file) in a single PR.** The section MUST name this as a single-PR commit — splitting them is what trips the `licenses:check` drift gate (next bullet) and produces a two-PR review surface for what is conceptually one change.

3. **AC-02.4.3 — Failure-mode callout (binding, this is the contract).** The section MUST end with a "If you skip step 3" callout block (named, e.g. "Skipping the `npm run licenses:build` step") that reads: on the very next push (or on local `git commit` with the `husky` pre-commit hook active per `_bmad-output/project-context.md` §11), `npm test` runs `npm run licenses:check` first; the check exits **1** with stderr in the unified-diff format `[licenses:check] FAIL — drift detected …` (cross-reference: `scripts/build-licenses.mjs:29` exit-code legend + the §"Drift-diff marker convention" header comment at `scripts/build-licenses.mjs:23-27`); Playwright is **not** spawned (fail-fast). Recovery: run `npm run licenses:build && git add LICENSES.md && git commit --amend --no-edit` (or a fresh follow-up commit). **The callout's job is to make the failure mode predictable for someone who has never seen it before.**

4. **AC-02.4.4 — Example `LICENSE.yml` snippet, all required fields populated.** Inline the example as a fenced ` ```yaml ` code block. The example MUST have **exactly one entry** in a top-level YAML array (not an object; arrays are the schema per ADR-008 §5 step 1). All five required fields populated with realistic values (preferred shape: a hypothetical `main/util/example-lib.js` so the snippet matches the `main/util/LICENSE.yml` corpus the contributor will be cross-referencing). Optional fields (`first_party`, `notes`) are illustrated **without** being marked required — name them in a one-line comment after the entry. Keep the snippet under ~12 lines so it fits on one screen.

   **Snippet correctness gate.** The Dev MUST validate the snippet by piping it through the production parser before merging:

   ```sh
   # write the example to a temp file under main/util/, run the script in --check mode,
   # confirm parser does not fail-schema. Then revert. Worktree-friendly: no install needed.
   cp main/util/LICENSE.yml /tmp/LICENSE.yml.bak
   # paste example as the FIRST entry in main/util/LICENSE.yml (so generator picks it up)
   node scripts/build-licenses.mjs --check
   # expect: EXIT_DRIFT (1) — drift is fine; the gate proves the parser parsed our snippet.
   # if it instead exits 2 (EXIT_SCHEMA), the snippet is broken — fix it before merging.
   cp /tmp/LICENSE.yml.bak main/util/LICENSE.yml
   ```

   Record the outcome (`EXIT_DRIFT` = snippet parses, snippet is correct; `EXIT_SCHEMA` = snippet broken, fix it) under "Debug Log References" in the Dev Agent Record. **This is the worktree-friendly pre/post measurable that satisfies Epic-1 retrospective carry-over §5.3.**

5. **AC-02.4.5 — Cross-reference to ADR-008 design rationale.** The section MUST contain a one-paragraph "Why this contract exists" callout (or a sentence in the lead paragraph) cross-referencing **`_bmad-output/planning-artifacts/architecture.md` §5 ADR-008**. The cross-reference MUST name (a) the `Decision` section name and (b) at least one `Consequences` bullet (the drift-resistance bullet at `architecture.md:273` is the natural pick since it explains *why* the contributor is doing step 3). **Discoverability test:** a reader who has only read this section, with zero prior project context, can find ADR-008 in one click.

6. **AC-02.4.6 — Reachability from `docs/index.md`.** The new section MUST be reachable from `docs/index.md`'s existing pointer to `./development-guide.md` (line 29) without a separate edit to `docs/index.md` — i.e. the new H3 anchor (`#adding-a-new-vendored-library-or-third-party-asset`) is auto-generated by the standard markdown TOC convention and does NOT require a manual TOC entry. **No edit to `docs/index.md` is in scope for this story** (scope discipline; see AC-02.4.10).

7. **AC-02.4.7 — Cross-link to Story 3.2 sibling section (forward-compatible).** Step 1's `tests/assets/` sub-bullet MUST cross-link to the Story 3.2 section *"Re-deriving the test-fixture literals after a `tests/assets/` change"* using the **anchor form** (`#re-deriving-the-test-fixture-literals-after-a-testsassets-change`) so the link works whether Story 3.2 lands before or after Story 2.4. The link MUST be the standard markdown `[…](#anchor)` shape; **do NOT use a relative file link** (would 404 if Story 3.2 PR is delayed). **Discoverability fallback:** if Story 3.2 has not yet shipped at merge time, the anchor will be a dangling link — that is acceptable (it self-resolves once 3.2 lands; same MVP-1 sprint per `sprint-status.yaml` `3-2-…: ready-for-dev`). Record the chosen approach (link present + dangling, or link present + Story 3.2 already merged) in the PR description.

8. **AC-02.4.8 — Folder-list closed-set tabulation.** The section's step 1 sub-bullets MUST enumerate the **four currently-configured roots** as the closed-set in a small bulleted list:

   - `main/util/` — vendored JS utilities (e.g. `clipper.js`, `simplify.js`, `interact.js`, `ractive.js`, `parallel.js`, `pathsegpolyfill.js`, `svgpanzoom.js`, `HullPolygon.ts`).
   - `main/font/fonts/` — webfont kit (Lato Latin family per `main/font/LICENSE.yml`).
   - `tests/assets/` — E2E test fixtures (currently `henny-penny.svg`, `mrs-saint-delafield.svg`).
   - `main/` (root) — first-party + in-installer-but-out-of-tree passthrough rows (the root `main/LICENSE.yml`'s `path:` is the literal `Unit` column value, not folder-relative — call this out as the "passthrough" exception so a contributor doesn't accidentally use literal paths in `main/util/LICENSE.yml`).

   The list MUST also tell the contributor what to do when the folder doesn't fit any of the four (per AC-02.4.2 step 2's "deliberate two-file PR" rule).

9. **AC-02.4.9 — `project-context.md` §16 anti-pattern grid (binding scope guard).** The PR adds **no** new `window` global (§16.1), **no** new IPC channel (§16.2/§16.3), **no** new `// @ts-ignore` (§16.8), **no** edits to `main/util/_unused/*` (§16.6), **no** modification of vendored utilities under `main/util/` (§16.5 — only metadata files like `LICENSE.yml` may be edited; this story doesn't even touch metadata), **no** `--no-verify` commits (§16.9), **no** modification of `tests/assets/*.svg` (§16.10), **no** edit to `tsconfig.json` / `eslint.config.mjs` / `package.json` `scripts` (§16.7 / §16.15 / scope guard). **No `LICENSE.yml` edit; no `LICENSES.md` regeneration.** This is a **docs-only PR**. The 17-row anti-pattern grid (one row per `_bmad-output/project-context.md` §16 item) is the recommended Dev Agent Record artefact (Epic-1 retrospective §2.2 — already canonical for asset / metadata / wire-in stories; this is the first docs-only story to reuse it, but the discipline carries; mark §16.9 as N/A-with-evidence per Epic-1 retrospective §4.5).

10. **AC-02.4.10 — Scope guard. PR touches only:**
    - `docs/development-guide.md` — adds the new `### Adding a new vendored library or third-party asset` H3 section under `## Common Workflows`, after the existing `### Adding a new export format` block.
    - `_bmad-output/implementation-artifacts/sprint-status.yaml` — flips `2-4-document-the-add-a-new-vendored-library-workflow-in-docs-development-guide-md` from `ready-for-dev` to `done` on the DS handoff PR (NOT this CS commit; the CS commit handled by John flips `backlog → ready-for-dev`).
    - `_bmad-output/implementation-artifacts/2-4-document-the-add-a-new-vendored-library-workflow-in-docs-development-guide-md.md` (this story file — created by John in the CS commit; populated by Paige at DS time per the standard Dev-Agent-Record block).

    Verified by `git diff --stat` on the final PR. **Zero** changes under `main/**`, `scripts/**`, `tests/**`, `_bmad-output/planning-artifacts/**`, `_bmad-output/test-artifacts/**`, `LICENSES.md`, `LICENSE.yml` (any), `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.mjs`, `.github/**`, `docs/index.md`, `docs/asset-inventory.md`, `docs/source-tree-analysis.md`, `docs/architecture.md`, any other `docs/*.md` (scope guard against doc-scope-extension — Epic-1 retrospective §6 first-instance pattern; if a sibling doc page genuinely needs an update for cross-link consistency, file a follow-up issue and link it from the PR description rather than fold it here). **One** new docs section; **two** files touched (development-guide.md + sprint-status.yaml); **one** new story file (this one).

11. **AC-02.4.11 — `npm test` is green on the PR.** Docs-only PRs do not change wall-clock; nevertheless the pre-commit hook runs the full suite per `_bmad-output/project-context.md` §11 (lint-staged scope is `**/*.{ts,html,css,scss,less,json}` — markdown is NOT linted, so prettier/ESLint do nothing on this PR's primary file). The Playwright suite still runs via husky → lint-staged's hook chain because `package.json` `scripts.precommit` triggers `lint-staged` only for the staged-file-types listed; the **separate** husky pre-commit invocation chains into `npm test` (per the existing repo convention captured in §11). Dev confirms `npm test` exits 0 locally before push; if the worktree has no `node_modules` (Paperclip workspace isolation; per Epic-1 retrospective §4.5), **the absence-of-`node_modules` exception applies — CI run is the binding evidence; Dev names this verbatim in the Dev Agent Record per Epic-1 retrospective §4.5's wording**. **Default expectation: no `--no-verify` on this PR.**

12. **AC-02.4.12 — Round-1 Board fold-in budget.** Per Epic-1 retrospective §2.4 and Story 2.2 Round-2 precedent (DEE-93 / DEE-98 fold-in pattern), if the Round-1 Board returns ≤ 2 P3 doc-numerology / line-anchor / cross-reference nits, the Dev folds them as a fixup commit on the same PR (Round-2 avoided). > 2 P3 nits, or any P0/P1/P2 finding, escalates to a separate follow-up issue per the standard Story-2.x triage (see Story 2.2 Round-1 → DEE-98 Bundle 1/2/3 split for the canonical worked example). **Document the fold-in / split decision in the Dev Agent Record's "Bundle Polish" sub-section.**

---

## Tasks / Subtasks

- [ ] **Task 1 — Pre-flight reads (binding; AC: all)**
  - [ ] 1.1 Read `_bmad-output/planning-artifacts/architecture.md` §5 ADR-008 end-to-end (lines 218–292) — particularly the **Decision** steps 1–5, the **Schema reference** table (lines 240–250), the **Consequences** "+/-" bullets (lines 273–279), and the **Independent revertibility** sub-section (lines 283–287). The new section's "Why this contract exists" callout (AC-02.4.5) draws verbatim from the Consequences "Drift resistance" bullet at line 273.
  - [ ] 1.2 Read `_bmad-output/planning-artifacts/prd.md` §FR-02 (lines 333–339) — particularly AC-02.1..AC-02.4 (the original FR-02 expanded scope per VP). NFR-08 (docs-freshness) at line 447 is the binding NFR for this story; read it.
  - [ ] 1.3 Read `_bmad-output/project-context.md` §4 (module-boundary table — informs the Step 1 folder choice in AC-02.4.2), §11 (pre-commit hook + `--no-verify` discipline — informs AC-02.4.11), and §16 in full (informs AC-02.4.9 anti-pattern grid).
  - [ ] 1.4 Read `_bmad-output/implementation-artifacts/epic-1-retrospective.md` §5 ("Patterns to lift for the rest of MVP-1 dev") — all 5 carry-overs apply to this story, particularly §5.3 (worktree-friendly pre/post measurable — cf. AC-02.4.4's parser smoke gate) and §5.5 (path-resolution at CS time — already done by John for the AC-02.4.1 insertion line numbers; Paige re-verifies at DS time).
  - [ ] 1.5 Read `docs/development-guide.md` end-to-end (174 lines as of `main` HEAD; current `wc -l` confirms). Confirm the H2 / H3 hierarchy under `## Common Workflows` (`:123`) matches AC-02.4.1's slot — three existing H3 entries: `:125`, `:133`, `:141`. Confirm the file's last `##` chapter is `## Troubleshooting` (`:164`). The new H3 lands inside `## Common Workflows`, NOT at end-of-file.
  - [ ] 1.6 Read `scripts/build-licenses.mjs` lines 1–80 — particularly the file-header comment block (purpose + zero-dep declaration + budget + exit-code legend at line 21 + drift-diff marker convention at lines 23–27). The new section's failure-mode callout (AC-02.4.3) cross-references the exit-code legend at line 21 verbatim.
  - [ ] 1.7 Read `_bmad-output/implementation-artifacts/2-3-wire-licenses-check-into-npm-test-ci-drift-gate.md` lines 1–135 (the Story 2.3 spec — predecessor; particularly its AC-02.3.1 (the wire-in pattern) + AC-02.3.7 (the drift-diff format the failure-mode callout will reference)). Cross-check the post-Story-2.3 `package.json` `scripts.test` shape: `node scripts/check-licenses-budget.mjs && npm run test:licenses && npm run test:fixtures:check && playwright test` (verified live at write-time).
  - [ ] 1.8 Read `_bmad-output/implementation-artifacts/3-2-document-the-fixture-drift-re-derivation-procedure-in-docs-development-guide-md.md` (Story 3.2 spec — sibling docs-trio member; particularly AC-03.2.5 — the Story 3.2 spec already commits to NOT duplicating provenance from `tests/assets/LICENSE.yml`; this story reciprocates by linking to Story 3.2's section title verbatim per AC-02.4.7).
  - [ ] 1.9 Read `_bmad-output/implementation-artifacts/6-2-document-the-cite-the-16-item-number-reviewer-workflow-in-docs-development-guide-md.md` AC-06.2.1 (the section text already names "after the 'Adding a new vendored library' section from Story 2.4" — Story 2.4's heading text + slot order is now load-bearing for Story 6.2's insertion-point calculation; the H3 heading + the slot order in AC-02.4.1 are deliberately exact).
  - [ ] 1.10 Pre-edit grep audit (Epic-1 retrospective §5.1): `git grep -nE 'Adding a new vendored|new vendored library|Adding.*vendored library|build-licenses|licenses:build' docs/` MUST return **zero matches** at write-time (the section does not yet exist). Record the verified-empty grep in the Dev Agent Record's "Path-resolution & pre-edit grep audit" line (Epic-1 retrospective §4.1 + §4.3 archetype). If non-zero matches surface (e.g. a sibling story landed first), reconcile before authoring (no double-document; if a section exists already, update in-place per Story 3.2 Task 2.2's same rule).
  - [ ] 1.11 Read each `LICENSE.yml` corpus quickly (`main/LICENSE.yml`, `main/util/LICENSE.yml`, `main/font/LICENSE.yml`, `tests/assets/LICENSE.yml`) — informs the realistic-shape choice for the AC-02.4.4 example snippet. Particularly: `main/util/LICENSE.yml` has the largest variety of license types (BSL-1.0, MIT, ISC, BSD-3-Clause, BSD-2-Clause), so a snippet anchored at `main/util/example-lib.js` reads naturally as "you'll add yours next to these".
  - [ ] 1.12 Read `_bmad-output/sops/build-tooling-test-harness.md` if it exists (per Epic-1 retrospective §4.5 — the Paperclip-worktree `npm install`-absent SOP). The DS heartbeat will need this for the AC-02.4.11 evidence sentence.

- [ ] **Task 2 — Path-resolution & insertion point (AC: #1, #6)**
  - [ ] 2.1 Re-verify the AC-02.4.1 insertion line numbers against the live `main` HEAD: `head -n 145 docs/development-guide.md | tail -n 23` shows lines 123 (`## Common Workflows`), 125 (`### Adding a new config option`), 133 (`### Adding a new IPC channel`), 141 (`### Adding a new export format`), 145 (close of the export-format block). Insert the new H3 immediately after line 145, before the `## Editor & Tooling` (`:147`) chapter break (one blank line above the new H3, one blank line below the new section's last paragraph).
  - [ ] 2.2 Confirm no other `### Adding a new …` H3 was added by an in-flight PR (re-run the AC-02.4.10-style scope check at write-start: `git fetch origin main && git diff origin/main -- docs/development-guide.md` — should be empty; if not, rebase before authoring per `_bmad-output/project-context.md` §19's pre-flight rebase rule).

- [ ] **Task 3 — Author the four-step procedure (AC: #2, #4, #8)**
  - [ ] 3.1 Open the section with one **lead paragraph** (1–2 sentences) naming what it does (helps a contributor add a new third-party library / asset cleanly) and what trips when they skip it (the `licenses:check` CI drift gate). Keep the lead paragraph ≤ 60 words.
  - [ ] 3.2 Numbered list of **four** steps in the AC-02.4.2 order. Each step is a **single sentence** (Imperative; verb-first) followed by **at most three sub-bullets** of detail. Total step section length: aim for ≤ 30 lines (excluding the snippet).
    - Step 1 sub-bullets: the four-folder closed-set per AC-02.4.8 (verbatim list including the `main/` passthrough exception note).
    - Step 2 sub-bullets: the schema reference cross-link (`_bmad-output/planning-artifacts/architecture.md` §5 ADR-008 step 1 "Schema reference") + the new-root callout (two-file PR, cross-ref to the Risks row at `architecture.md:424`).
    - Step 3 sub-bullets: the exact command (`npm run licenses:build`) + the effect (regenerates `LICENSES.md`; first-party block then ASCII-byte-sorted third-party block). Quote the script's docs pointer at `scripts/build-licenses.mjs:77-78` for the contributor who wants to dig deeper.
    - Step 4 sub-bullets: name the three files (`<new file>` + `<the LICENSE.yml>` + `LICENSES.md`); name what trips if the contributor splits them across PRs.
  - [ ] 3.3 Inline the AC-02.4.4 example `LICENSE.yml` snippet immediately after step 2 (so the contributor reads it at the moment they need it). Snippet is a fenced ` ```yaml ` code block, ≤ 12 lines, anchored at the hypothetical `main/util/example-lib.js`. All five required fields populated; one-line YAML comment after the entry naming `first_party` + `notes` as optional. **The snippet is the only place in the section where YAML is rendered**; do not also paste the four-folder corpus (would balloon the section without adding value).
  - [ ] 3.4 Validate the snippet via the AC-02.4.4 worktree-friendly parser smoke gate. Record the captured exit code (`EXIT_DRIFT = 1` = parses cleanly; `EXIT_SCHEMA = 2` = broken). If the worktree has no `node_modules` (Paperclip-isolated workspace), document the absence verbatim per Epic-1 retrospective §4.5; the CI run on the PR is the binding evidence in that case (the script itself is zero-dep and runs with bare `node`, so a vanilla `node scripts/build-licenses.mjs --check` should still execute even without `node_modules` — try this path first).

- [ ] **Task 4 — Author the failure-mode callout + the "Why this contract exists" cross-reference (AC: #3, #5, #7)**
  - [ ] 4.1 The failure-mode callout (AC-02.4.3) follows step 4 and is set off by a heading (e.g. `**If you skip step 3:**` bolded inline, or a small `> Tip:` blockquote — Dev's pick; document the chosen visual treatment in the PR description). Body: 2–3 sentences. Quote (a) the exit code (1) + (b) the unified-diff stderr shape per `scripts/build-licenses.mjs:23-27` + (c) the recovery command (`npm run licenses:build && git add LICENSES.md`).
  - [ ] 4.2 Add the AC-02.4.5 "Why this contract exists" cross-reference. Two acceptable shapes (Dev picks; documents in PR description):
    - **(α)** Inline in the lead paragraph: `… (designed per ADR-008; see _bmad-output/planning-artifacts/architecture.md §5 for the rationale).`
    - **(β)** Standalone trailing paragraph after the failure-mode callout: `**Why this contract exists.** ADR-008 ("LICENSES.md is generated from per-folder metadata, CI-verified") opted for a generator + per-folder metadata + CI gate over a hand-edited LICENSES.md because the implicit "remember to update LICENSES.md" contract had already failed (a 13-line file that ought to have ~25 entries). See _bmad-output/planning-artifacts/architecture.md §5 (Decision + Consequences §"Drift resistance").`
    - **Recommendation: (β)** for discoverability — a standalone paragraph is easier for a reader doing a one-click lookup. Fits AC-02.4.5's discoverability test (one click to ADR-008 from this section).
  - [ ] 4.3 Add the AC-02.4.7 cross-link in step 1's `tests/assets/` sub-bullet using the anchor form `[Re-deriving the test-fixture literals after a tests/assets/ change](#re-deriving-the-test-fixture-literals-after-a-testsassets-change)`. The anchor matches the standard markdown-to-HTML anchor convention for the Story 3.2 H2 / H3 heading text. Document in the PR whether Story 3.2 has shipped at merge time (anchor resolves) or not (dangling — acceptable per AC-02.4.7).

- [ ] **Task 5 — §16 anti-pattern grid + scope guard (AC: #9, #10)**
  - [ ] 5.1 Author the 17-row anti-pattern grid (one row per `_bmad-output/project-context.md` §16 item) in the Dev Agent Record's "Anti-pattern audit" sub-section. Most rows are N/A for a docs-only PR; cite the `git diff --stat` output as binding evidence for the scope-guard rows (§16.10, §16.5, §16.6, §16.8). Mark §16.9 N/A-with-evidence per Epic-1 retrospective §4.5 (no `--no-verify`; Paperclip worktree may lack `node_modules` — CI is the binding evidence).
  - [ ] 5.2 Run the AC-02.4.10 scope check via `git diff --stat origin/main..HEAD` at PR-open time. Output MUST show only the three files named in AC-02.4.10. Paste the verbatim output into the PR description.

- [ ] **Task 6 — Sprint-status flip + `last_updated:` refresh (AC: #10)**
  - [ ] 6.1 At CS commit time (this PR — John): flip `_bmad-output/implementation-artifacts/sprint-status.yaml` `2-4-document-the-add-a-new-vendored-library-workflow-in-docs-development-guide-md` from `backlog` to `ready-for-dev`. Refresh the file-header `# last_updated:` comment AND the YAML body `last_updated:` line to name [DEE-239](/DEE/issues/DEE-239) + this story file's creation. (This task is **already in-flight** as part of the CS heartbeat — Paige does NOT re-do it at DS time.)
  - [ ] 6.2 At DS handoff PR (Paige): flip the same key from `ready-for-dev` → `done`. Refresh `last_updated:` again to name the DS issue + the merging PR number.

- [ ] **Task 7 — PR open + Self-Review + Board (AC: all)**
  - [ ] 7.1 Open the PR titled `docs(bmad): Story 2.4 — add-a-new-vendored-library workflow in docs/development-guide.md (DEE-XXX)` (replace XXX with the DS dev issue number — see "Dev follow-up" below; CS issue is [DEE-239](/DEE/issues/DEE-239) but the PR is opened on the DS issue, not this one). PR description includes: AC-02.4.1..AC-02.4.12 checklist (all 12), the new section pasted verbatim under a `### Section preview` block (so Reviewer sees it without leaving the PR), the AC-02.4.4 parser smoke gate output, the 17-row §16 anti-pattern grid, the AC-02.4.10 `git diff --stat` output, the AC-02.4.7 link-status statement (anchor resolves vs dangling), the AC-02.4.4 example-snippet exit-code capture.
  - [ ] 7.2 Self-Review per `_bmad-output/project-context.md` §15 step 1. PASS gate is: 12/12 ACs ticked + the AC-02.4.10 scope check is empty (other than the three named files) + the AC-02.4.4 parser smoke gate ran or was waived per Epic-1 retrospective §4.5.
  - [ ] 7.3 On Self-Review PASS, file the post-merge Review-Board child issue per `_bmad-output/sops/review-protocol-severity-p1-carve-out.md` (Sage Round-1 Board, severity-tracked). For docs-only PRs the Board is single-pass; budget for ≤ 2 P3 doc-numerology nits to fold per AC-02.4.12.
  - [ ] 7.4 Per CEO policy DEE-113 + `_bmad-output/project-context.md` §15: PR waits for Copilot review + walks each thread (validate → fix → reply → resolve) before merge. Termination: convergence OR 5-round substantive-fix cap with DEFER follow-up issue (per §15 step 7). Docs-only PRs typically converge in 1–2 rounds.

- [ ] **Task 8 — Cross-checks before merge (AC: #6, #7, #11)**
  - [ ] 8.1 Re-run the AC-02.4.6 reachability test: render `docs/development-guide.md` (e.g. `npx markdown-toc docs/development-guide.md` or any markdown viewer) and confirm the new H3 anchor `#adding-a-new-vendored-library-or-third-party-asset` is generated. Auto-generation should hold per the standard markdown-to-HTML rules (lowercase, hyphens, strip punctuation); if the renderer used by the project diverges, document the actual generated anchor in the PR.
  - [ ] 8.2 Re-run the pre-edit grep audit at PR-open time (Task 1.10) — output MUST now have **exactly one new match** in `docs/development-guide.md` (the new section's heading). Pre/post measurable per Epic-1 retrospective §5.3.
  - [ ] 8.3 Confirm `npm test` passes locally (or document the worktree-no-`node_modules` exception per AC-02.4.11 + Epic-1 retrospective §4.5). The `licenses:check` part of the suite is particularly relevant — it should exit 0 (no drift; this story does not touch metadata or `LICENSES.md`).

---

## Dev Notes

### Project context (binding)

- **Story role:** **A5 — Stream-A's fifth and final item** (closes Epic-2). Single doc-deliverable left before `epic-2-retrospective: optional → done`.
- **Sequencing:** Stories 2.1 (DEE-84 / PR #19) + 2.2 (DEE-92 / PR #23) + 2.3 (DEE-124 / PR #36) all `done` and on `main`; Story 2.4 is unblocked. Sibling docs-trio (Stories 3.2 + 6.2) is parallel, not a prerequisite — but the Story 6.2 spec depends on Story 2.4's heading text + slot order (per AC-02.4.1's heading-depth rationale), so Story 2.4 lands before 6.2 in the merge order.
- **CS (this story file):** John (PM) creates story file under `_bmad-output/implementation-artifacts/` (THIS commit) + flips `2-4-…: backlog → ready-for-dev` in sprint-status.yaml.
- **DS (next):** Paige (tech-writer agent — `6a357e7b-40a1-422f-b967-e35d0251cc10`) implements the docs section per ACs above; opens a single PR; runs Self-Review + Board per `_bmad-output/sops/review-protocol-severity-p1-carve-out.md`. Standard CS-then-dev handoff — CTO triage ([DEE-149](/DEE/issues/DEE-149) Risk-1) named Paige as the natural owner since the doc-trio (3.2 / 6.2 / 2.4) is tech-writer scope.

### Pre-flight reads (binding) — Epic-1 retrospective §5.5 carry-over

Path-resolution at CS time is **already done by John** for AC-02.4.1's insertion-point line numbers (verified live against `main` HEAD on 2026-04-29; line numbers may shift between this CS commit and the DS PR if a sibling commit lands on `main` first — Paige re-verifies at Task 2.1 time). The pre-flight grep audit (Task 1.10) is **blocking**; it must run at DS-start.

1. **`_bmad-output/planning-artifacts/architecture.md` §5 ADR-008** — full text. Decision (steps 1–5), Schema reference (lines 240–250), Consequences "+/-" bullets (lines 273–279), Independent revertibility (lines 283–287). Cross-referenced from the new section per AC-02.4.5.
2. **`_bmad-output/planning-artifacts/prd.md` §FR-02** (lines 333–339) — AC-02.1..AC-02.4. NFR-08 (line 447) — docs-freshness.
3. **`_bmad-output/project-context.md`** — §4 (module-boundary table), §11 (pre-commit hook), §16 (17-item anti-pattern list), §17 (brownfield caveats). The Common Workflows section at §15 is the canonical "how to extend X" register the new section parallels.
4. **`docs/development-guide.md`** — current structure (H2 / H3 hierarchy under `## Common Workflows` at `:123`; existing siblings at `:125`, `:133`, `:141`).
5. **`scripts/build-licenses.mjs`** — file-header comment (lines 1–28) + exit-code legend (line 21) + drift-diff marker convention (lines 23–27) + `LICENSE_YML_FILES` (lines 39–44) + `defaultOnFail` / `failSchema` / `failIO` (lines 88–120).
6. **`_bmad-output/implementation-artifacts/2-3-wire-licenses-check-into-npm-test-ci-drift-gate.md`** — Story 2.3 spec; particularly AC-02.3.1 (the `npm test` wire-in pattern) + AC-02.3.7 (drift-diff format the failure-mode callout cross-references).
7. **`_bmad-output/implementation-artifacts/3-2-document-the-fixture-drift-re-derivation-procedure-in-docs-development-guide-md.md`** — Story 3.2 spec; AC-03.2.5 (Story 3.2 already commits to NOT duplicating `tests/assets/LICENSE.yml` provenance — Story 2.4 reciprocates by linking 3.2's heading per AC-02.4.7).
8. **`_bmad-output/implementation-artifacts/6-2-document-the-cite-the-16-item-number-reviewer-workflow-in-docs-development-guide-md.md`** — Story 6.2 spec; AC-06.2.1 (its insertion point depends on Story 2.4's heading text + slot order — the H3 heading + the slot in AC-02.4.1 are deliberately exact).
9. **`_bmad-output/implementation-artifacts/epic-1-retrospective.md`** — §5 carry-overs (5 lifted patterns); §4.5 (Paperclip-worktree no-`node_modules` exception); §6 (doc-scope-extension first-instance pattern). All five carry-overs apply to this story; mapped 1:1 to ACs in the matrix below.

### Carry-overs from Epic-1 retrospective §5 — explicit AC mapping

| Retrospective carry-over | Source | Applied in this story via |
|---|---|---|
| **§5.1 — Pre-edit grep audit** | `epic-1-retrospective.md:127` | Task 1.10 (`git grep -nE 'Adding a new vendored\|new vendored library\|build-licenses\|licenses:build' docs/`) + Task 8.2 (post-edit re-run, expects exactly one match — pre/post measurable). |
| **§5.2 — §16 anti-pattern audit grid** | `epic-1-retrospective.md:128` | AC-02.4.9 + Task 5.1 (17-row grid in Dev Agent Record). First docs-only story to reuse the grid; mark most rows N/A-with-evidence per docs scope. |
| **§5.3 — Pre/post measurable + worktree-friendly fallback** | `epic-1-retrospective.md:129` | AC-02.4.4 + Task 3.4 (parser smoke gate via `node scripts/build-licenses.mjs --check`; zero-dep so works in Paperclip worktree without `node_modules`; capture `EXIT_DRIFT` vs `EXIT_SCHEMA` as the gate output). Pre/post pair: Task 1.10 grep (zero matches → exactly one match). |
| **§5.4 — Round-1 Board ≤ 2 P3 fold-in** | `epic-1-retrospective.md:130` | AC-02.4.12 + Task 7.3 fold-in budget rule (≤ 2 P3 nits → fixup commit; > 2 OR any P0/P1/P2 → separate follow-up issue). |
| **§5.5 — Path-resolution at CS time** | `epic-1-retrospective.md:131` | AC-02.4.1 insertion-point line numbers are **already verified live** against `main` HEAD by John in this CS commit (`docs/development-guide.md:123 / :125 / :133 / :141 / :145 / :147` confirmed at 2026-04-29). Task 2.1 re-verifies at DS time (gentle defence-in-depth; line numbers may have shifted if sibling docs-trio members merged first). |

### Anti-pattern audit map (`_bmad-output/project-context.md` §16) — pre-DS sketch

| # | Item | Default audit for docs-only PR | Notes |
|---|---|---|---|
| 16.1 | No new `window.*` global | N/A — docs file | `git diff --stat` shows only `docs/development-guide.md` + sprint-status + this story file |
| 16.2/3 | No new IPC channel | N/A — docs file | Same |
| 16.4 | No new UI framework | N/A — docs file | Same |
| 16.5 | No vendored-util mod | N/A — `main/util/` untouched | AC-02.4.10 scope guard |
| 16.6 | No `_unused/` import | N/A — no code | Same |
| 16.7 | No decorator transform | N/A | Same |
| 16.8 | No `// @ts-ignore` | N/A — no code | Same |
| 16.9 | No `--no-verify` | **Verify**: Paperclip worktree may lack `node_modules`; CI is binding evidence per Epic-1 retrospective §4.5 | Quote the §4.5 wording verbatim in the Dev Agent Record |
| 16.10 | No `tests/assets/*.svg` re-derive | N/A — `tests/` untouched | AC-02.4.10 scope guard |
| 16.11 | No mm/inch double-convert | N/A | Same |
| 16.12 | No `BrowserWindow` for external URLs | N/A | Same |
| 16.13 | No HTTP server / telemetry / DB | N/A | Same |
| 16.14 | No Windows-only assumption | N/A | Same |
| 16.15 | No ESLint global-ignore change | N/A — `eslint.config.mjs` untouched | AC-02.4.10 scope guard |
| 16.16 | No new spinner glyph | N/A | Same |
| 16.17 | No closer-PR force-push | N/A — Phase-4 dev PR, not a closer | Phase-5 SOP §19 not applicable here |

### Sprint risk callouts

- **R1 (Low / Low) — section heading text drift between Story 2.4 author time + Story 6.2 DS time.** AC-02.4.1 nails the heading to `### Adding a new vendored library or third-party asset`. Story 6.2 reads this heading verbatim (its AC-06.2.1 line). Mitigation: do NOT change the heading at DS time; if a Reviewer asks for a different heading, push back with the Story 6.2 dependency.
- **R2 (Low / Low) — Story 3.2 anchor lands differently than predicted.** AC-02.4.7 uses the standard markdown-to-HTML anchor convention for Story 3.2's H2 / H3. If Story 3.2's renderer produces a different anchor at merge time, the link is dangling. Mitigation: dangling links are acceptable per AC-02.4.7; self-resolves once 3.2 lands. Document the chosen approach in the PR.
- **R3 (Low / Low) — `docs/development-guide.md` line numbers shift before DS.** AC-02.4.1 line numbers are verified at CS time (2026-04-29). Mitigation: Task 2.1 re-verifies at DS-start. If a sibling docs-trio member lands first, the new H3 still slots after `### Adding a new export format` (the H3 heading is the load-bearing reference, not the line number).
- **R4 (Low / Low) — Reviewer requests duplicating provenance from `tests/assets/LICENSE.yml` into the section.** AC-02.4.7 forbids this (Story 3.2's AC-03.2.5 is the symmetric rule). Mitigation: cite AC-02.4.7 + the Epic 3 / Epic 2 architectural-coordination note at `_bmad-output/planning-artifacts/epics.md:468`.
- **R5 (Medium / Low) — doc-scope-extension temptation.** Epic-1 retrospective §6 first-instance pattern. The new section may surface a small wording tweak in `docs/asset-inventory.md` §168–171 ("Asset-licence paperwork") — it is now PARTIALLY-resolved by the FR-02 LICENSE.yml + LICENSES.md pipeline. **Do NOT fold this here**; AC-02.4.10 forbids `docs/asset-inventory.md` edits. File a follow-up issue if the wording feels stale, link from the PR description, defer to a separate doc-hygiene PR.

### Bundle Polish (placeholder for DS to fill)

After Round-1 Board returns, Paige records the fold-in vs separate-follow-up decision per AC-02.4.12 here. ≤ 2 P3 nits with no logic / cross-reference / command-correctness impact → fixup commit; otherwise → separate follow-up issue.

### Project Structure Notes

- **Insertion location:** `docs/development-guide.md` `## Common Workflows` (`:123`), AFTER `### Adding a new export format` (`:141-145`), BEFORE `## Editor & Tooling` (`:147`).
- **No new files created in `docs/`.** No edit to `docs/index.md` (AC-02.4.6 — auto-generated TOC). No edit to other `docs/*.md`.
- **Files touched on the DS PR:** `docs/development-guide.md` (the new section), `_bmad-output/implementation-artifacts/sprint-status.yaml` (status flip + `last_updated:` refresh), this story file (Dev Agent Record sub-sections populated).

### Testing standards summary

- **No new tests.** Docs-only PR.
- **Pre-merge verification:** the AC-02.4.4 parser smoke gate is the binding pre/post measurable. CI run on the PR is the binding evidence for AC-02.4.11.
- **NFR-08 (docs-freshness):** every cross-reference in the new section MUST be `git grep`-verifiable at write time. Specifically: ADR-008 §5 ("Decision" + "Schema reference" + "Consequences"); `scripts/build-licenses.mjs:21` (exit-code legend); `scripts/build-licenses.mjs:23-27` (drift-diff convention); `scripts/build-licenses.mjs:39-44` (`LICENSE_YML_FILES`); `_bmad-output/planning-artifacts/architecture.md:273` (drift-resistance bullet); `_bmad-output/planning-artifacts/architecture.md:424` (new-root risks row).

---

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` §"Story 2.4" lines 425–453 — story foundation + ACs]
- [Source: `_bmad-output/planning-artifacts/architecture.md` §5 ADR-008 lines 218–292 — Decision / Schema reference / Consequences / Independent revertibility]
- [Source: `_bmad-output/planning-artifacts/prd.md` §FR-02 lines 333–339 — AC-02.1..AC-02.4; NFR-08 line 447 — docs-freshness]
- [Source: `_bmad-output/project-context.md` §4 (module-boundary table) + §11 (pre-commit hook) + §16 (anti-pattern grid) + §17 (brownfield caveats)]
- [Source: `docs/development-guide.md` lines 123–147 — `## Common Workflows` chapter + three sibling `### Adding a new …` H3 headings]
- [Source: `scripts/build-licenses.mjs` lines 1–80 — file-header + exit-code legend + drift-diff marker convention + `LICENSE_YML_FILES`]
- [Source: `LICENSES.md` lines 1–25 — canonical artefact the contributor is regenerating]
- [Source: `main/util/LICENSE.yml` — anchor for the AC-02.4.4 example snippet's realistic shape]
- [Source: `_bmad-output/implementation-artifacts/2-3-wire-licenses-check-into-npm-test-ci-drift-gate.md` — Story 2.3 spec; predecessor; AC-02.3.1 + AC-02.3.7]
- [Source: `_bmad-output/implementation-artifacts/3-2-document-the-fixture-drift-re-derivation-procedure-in-docs-development-guide-md.md` — Story 3.2 spec; AC-03.2.5 cross-coupling note]
- [Source: `_bmad-output/implementation-artifacts/6-2-document-the-cite-the-16-item-number-reviewer-workflow-in-docs-development-guide-md.md` — Story 6.2 spec; AC-06.2.1 dependency on Story 2.4's heading text]
- [Source: `_bmad-output/implementation-artifacts/epic-1-retrospective.md` §5 — 5 carry-overs explicitly applied here]
- [Source: `_bmad-output/implementation-artifacts/sprint-status.yaml` `risks.active.risk-1-doc-trio-cto-escalation-2026-04-29` — CTO escalation that filed [DEE-239](/DEE/issues/DEE-239)]
- [Source: `_bmad-output/sops/review-protocol-severity-p1-carve-out.md` — Sage Round-1 Board carve-out for severity.max=P1 → APPROVED]
- [Source: CTO triage of [DEE-149](/DEE/issues/DEE-149) Risk-1 → [DEE-239](/DEE/issues/DEE-239) — this CS issue]

---

## Dev Agent Record

### Agent Model Used

(Paige populates at DS time — agent id `6a357e7b-40a1-422f-b967-e35d0251cc10`, tech-writer agent.)

### Debug Log References

(Paige populates at DS time — particularly the AC-02.4.4 parser smoke gate output: `EXIT_DRIFT` (snippet parses) vs `EXIT_SCHEMA` (snippet broken; fix it). And the AC-02.4.11 `npm test` outcome OR the worktree-no-`node_modules` exception evidence per Epic-1 retrospective §4.5.)

### Completion Notes List

(Paige populates at DS time — particularly the AC-02.4.7 link-status statement: anchor resolves OR dangling. The AC-02.4.5 cross-reference shape: (α) inline OR (β) standalone paragraph. The AC-02.4.10 `git diff --stat` output. The 17-row §16 anti-pattern grid. The AC-02.4.12 Round-1 Board fold-in vs split decision.)

### File List

(Paige populates at DS time — exactly three files: `docs/development-guide.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`, this story file.)

### Change Log

(Paige populates at DS time.)
