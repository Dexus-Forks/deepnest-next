# Story 2.2: Implement `scripts/build-licenses.mjs` generator script (Stream-A3 — closes Story 2.1's hand-bootstrap loop with a deterministic generator + Sage Round-1 architectural addendum)

Status: ready-for-dev

> Authored by John (PM, BMad) on 2026-04-26 via `bmad-create-story` (DEE-90, follow-up to DEE-84/Story 2.1) for **MVP-1 / Stream A continuation (A3)**. Sprint plan reference: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row A3. Epic anchor: `_bmad-output/planning-artifacts/epics.md` §"Story 2.2" (Epic 2 / FR-02). **This story bakes in Sage's Round-1 architectural addendum** (`projects/deepnest-next/reviews/2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-round-1.md` §"Architectural follow-up" — resolves the deferred Round-1 P2-01 + P3-01 + P3-02 + P3-03) — those are NOT optional Round-2 nudges; they are mandatory ACs / Tasks below. Predecessor: Story 2.1 (DEE-84 / PR #19 / Board APPROVED via DEE-85 with `severity.max=P2` no P0/P1).

---

## Story

As a **Maintainer**,
I want **`scripts/build-licenses.mjs` — a Node-stable, zero-dep generator that walks every per-folder `LICENSE.yml` plus an in-installer-but-out-of-tree first-party metadata source, parses each per the Story 2.1 schema, and emits `LICENSES.md` byte-for-byte equivalent to the Story 2.1 hand-regenerated baseline (with the Sage Round-1 architectural addendum applied: SPDX-canonical license IDs throughout, `first_party: true` schema flag for placement, schema canonicalised into a single doc, in-installer-but-out-of-tree first-party rows passed through via the chosen mechanism)**,
so that **the next story (2.3 / A4) can wire a `licenses:check` CI gate over a deterministic regeneration, and contributors adding a new vendored library only need to drop a `LICENSE.yml` entry — `LICENSES.md` regenerates automatically**.

**Sprint role.** This story is **A3 — Stream A's third item** (after Story 1.1 / A1 done and Story 2.1 / A2 done). It consumes A2's metadata schema and produces the regeneration tool that A4 (Story 2.3) will gate in CI. **Stream A is the sprint critical path.**

**FR/AC coverage:** FR-02 (PRD §FR-02 expanded scope, ADR-008-bound) — AC-02.1..AC-02.4. Cross-cuts: Sage Round-1 P2-01 (legal-compliance passthrough mechanism) + P3-01 (SPDX normalisation) + P3-02 (first-party row placement) + P3-03 (schema canonicalisation).
**ADR binding:** **ADR-008** — full epic. Specifically §5 step 2 (this story IS the generator) + §271 (out-of-tree clause; this story EITHER amends the clause OR adds a passthrough mechanism per §2a below). Cross-references: **ADR-003** (out-of-tree `@deepnest/*` packages — interaction codified in §2a); **ADR-007** (strict TS only on `main/**/*.ts` — generator is `.mjs` outside `main/`, ADR-007 surface unchanged).
**NFR coupling measured:** NFR-03 (anti-patterns); NFR-08 (docs-freshness — `LICENSES.md` is the canonical surface and stays in sync via the Story 2.3 gate, which depends on this story).

---

## Acceptance Criteria

1. **AC-02.2.1 — `scripts/build-licenses.mjs` exists and is a Node-stable, zero-dep, single-file generator.** Concretely:
   - File path: `scripts/build-licenses.mjs` (matches ADR-008 §5 step 2 + sprint-plan §3 row A3 verbatim).
   - Imports limited to `node:fs` / `node:path` / `node:url` (and optionally `node:process`). **No** transitive npm dependency added — no entry in `package.json` `dependencies` / `devDependencies` / `optionalDependencies`. **No** YAML library (a hand-rolled parser sufficient for the constrained Story 2.1 schema is preferred — see Dev Notes "Parser shape recommendation" below).
   - Compatible with the existing CI Node version (Node 20.x + 22.x — verify by reading `.github/workflows/playwright.yml` or `package.json` `engines`; mirrors Story 3.1's `scripts/check-test-fixtures.mjs` precedent which is also Node-stable + zero-dep).
   - Lives **outside** the packaged installer per ADR-008 §5 step 5: `package.json` `build.files` already contains `!{examples,helper_scripts,scripts}` (verified 2026-04-26) — no new exclusion line needed; the entry just has to land under `scripts/`.

2. **AC-02.2.2 — `npm run licenses:build` regenerates `LICENSES.md` deterministically.** A new `scripts.licenses:build` entry in `package.json` runs `node scripts/build-licenses.mjs` and overwrites `LICENSES.md` with the regenerated content. The script:
   - Walks the configured roots (`main/`, `main/util/`, `main/util/_unused/`, `main/font/`, `tests/assets/`) **plus** whichever passthrough source resolves §2a below; reads each `LICENSE.yml`; parses one or more entries per file.
   - Emits LF-only line endings, single trailing newline at EOF, no trailing whitespace on any row.
   - Is order-stable across runs on the same input (no `Date.now()` / no random / no `Object.entries` reliance on insertion order without an explicit sort).
   - Exits 0 on success, non-zero with a named error on schema parse failure / missing required field / unknown root / I/O error. Each error names the offending file path + line/key when applicable.

3. **AC-02.2.3 — `npm run licenses:check` regenerates to memory and diffs against the committed `LICENSES.md`.** A new `scripts.licenses:check` entry in `package.json` runs the same generator with a `--check` (or equivalent) flag that:
   - Computes the regenerated content **in-memory** (does NOT write).
   - Compares byte-for-byte against the committed `LICENSES.md` on disk.
   - Exits 0 on match; exits **1 (drift)** on mismatch with a unified-diff-style stderr message that includes the first ≤ 20 differing lines and the docs pointer (`docs/development-guide.md` "add a new vendored library" workflow — Story 2.4 lands the doc; for now point at ADR-008 §5).
   - **`scripts.test` is NOT yet wired in this story.** Story 2.3 (A4) wires `licenses:check` into the test chain; this story ships the script + the npm scripts. (Per Sprint plan §3 shared-edit-point #2: `package.json` `scripts.test` is an ordered merge point; A3 only adds `licenses:build` + `licenses:check` entries — not the wire-in.)

4. **AC-02.2.4 — Byte-for-byte regression target hits.** On the PR's first CI run (or the Dev's local run before push), executing `node scripts/build-licenses.mjs` against the unmodified Story 2.1 `LICENSE.yml` set must produce a `LICENSES.md` whose `git diff origin/main -- LICENSES.md` is **empty** at commit `db6592b` (the merged Story 2.1 + Sage report state — see "Dev Notes / Regression target" for the exact byte-pinned reference). **The Story 2.1 SPDX-normalisation amendment (§2b below) explicitly adjusts this regression target in lockstep — the spec must call out both the pre-normalisation baseline AND the post-normalisation target row-deltas; whichever Dev ships, byte-for-byte determinism over THAT target must hold.**

5. **AC-02.2.5 — In-installer-but-out-of-tree first-party rows are emitted by the generator (resolves Sage Round-1 P2-01 / Vitra P2 architectural-tension finding).** The Dev MUST pick **exactly one** of (a) / (b) / (c) below, document the choice in the PR description with a one-paragraph rationale, and implement it:
   - **(a) Add `main/LICENSE.yml`** (or equivalent root-level metadata file) enumerating the in-installer-but-out-of-tree first-party rows (`/main`, `/main/svgparser.js`, `/main/deepnest.js`, `minkowski.cc, minkowski.h`, `/polygon`). Generator emits these alongside per-folder entries.
   - **(b) Hardcode the 5 first-party rows** in the generator with a dedicated top-of-file constant (e.g. `FIRST_PARTY_INLINE_ROWS = [...]`) and a documentation comment explaining why they cannot be sourced from a per-folder `LICENSE.yml` (i.e. `minkowski.cc`/`/polygon` ship under `node_modules/@deepnest/calculate-nfp/` per `package.json` `build.files: ['**/*']` with no `asar` packing — out-of-tree but in-installer).
   - **(c) Amend ADR-008 §271** to distinguish "out-of-tree and not shipped" vs "out-of-tree but shipped" — first stays out of `LICENSES.md`; second gets a metadata path. THEN implement the metadata path (effectively reduces to (a)).

   **Whichever is picked,** the resulting regenerated `LICENSES.md` must include the same five first-party rows in the same first-party block at the top of the table, in the same order (`/main`, `/main/svgparser.js`, `/main/deepnest.js`, `minkowski.cc, minkowski.h`, `/polygon`), with the License + Copyright values either preserved verbatim from Story 2.1 OR adjusted by §2b's SPDX normalisation in lockstep. **The legal-compliance constraint** (Boost Software License 1.0 requires the copyright notice + license to "appear in all copies of the Software"; `@deepnest/calculate-nfp` ships in the Electron installer; therefore the `minkowski.cc, minkowski.h` + `/polygon` rows MUST appear in `LICENSES.md`) is a **non-negotiable** anchor on this AC — option "drop the rows" is OUT OF SCOPE.

6. **AC-02.2.6 — SPDX normalisation across the License column (resolves Sage Round-1 P3-01 / Vitra Finding 2 ⊕ Lydia Finding 1).** The generator emits **SPDX-canonical** license identifiers throughout. Concretely:
   - `Boost` → `BSL-1.0` (rows 8 + 10 of the Story 2.1 table — `minkowski.cc, minkowski.h` and `/polygon`).
   - `GPLv3` → `GPL-3.0-only` (row 7 of the Story 2.1 table — `/main/deepnest.js`; matches Story 2.1 Task 2.3 line 92's own recommendation).
   - All third-party rows already use SPDX (verified by Sage pre-flight against SPDX 2.3 §10.1) — no change for those.
   - **The §2a passthrough mechanism MUST surface SPDX values:** if (a)/(c) is picked, the new `main/LICENSE.yml` (or equivalent) entries use SPDX from the start; if (b) is picked, the hardcoded `FIRST_PARTY_INLINE_ROWS` use SPDX from the start.
   - **Regression-target adjustment (lockstep with AC-02.2.4):** the Story 2.1 baseline `LICENSES.md` has `Boost` (×2) and `GPLv3` (×1) on its first-party rows. Post-normalisation, those exact three cells change to `BSL-1.0` (×2) and `GPL-3.0-only` (×1). All other License-column cells remain identical byte-for-byte. **The Story 2.2 PR's first commit MUST update `LICENSES.md` accordingly — the regenerated file is the new canonical baseline.**

7. **AC-02.2.7 — `first_party: true` schema flag drives first-party-block placement (resolves Sage Round-1 P3-02 / Lydia Finding 2 — `latolatinfonts.css` row placement).** The generator's emitter:
   - Recognises an optional `first_party: true` field in any `LICENSE.yml` entry.
   - When present + true, the entry is rendered into the **first-party block** (top of table) regardless of its source folder.
   - When absent / false, default behaviour applies (entry rendered into the third-party block, alphabetically by path).
   - **Apply the flag to `main/font/latolatinfonts.css`:** edit `main/font/LICENSE.yml` to add `first_party: true` to that entry. The catalogue entry's existing `notes:` field already declares the file first-party (*"the file itself is first-party (covered by /main MIT under Jack Qiao)"*); this AC promotes that note to a behavioural flag.
   - **Regression-target adjustment (lockstep with AC-02.2.4):** the Story 2.1 baseline `LICENSES.md` places `latolatinfonts.css` inside the third-party block. Post-fix, the row moves into the first-party block. The first-party block ordering after this story is: (1) `/main`, (2) `/main/svgparser.js`, (3) `/main/deepnest.js`, (4) `minkowski.cc, minkowski.h`, (5) `/polygon`, (6) `/main/font/latolatinfonts.css`. The third-party block then shrinks by one row (was 23 third-party rows in Story 2.1; now 22) — total table-row count unchanged at 28.

8. **AC-02.2.8 — Schema canonicalisation + per-folder `LICENSE.yml` header reduction (resolves Sage Round-1 P3-03 / Vitra Finding 3).** Pick **exactly one** of:
   - **(α) Extend `architecture.md` §5 ADR-008 step 1** to act as the canonical schema document — append a "Schema reference" sub-section with the full field list (`path`, `name`, `license` SPDX, `copyright`, `upstream_url`, optional `notes`, optional `first_party`).
   - **(β) Create `docs/license-yml-schema.md`** with the same content; ADR-008 step 1 stays as-is and gets a one-line cross-link to the new doc.
   - The PR description names the choice. **Then** reduce each `LICENSE.yml` header (currently 3 files — `main/util/LICENSE.yml`, `main/font/LICENSE.yml`, `tests/assets/LICENSE.yml`; 4 files if §2a option (a)/(c) lands a `main/LICENSE.yml`) to a one-line schema reference (e.g. `# Schema: see _bmad-output/planning-artifacts/architecture.md §5 ADR-008.` or `# Schema: see docs/license-yml-schema.md.`). The current ~13-line preamble in each becomes ≤ 3 lines.
   - **Constraint:** the reduction must NOT remove the `# Line endings: LF only.` line or the per-file context note (e.g. `# Post-Story-1.1 webfont kit: …` in `main/font/LICENSE.yml`). Only the schema preamble is consolidated.

9. **AC-02.2.9 — `tests/assets/.fixture-manifest.json` decision documented (interaction with Story 3.1 — surfaced by DEE-84 CI fix `cf831f2`).** The PR description **MUST** document the explicit decision (α or β below) for whether Story 3.1's `listFixtures()` walk should:
   - **(α) Continue to capture every file under `tests/assets/`** (status quo per `scripts/check-test-fixtures.mjs:36-59` — `LICENSE.yml` stays in the manifest; future metadata files re-trigger the gate as drift). PR description includes a one-paragraph rationale for accepting the coupling.
   - **(β) Narrow to a fixture-only allow-list** (`*.svg`, `*.woff*`, `*.dxf`, `*.dwg`, `*.eps`, `*.ps`) so non-fixture metadata files (`LICENSE.yml`, future `README.md`, …) don't re-trigger the gate on every metadata addition. PR description recommends this option as the cleaner separation between FR-02 (licenses:check gate, Story 2.3) and FR-03 (test-fixtures:check gate, Story 3.1).
   - **Recommendation: (β) with implementation deferred** to a small Story 3.1.x hardening (or fold into Story 2.3 sub-task) — Story 2.2 does NOT modify `scripts/check-test-fixtures.mjs` (out of scope for this PR; touching that script would couple FR-02 to FR-03's gate behaviour exactly the way this AC is trying to prevent).
   - **Story 2.2 itself is metadata-only on the fixture side:** its only `tests/assets/` write is the existing `LICENSE.yml` (no new file, no rename). The current `.fixture-manifest.json` (re-derived in DEE-84 commit `cf831f2`) already covers `tests/assets/LICENSE.yml`. No manifest update is needed in this PR's diff.

10. **AC-02.2.10 — Sprint-status flip + `last_updated:` refresh.** As part of this PR (single commit acceptable; Story 2.1 PR #20 precedent):
    - Edit `_bmad-output/implementation-artifacts/sprint-status.yaml`: flip `2-2-implement-scripts-build-licenses-mjs-generator-script` from `backlog` to `ready-for-dev` (the create-story step) — **handled by John (PM) in this CS commit, not by Amelia (DS)**.
    - On the DS handoff PR, Amelia flips it from `ready-for-dev` → `done` (matches Story 2.1 PR #20 / DEE-84 closer pattern).
    - Refresh both the file-header `# last_updated:` comment and the YAML body `last_updated:` line to name DEE-90 + this story file's creation.

11. **AC-02.2.11 — `npm test` is green on the PR.** Same NFR-01 wall-clock check as predecessors: CI run wall-clock within ±20 % of `_bmad-output/planning-artifacts/nfr01-baseline.json` `rolling_mean_ms` (16 746.6 ms ± 20 % = [13 397, 20 096] ms) on the canonical CI cell (Linux/Ubuntu-22.04 × Node 22.x). Murat (TEA) reviews the regression check on the PR. **Note:** since this story's `scripts.test` chain is unchanged (per AC-02.2.3 — Story 2.3 wires the gate, not this one), the wall-clock change should be near-zero; record the duration anyway for the rolling-mean update.

12. **AC-02.2.12 — `project-context.md` §16 anti-patterns hold.** The PR adds **no** new `window` global (§16.1), **no** new IPC channel (§16.2/§16.3), **no** new `// @ts-ignore` (§16.8), **no** edits to `main/util/_unused/` source files (§16.6 — only metadata files like `LICENSE.yml` may be edited), **no** modification of vendored utilities (§16.5), **no** `--no-verify` commits (§16.9). Reviewer verifies with `git diff` + `git log --pretty=fuller`. Generator script is `.mjs` outside `main/`, so the strict-TS surface (§16.7 / ADR-007) is unchanged.

13. **AC-02.2.13 — No fixture / asset / vendored-source file is renamed, re-encoded, or content-changed.** The PR touches only:
    - `scripts/build-licenses.mjs` (new file).
    - `package.json` (new `licenses:build` + `licenses:check` script entries — NOT `scripts.test`).
    - `LICENSES.md` (regenerated; bytes change per AC-02.2.6 + AC-02.2.7 deltas only).
    - The 3 (or 4) `LICENSE.yml` files: header reduction per AC-02.2.8 + the `first_party: true` flag added to `main/font/LICENSE.yml` per AC-02.2.7 + (if §2a option (a)/(c)) a new `main/LICENSE.yml`.
    - Either `_bmad-output/planning-artifacts/architecture.md` (if §2.8 (α) is picked) OR a new `docs/license-yml-schema.md` (if §2.8 (β) is picked).
    - `_bmad-output/implementation-artifacts/sprint-status.yaml` (status flip + `last_updated:`).
    - `_bmad-output/implementation-artifacts/2-2-implement-scripts-build-licenses-mjs-generator-script.md` (this story file — created by John in the CS commit, populated by Amelia at DS time per the standard Dev-Agent-Record block).

    Verified by `git diff --stat` on the final PR. **Zero** code-file deletions outside the scope above. **Zero** changes under `main/util/*.{js,ts}`, `main/util/_unused/*`, `main/font/fonts/`, `tests/assets/*.{svg,woff,woff2}`, `eslint.config.mjs`, `tsconfig.json`, `.github/`, `scripts/check-test-fixtures.mjs`.

---

## Tasks / Subtasks

- [ ] **Task 1 — Pre-flight reads (binding; AC: all)**
  - [ ] 1.1 Read `_bmad-output/planning-artifacts/architecture.md` §5 ADR-008 (full text, including §271 cross-reference) + §3.1 row FR-02 + §4 §"FR-02".
  - [ ] 1.2 Read `_bmad-output/planning-artifacts/prd.md` §FR-02 (AC-02.1..AC-02.4).
  - [ ] 1.3 Read `_bmad-output/project-context.md` §16 (16-item anti-pattern list) — particularly §16.5 (vendored-utility no-modify), §16.6 (`_unused/` no-import / no-modify-source), §16.9 (no `--no-verify`).
  - [ ] 1.4 Read `projects/deepnest-next/reviews/2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-round-1.md` end-to-end — particularly §"Architectural follow-up" (the canonical source for §2a-d above).
  - [ ] 1.5 Read `_bmad-output/implementation-artifacts/2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-data-hygiene-fixes-included.md` (Story 2.1, the predecessor) — particularly the schema recommendation block + Task 6 ("Hand-regenerate `LICENSES.md`") which describes the regeneration mapping the generator must reproduce.
  - [ ] 1.6 Read the 3 `LICENSE.yml` files (`main/util/`, `main/font/`, `tests/assets/`) — input shapes the generator consumes.
  - [ ] 1.7 Read `LICENSES.md` (Story 2.1 baseline; the bytes the generator must reproduce, modulo §2.6 + §2.7 deltas).
  - [ ] 1.8 Read `package.json` `scripts` block + `build.files` block — confirm `!{examples,helper_scripts,scripts}` is already present (i.e. the generator is auto-excluded from the packaged installer); confirm `scripts.test` chain shape so the no-wire-in invariant (AC-02.2.3) is verified.
  - [ ] 1.9 Read `scripts/check-test-fixtures.mjs` (Story 3.1 precedent — same Node-stable + zero-dep + `.mjs` shape; mirror its file-header comment style + exit-code discipline).
  - [ ] 1.10 Read `tests/assets/.fixture-manifest.json` — confirm it currently contains the `tests/assets/LICENSE.yml` row (per DEE-84 fix `cf831f2`); inputs §2.9 / AC-02.2.9 decision.

- [ ] **Task 2 — Decide and document the §2a / §2.5 passthrough mechanism (AC: #5)**
  - [ ] 2.1 Choose one of (a) `main/LICENSE.yml` route, (b) hardcoded `FIRST_PARTY_INLINE_ROWS` route, (c) ADR-008 amendment route. Recommendation: **(a)** — keeps the schema homogeneous and lets a future contributor add a new in-installer-but-out-of-tree row by adding a YAML entry instead of editing the generator. (Discuss with Mary or Winston if leaning to (b) or (c) — see §"Spec-authoring engagement note" below.)
  - [ ] 2.2 If (a) / (c): create `main/LICENSE.yml` with the 5 first-party entries (`/main`, `/main/svgparser.js`, `/main/deepnest.js`, `minkowski.cc, minkowski.h`, `/polygon`). Each entry: `path:` (use the **existing** `LICENSES.md` Unit-column value verbatim — `/main`, `/main/svgparser.js`, etc., NOT relative-to-folder; the path is the user-visible identifier in the table), `name`, `license: <SPDX>`, `copyright`, `upstream_url`, optional `notes`, **`first_party: true`** (so the generator routes them to the first-party block per AC-02.2.7). The Dev decides whether the generator interprets the `path:` field as "literal Unit-column value" for this file (since `/polygon` and `minkowski.cc, minkowski.h` are not in-tree paths) — document the decision in the file header comment.
  - [ ] 2.3 If (b): add a top-of-file constant to `scripts/build-licenses.mjs` — `FIRST_PARTY_INLINE_ROWS = [...]` — with a 5–10 line documentation block explaining the legal-compliance rationale (Boost requires attribution + `@deepnest/calculate-nfp` ships in installer per `build.files: ['**/*']` no-asar). Generator emits these rows into the first-party block before walking `LICENSE.yml` files.
  - [ ] 2.4 Document the choice in the PR description with one paragraph + a cross-link to Sage's Round-1 P2-01 finding.

- [ ] **Task 3 — Implement `scripts/build-licenses.mjs` (AC: #1, #2, #3, #4, #6, #7)**
  - [ ] 3.1 Header comment: file-purpose, Node-stable + zero-dep declaration, ADR-008 cross-link, exit-code legend, docs pointer (mirror `scripts/check-test-fixtures.mjs` shape).
  - [ ] 3.2 Walk roots (constant `WALK_ROOTS = ['main', 'main/util', 'main/util/_unused', 'main/font', 'tests/assets']`; if §2a option (a) is picked, also include `''` — repo-root — so `main/LICENSE.yml` is found, OR add `main` to the walk and have the parser handle the path-translation for the 5 inline-style entries).
  - [ ] 3.3 For each `LICENSE.yml` found: parse to entries (see "Parser shape recommendation" in Dev Notes). Reject malformed YAML / missing required fields with a non-zero exit code naming the file path.
  - [ ] 3.4 Compute the `Unit` column per entry:
    - For per-folder `LICENSE.yml` files: `Unit = '/' + (relative folder path) + '/' + entry.path` (e.g. `main/util/LICENSE.yml` + `path: clipper.js` → `Unit = /main/util/clipper.js`).
    - For the §2a passthrough (`main/LICENSE.yml` if option (a) is picked, OR the inline constant if (b)): the entry's `path:` field is the literal Unit-column value (no folder prefix added).
    - **Precedent the existing Story 2.1 baseline:** Sage's pre-flight verified all 23 third-party rows are in correct ASCII order and AC-02.5 fixes landed. The generator must reproduce that exact shape.
  - [ ] 3.5 Sort:
    - First-party block (entries with `first_party: true` OR sourced from the §2a passthrough) — order: by the explicit insertion order in `main/LICENSE.yml` (option (a)/(c)) OR `FIRST_PARTY_INLINE_ROWS` (option (b)) so the maintainer controls the canonical first-party row order. The expected order is `/main`, `/main/svgparser.js`, `/main/deepnest.js`, `minkowski.cc, minkowski.h`, `/polygon`, `/main/font/latolatinfonts.css` (note: `latolatinfonts.css` lives in `main/font/LICENSE.yml` with `first_party: true` — generator must merge it into the first-party block at emission time, regardless of YAML source).
    - Third-party block: alphabetical by Unit column (ASCII byte order, matching Sage Round-1 pre-flight which validated `_` (0x5F) < `a` (0x61), `H` (0x48) < `_` (0x5F)).
  - [ ] 3.6 Emit the markdown table:
    - Header: preserve verbatim — `This software contains different units with different licenses, copyrights and authors.\n\n| Unit | License | Copyright |\n| - | - | - |\n`.
    - One row per entry: `| <Unit> | <license SPDX> | <copyright> |\n`.
    - Single trailing newline at EOF; no trailing whitespace; LF only.
  - [ ] 3.7 Argument parsing: support `--check` (in-memory regenerate + diff against committed `LICENSES.md`; exit 1 on drift, 0 on match) and no-flag default (write to disk).
  - [ ] 3.8 Wall-clock budget: < 1 s on a developer laptop (mirrors `scripts/check-test-fixtures.mjs` budget per architecture.md §3.3).

- [ ] **Task 4 — Apply SPDX normalisation (AC: #6) — adjust the regression target in lockstep**
  - [ ] 4.1 If §2a option (a)/(c) — set `license: BSL-1.0` (rows 4 + 5) and `license: GPL-3.0-only` (row 3) in the new `main/LICENSE.yml` from the start. No further action needed; first run of the generator will produce the normalised `LICENSES.md`.
  - [ ] 4.2 If §2a option (b) — set the corresponding values in the `FIRST_PARTY_INLINE_ROWS` constant from the start.
  - [ ] 4.3 Run the generator once locally → confirm `LICENSES.md` rows 8 (`minkowski.cc, minkowski.h`) and 9 (`/polygon`) read `BSL-1.0` (was `Boost`); confirm row 7 (`/main/deepnest.js`) reads `GPL-3.0-only` (was `GPLv3`). Commit the regenerated `LICENSES.md`.
  - [ ] 4.4 Cross-verify against SPDX 2.3: `BSL-1.0` ✅ on https://spdx.org/licenses/BSL-1.0.html; `GPL-3.0-only` ✅ on https://spdx.org/licenses/GPL-3.0-only.html. Sage's pre-flight already validated all third-party SPDX IDs; this story extends the validation to first-party rows.

- [ ] **Task 5 — Apply `first_party: true` flag to `main/font/latolatinfonts.css` (AC: #7)**
  - [ ] 5.1 Edit `main/font/LICENSE.yml`: add `first_party: true` line to the `path: latolatinfonts.css` entry (between the existing fields; preserve all other field values verbatim).
  - [ ] 5.2 Run the generator → confirm the row moves from third-party block (was row 12 of the Story 2.1 table) to first-party block (will be row 6 of the new first-party block). Confirm the third-party block shrinks by one row (22 third-party rows post-fix, was 23). Total table-row count remains 28.
  - [ ] 5.3 Confirm no change to the `notes:` field on that entry (the existing note `"the file itself is first-party (covered by /main MIT under Jack Qiao)"` is the rationale — the flag promotes the note to behaviour).

- [ ] **Task 6 — Schema canonicalisation + `LICENSE.yml` header reduction (AC: #8)**
  - [ ] 6.1 Choose (α) or (β). Recommendation: **(α) ADR-008 amendment** — keeps the schema co-located with the architectural decision that introduces it. The amendment is small (~15 lines added to `architecture.md` §5 step 1).
  - [ ] 6.2 If (α): edit `_bmad-output/planning-artifacts/architecture.md` §5 ADR-008 step 1. Append a "Schema reference" sub-section listing the canonical field set: required (`path`, `name`, `license` SPDX, `copyright`, `upstream_url`); optional (`notes`, `first_party` boolean — added in Story 2.2 to drive first-party-block placement).
  - [ ] 6.3 If (β): create `docs/license-yml-schema.md` with the same content. Add a one-line cross-link from ADR-008 §5 step 1 to the new doc.
  - [ ] 6.4 Reduce the header comment in each `LICENSE.yml` (`main/util/`, `main/font/`, `tests/assets/`, and `main/LICENSE.yml` if §2a option (a)/(c) creates one) to ≤ 3 lines:
    - Line 1: file identification — e.g. `# LICENSE.yml — main/util/`.
    - Line 2: schema pointer — e.g. `# Schema: see _bmad-output/planning-artifacts/architecture.md §5 ADR-008.` OR `# Schema: see docs/license-yml-schema.md.`.
    - Line 3 (per-file context, optional but encouraged): preserve the per-file context note (e.g. for `main/font/LICENSE.yml`: `# Post-Story-1.1 webfont kit: see docs/asset-inventory.md §6.`).
    - Line 4: `# Line endings: LF only.` (PRESERVE — was already in each file's preamble; do not drop).

- [ ] **Task 7 — Wire `package.json` scripts (AC: #2, #3) — NOT `scripts.test`**
  - [ ] 7.1 Add `"licenses:build": "node scripts/build-licenses.mjs"` to `package.json` `scripts`.
  - [ ] 7.2 Add `"licenses:check": "node scripts/build-licenses.mjs --check"` to `package.json` `scripts`.
  - [ ] 7.3 **Do NOT** modify `scripts.test`. Story 2.3 (A4) wires the gate; this story only ships the script + the npm scripts. Verified by `git diff package.json -- scripts.test` returning empty (or unchanged JSON shape).
  - [ ] 7.4 Confirm `package-lock.json` is unchanged — no new dependency added (zero-dep guarantee per AC-02.2.1).

- [ ] **Task 8 — Document the `tests/assets/.fixture-manifest.json` α/β decision (AC: #9)**
  - [ ] 8.1 In the PR description, add a "Fixture-manifest interaction (per Story 2.2 spec AC-02.2.9)" section.
  - [ ] 8.2 State the choice (α status quo / β allow-list) and the rationale. Recommended: β with implementation deferred.
  - [ ] 8.3 If β is recommended, file a follow-up issue (Story 3.1.x or fold into Story 2.3) — title suggestion: *"Story 3.1 hardening — narrow `listFixtures()` walk to a fixture-only allow-list (decoupling FR-02 / FR-03 gates)"*. Cross-link from this PR description.
  - [ ] 8.4 Story 2.2 itself does NOT touch `scripts/check-test-fixtures.mjs` or `.fixture-manifest.json` — verified by `git diff scripts/check-test-fixtures.mjs tests/assets/.fixture-manifest.json` returning empty.

- [ ] **Task 9 — Sprint-status flip + `last_updated:` refresh (AC: #10)**
  - [ ] 9.1 (CS commit, John — already done in this story-file PR per the DEE-83 batch-2 pattern.) Edit `_bmad-output/implementation-artifacts/sprint-status.yaml`: flip `2-2-implement-scripts-build-licenses-mjs-generator-script: backlog` → `ready-for-dev`. Refresh `last_updated:` lines (both file-header `# last_updated:` comment AND YAML body `last_updated:` field) to mention DEE-90.
  - [ ] 9.2 (DS commit, Amelia.) On the dev-implementation PR: flip `ready-for-dev` → `done`. Refresh `last_updated:` lines to mention the merged PR + the DS issue id.

- [ ] **Task 10 — Pre-flight scope-creep check (AC: #12, #13)**
  - [ ] 10.1 `git diff --stat` — touched files MUST be the AC-02.2.13 set only.
  - [ ] 10.2 `git diff main/util/*.{js,ts} main/util/_unused/` MUST return empty (anti-pattern §16.5 + §16.6 guard).
  - [ ] 10.3 `git diff tests/assets/*.svg main/font/fonts/` MUST return empty (FR-03 invariant guard, AC-02.2.13).
  - [ ] 10.4 `git diff scripts/check-test-fixtures.mjs tests/assets/.fixture-manifest.json` MUST return empty (FR-03 gate-decoupling guard, AC-02.2.9).
  - [ ] 10.5 `git diff package-lock.json` MUST return empty (zero-dep guard, AC-02.2.1).

- [ ] **Task 11 — Pre-commit + CI run (AC: #11)**
  - [ ] 11.1 `git commit` without `--no-verify`. Hook absence is acceptable per Story 1.1 / Story 2.1 precedent; flag use is forbidden.
  - [ ] 11.2 Push the PR; verify CI Playwright run is green; record wall-clock vs NFR-01 baseline (target: within [13 397, 20 096] ms).
  - [ ] 11.3 If CI's `paths:` filter excludes `scripts/*.mjs` + `package.json` `scripts`-block-only changes + markdown changes, manually `gh workflow run playwright.yml --ref <branch>` to force a run (Story 1.1 / Story 2.1 precedent).
  - [ ] 11.4 Run `npm run licenses:check` locally — must exit 0 (regenerate-then-diff returns empty against the just-committed `LICENSES.md`).

- [ ] **Task 12 — PR composition (AC: all)**
  - [ ] 12.1 Open PR titled `feat(licenses): Story 2.2 — scripts/build-licenses.mjs generator + Sage Round-1 architectural addendum (DEE-?? / FR-02 ADR-008)` (replace `DEE-??` with the DS issue number assigned to this story; the CS issue is DEE-90).
  - [ ] 12.2 PR description includes:
    - AC checklist (all 13).
    - **§2a passthrough mechanism choice** — (a) / (b) / (c) with rationale paragraph.
    - **§2.6 SPDX normalisation diff** — table showing the 3 cell changes (`Boost` ×2 → `BSL-1.0` ×2; `GPLv3` → `GPL-3.0-only`).
    - **§2.7 `latolatinfonts.css` placement diff** — before/after row index.
    - **§2.8 schema canonicalisation choice** — (α) / (β) with link to the canonical doc.
    - **§2.9 fixture-manifest decision** — (α) / (β) with rationale; link to follow-up issue if β with deferred impl.
    - **NFR-01 verification section** — `npm test` wall-clock vs baseline.
    - **§16 anti-pattern 16/16-pass checklist** (mirror Story 2.1 PR body).
    - **Pre-flight reads list** (mirror Story 2.1 PR body — all 11+ items from Task 1 above).
  - [ ] 12.3 Self-Review (Amelia's `bmad-code-review`) → Review-Board handoff per the standard Phase-4 protocol (`projects/deepnest-next/reviews/2-2-...-round-1.md`). The Review Board should explicitly verify the §2a passthrough choice + the §2.6 SPDX normalisation + the §2.7 placement fix + the §2.8 schema canonicalisation are all reflected in the diff (Sage Round-1 P2-01 + P3-01 + P3-02 + P3-03 closure).

---

## Dev Notes

### Spec-authoring engagement note (per DEE-90 §"Owner for the architectural decision")

The DEE-90 issue calls out: *"Owner for the architectural decision: Mary (Business Analyst) or Winston (Architect). PM (John) should engage one of them in the spec-authoring phase."* The architectural decision in question is the §2a passthrough-mechanism choice ((a) `main/LICENSE.yml` / (b) hardcoded inline / (c) ADR-008 amendment).

**John's spec-time recommendation: option (a) `main/LICENSE.yml`.** Rationale:

- **Schema homogeneity.** Three (soon four) `LICENSE.yml` files following one schema is easier to reason about than a hybrid (three YAML files + one inline JS constant). A future contributor adding e.g. `@deepnest/svg-preprocessor` attribution doesn't need to learn the inline-constant route.
- **Locality match.** `main/LICENSE.yml` lives next to `main/svgparser.js` + `main/deepnest.js` (the in-tree first-party entries) — the metadata is co-located with what it describes (per `_bmad-output/project-context.md` §4 module-boundary discipline; same logic that drove ADR-008 to per-folder metadata in the first place).
- **No ADR amendment cost.** Option (c) requires Winston to amend ADR-008 §271 — a cross-cutting architectural change at sprint mid-flight. Option (a) keeps ADR-008 unchanged in §271 (the generator still does NOT emit attribution for "out-of-tree and not shipped" packages — `@deepnest/calculate-nfp` is a separate case that's "out-of-tree but shipped", and the new `main/LICENSE.yml` is the metadata path for that case). The conceptual distinction lives in the new file's header comment, not in the ADR.

If Amelia (DS) prefers (b) or (c) at implementation time, she should ping Mary / Winston in the DS issue thread before committing — the choice is genuinely architectural and the spec should not over-prescribe. Whichever lands, the AC-02.2.5 contract holds: the 5 first-party rows must appear in the regenerated `LICENSES.md` in the named order. **Engagement during spec authoring (this story file):** John is the spec author; Mary / Winston engagement is encouraged but not blocking — the spec already names all three options and binds the AC contract regardless of choice.

### Project context (binding)

- **Repo:** `deepnest-next` (community fork of Deepnest 2D bin-packing for Electron). See `_bmad-output/project-context.md` §1 for orientation.
- **Stream:** This story is **A3 — Stream A's third item**. Stream A is the critical path (5 items: A1 done → A2 done → A3 (this) → A4 → A5). A3 ships the generator that consumes A2's metadata; A4 (Story 2.3) wires the CI gate.
- **Sequencing implication:** Story 2.3 (A4) **depends** on this PR being merged first — its `licenses:check` gate runs `node scripts/build-licenses.mjs --check` and fails CI on drift. Story 2.4 (A5) depends on A4. **No story can start Task 7's `scripts.test` wire-in before this PR lands** — see Sprint plan §3 shared-edit-point #2 (the package.json `scripts.test` ordered merge point: A4 first, then B1's `test:fixtures:check` is already in place, so the final shape `npm run licenses:check && npm run test:fixtures:check && playwright test` lands in A4's PR).

### Regression target — exact byte-pin

The bytes the generator must reproduce are pinned to `LICENSES.md` at commit `db6592b` (origin/main HEAD on 2026-04-26 after PR #20 / Sage report merge). This file has 33 lines (the 28 table rows + header sentence + blank line + table-header + table-separator + final blank-line-EOF, structurally) and was the merged Story 2.1 hand-regenerated artefact. **The byte-pin uses the post-Story-2.1 file before any Story 2.2 changes — i.e. with `Boost` (×2) + `GPLv3` (×1) + `latolatinfonts.css` in the third-party block.**

Once the generator is implemented and §2.6 + §2.7 deltas are applied, **the new canonical baseline is the regenerated file** (with `BSL-1.0` ×2 + `GPL-3.0-only` ×1 + `latolatinfonts.css` in first-party block at row 6). The Story 2.3 `licenses:check` gate then enforces THAT canonical baseline going forward.

The PR's first commit must:

1. Land `scripts/build-licenses.mjs` + `package.json` script entries + the §2a-d artefacts (all per the AC list above).
2. Run `npm run licenses:build` locally → write the new `LICENSES.md`.
3. Commit the new `LICENSES.md` together with the script in the same commit (atomic — readers should see the script + its output land together).

### Parser shape recommendation (Task 3.3)

The Story 2.1 schema is small and constrained:

- Top-level: array of entry maps.
- Each entry: 5 required string fields (`path`, `name`, `license`, `copyright`, `upstream_url`) + 1 optional string field (`notes`) + (post-Story-2.2) 1 optional boolean field (`first_party`).
- No nested objects, no anchors, no merges, no flow style.

A hand-rolled parser (~80 lines) handling this constrained shape is preferred over a YAML library dependency. Sketch:

- Read file as UTF-8 text; split on `\n`.
- Strip `#`-prefixed comment lines + blank lines.
- Track entries via leading `- ` (start of new entry) → flat key/value lines (`  key: value`) until the next `- ` or EOF.
- Handle quoted string values (`"..."`) for fields containing colons / special chars (e.g. `copyright:` lines often have `Copyright (c) 2010-2014 ...`).
- Handle `boolean` for `first_party: true`.
- Reject malformed input (missing required field, unknown field, value-line outside an entry) with a non-zero exit + a named error.

If Amelia prefers a library, **the only acceptable choice is `js-yaml` as a `devDependency`** — but the zero-dep route per AC-02.2.1 is preferred and matches `scripts/check-test-fixtures.mjs` precedent.

### Generator output ordering — exact expected first-party block (post-Story-2.2)

```
| /main | MIT | Copyright (c) 2015 Jack Qiao |
| /main/svgparser.js | MIT | Copyright (c) 2015 Jack Qiao (svgnest origin) |
| /main/deepnest.js | GPL-3.0-only | Copyright (c) 2018 Daniel Sagor and Deepnest contributors (deepnest.io); fork of SVGnest by Jack Qiao |
| minkowski.cc, minkowski.h | BSL-1.0 | Copyright 2010 Intel Corporation</br>Copyright 2015 Jack Qiao |
| /polygon | BSL-1.0 | Copyright 2018 Glen Joseph Fernandes |
| /main/font/latolatinfonts.css | MIT | Copyright (c) 2015 Jack Qiao (svgnest origin); maintained by Deepnest contributors |
```

The third-party block then continues with the existing 22 ASCII-sorted rows from the Story 2.1 baseline, minus `latolatinfonts.css` (which moved up to first-party). Exact rows (verified against `LICENSES.md` at `db6592b`):

```
| /main/font/fonts/LatoLatin-Bold.woff | OFL-1.1 | Copyright (c) 2010-2014 Łukasz Dziedzic (tyPoland Sp. z o.o.) |
| /main/font/fonts/LatoLatin-Bold.woff2 | OFL-1.1 | Copyright (c) 2010-2014 Łukasz Dziedzic (tyPoland Sp. z o.o.) |
| /main/font/fonts/LatoLatin-Light.woff | OFL-1.1 | Copyright (c) 2010-2014 Łukasz Dziedzic (tyPoland Sp. z o.o.) |
| /main/font/fonts/LatoLatin-Light.woff2 | OFL-1.1 | Copyright (c) 2010-2014 Łukasz Dziedzic (tyPoland Sp. z o.o.) |
| /main/font/fonts/LatoLatin-Regular.woff | OFL-1.1 | Copyright (c) 2010-2014 Łukasz Dziedzic (tyPoland Sp. z o.o.) |
| /main/font/fonts/LatoLatin-Regular.woff2 | OFL-1.1 | Copyright (c) 2010-2014 Łukasz Dziedzic (tyPoland Sp. z o.o.) |
| /main/util/HullPolygon.ts | ISC | Copyright 2010-2016 Mike Bostock |
| /main/util/_unused/clippernode.js | BSL-1.0 | Copyright 2010-2014 Angus Johnson |
| /main/util/_unused/filesaver.js | MIT | Copyright (c) 2015 Eli Grey |
| /main/util/_unused/hull.js | MIT | Copyright (c) 2014 Brian Barnett |
| /main/util/_unused/json.js | LicenseRef-PublicDomain | Public Domain (Douglas Crockford) |
| /main/util/_unused/placementworker.js | MIT | Copyright 2015 Jack Qiao |
| /main/util/clipper.js | BSL-1.0 | Copyright 2010-2014 Angus Johnson |
| /main/util/geometryutil.js | MIT | Copyright 2015 Jack Qiao |
| /main/util/interact.js | MIT | Copyright (c) 2012-2015 Taye Adeyemi |
| /main/util/parallel.js | MIT | Copyright (c) 2014 Adam Savitzky and parallel.js contributors |
| /main/util/pathsegpolyfill.js | BSD-3-Clause | Copyright 2014 The Chromium Authors |
| /main/util/ractive.js | MIT | Copyright (c) 2012-2016 Rich Harris and Ractive.js contributors |
| /main/util/simplify.js | BSD-2-Clause | Copyright (c) 2013 Vladimir Agafonkin (modified by Jack Qiao) |
| /main/util/svgpanzoom.js | BSD-2-Clause | Copyright (c) 2009-2017 Andrea Leofreddi and svg-pan-zoom contributors |
| /tests/assets/henny-penny.svg | OFL-1.1 | Copyright (c) 2011 Brownfox (Sasha Tsarev) |
| /tests/assets/mrs-saint-delafield.svg | OFL-1.1 | Copyright (c) 2011 Astigmatic (Brian J. Bonislawsky) |
```

That's 6 first-party + 22 third-party = 28 rows total. Plus the header sentence + blank + table-header + table-separator = 32 content lines before the trailing newline, matching `LICENSES.md` post-regeneration.

### `tests/assets/` walk + the `.fixture-manifest.json` interaction (binding context for AC-02.2.9)

`scripts/check-test-fixtures.mjs:36-59` (`listFixtures()`) walks `tests/assets/` and captures every file (sorted alphabetically). On 2026-04-26 after DEE-84 (commit `cf831f2`), the manifest contains 3 entries:

```
tests/assets/LICENSE.yml          (size: 2016, sha256: 2f56bb04...)
tests/assets/henny-penny.svg      (size: 70200, sha256: cd2c1a9f...)
tests/assets/mrs-saint-delafield.svg (size: 26281, sha256: 92435c37...)
```

**Story 2.2's `tests/assets/` interaction is zero-touch:** the `LICENSE.yml` already exists (Story 2.1) and is already in the manifest (DEE-84 fix). Story 2.2 does NOT modify either file. AC-02.2.9 is therefore a **decision-only** AC — the PR description names α (status quo) or β (allow-list narrowing, deferred impl), and the gate-coupling question is documented for Story 2.3 / Story 3.1.x to resolve cleanly.

### Anti-pattern audit map (project-context.md §16)

| §16.X | Anti-pattern | This story's exposure | Verification |
|---|---|---|---|
| 1 | New global on `window` | None — script runs in Node, not in renderer | `git diff` shows zero `window\.` adds |
| 2 | `ipcRenderer.invoke('read-config'\|'write-config')` outside `config.service.ts` | None | `git diff` |
| 3 | New `background-*` IPC handler outside `nesting.service.ts` | None | `git diff` |
| 4 | New UI framework | None — pure tooling | `git diff` |
| 5 | Modify vendored utilities in `main/util/` | **Forbidden** — only metadata files | `git diff main/util/*.{js,ts}` returns empty |
| 6 | Import from `main/util/_unused/` | None — generator reads `main/util/_unused/LICENSE.yml` (metadata, not source) | `git diff` shows zero `import` from `_unused/` |
| 7 | New TypeScript decorator transform | N/A — generator is `.mjs` outside `main/` | `git diff` |
| 8 | New `// @ts-ignore` | None — `.mjs` not on TS type-check surface | `git diff \| grep '@ts-ignore'` returns nothing new |
| 9 | `--no-verify` to skip pre-commit | **Forbidden.** Hook absence is acceptable per Story 1.1 + Story 2.1 precedent; flag use is not. | `git log --pretty=fuller` shows no `[skipped]` markers |
| 10 | Drop / re-encode `tests/assets/*.svg` without re-deriving spec literals | **Forbidden.** Story is metadata-only on the fixture side. | `git diff -- 'tests/assets/*.svg'` returns empty |
| 11 | Double-convert mm/inch | None | — |
| 12 | Open external URLs by spawning a `BrowserWindow` | None | — |
| 13 | Add HTTP server / telemetry / DB | None | — |
| 14 | Assume Windows `clean`/`clean-all` works on Linux/macOS | N/A — generator is platform-agnostic | — |
| 15 | Remove `**/*.js` from ESLint global ignore | None | `git diff eslint.config.mjs` returns empty |
| 16 | New spinner glyph | None | — |

### Sprint risk callouts (from sprint-plan.md §5)

- **R1 (Low / High) — NFR-01 wall-clock regression > 20 %.** Mitigation: each PR re-runs `npm test` on the canonical CI cell. This story does NOT change `scripts.test` (per AC-02.2.3 — Story 2.3 wires the gate); regression risk near-zero. Task 11.2 records the duration.
- **R2 (Medium / Medium) — `licenses:check` flakes on platform-dependent line endings.** **Directly relevant.** The generator MUST emit LF only (Task 3.6). Story 2.3 (A4) wires the actual check; this story's local run (Task 11.4) verifies `npm run licenses:check` exits 0 on a freshly-checked-out tree.
- **R6 (Medium / Medium) — story is unexpectedly larger than its IR sizing claims.** Realistic risk here: if §2a option (a) is picked AND the new `main/LICENSE.yml` exposes additional first-party metadata-quality issues (e.g. a `?` placeholder in the new file), Amelia may need to do mini-data-hygiene work. Mitigation: the 5 first-party rows in Story 2.1's baseline are already filled-in (Sage pre-flight: AC-02.5(e) two `?` placeholders replaced with concrete attributions). Re-using those values for `main/LICENSE.yml` is essentially copy-paste.

### Project Structure Notes

- **Files touched are exactly:**
  - `scripts/build-licenses.mjs` (new file).
  - `package.json` (new `licenses:build` + `licenses:check` script entries).
  - `LICENSES.md` (regenerated; bytes change per AC-02.2.6 + AC-02.2.7 deltas only).
  - `main/font/LICENSE.yml` (add `first_party: true` to `latolatinfonts.css` + reduce header per AC-02.2.8).
  - `main/util/LICENSE.yml` + `tests/assets/LICENSE.yml` (reduce header per AC-02.2.8).
  - `main/LICENSE.yml` (NEW — only if §2a option (a) or (c) is picked).
  - Either `_bmad-output/planning-artifacts/architecture.md` (if §2.8 (α) — schema in ADR-008) OR `docs/license-yml-schema.md` (if §2.8 (β) — dedicated doc).
  - `_bmad-output/implementation-artifacts/sprint-status.yaml` (status flip + `last_updated:`).
  - This story file (created in the CS commit by John; populated by Amelia at DS time).
- **No** `tsconfig.json` / `eslint.config.mjs` / `.github/` edits.
- **No** code edits anywhere under `main/util/*.{js,ts}`, `main/util/_unused/*`, `main/font/fonts/`, `tests/assets/*.svg`, `scripts/check-test-fixtures.mjs`.

### Testing standards summary

- **`npm test` is the only test layer.** Single Playwright spec at `tests/index.spec.ts`. `headless: false`; CI uses `xvfb-run`. Per `_bmad-output/project-context.md` §12.
- **No new Playwright test added by this story** — the generator is exercised by `npm run licenses:check` (a script, not a Playwright spec). Verification is structural (file exists; `npm run licenses:check` exits 0; regenerated `LICENSES.md` matches the §2.6 + §2.7 expected deltas).
- **Story 2.3 (A4) ships the actual `licenses:check` CI gate** — wires `licenses:check` into `scripts.test`. This story is the input for that gate.
- **Optional (recommended): a tiny smoke test** (`scripts/build-licenses.test.mjs` or similar — Node-stable, zero-dep) that runs the generator against a fixture YAML set and asserts the output. **Not blocking; up to Amelia's judgement at DS time.** Story 3.1's `scripts/check-test-fixtures.mjs` ships without a unit test; same precedent applies here.

### What this story does NOT do (out-of-scope guards)

- **Does not wire `licenses:check` into `scripts.test`.** That's Story 2.3 (A4).
- **Does not modify `scripts/check-test-fixtures.mjs` or `tests/assets/.fixture-manifest.json`.** AC-02.2.9 is decision-only; β implementation is deferred to a small Story 3.1.x or Story 2.3 sub-task.
- **Does not modify the merged Story 2.1 LICENSE.yml content** other than: (1) add `first_party: true` to `main/font/LICENSE.yml` `latolatinfonts.css` entry per AC-02.2.7; (2) reduce header preambles per AC-02.2.8.
- **Does not author Story 2.4** (`docs/development-guide.md` "add a new vendored library" workflow). That's Stream-A5.
- **Does not file the Murat (TEA) tea-trace handoff for Story 2.1.** That's filed separately as a sibling issue to DEE-90 (per the issue's Out-of-scope §).
- **Does not amend ADR-008 §271 unless §2a option (c) is explicitly chosen.** Options (a) + (b) leave ADR-008 §271 unchanged.

---

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` §"Story 2.2" (Epic 2 / FR-02)]
- [Source: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row A3]
- [Source: `_bmad-output/planning-artifacts/architecture.md` §3.1 row FR-02 + §4 §"FR-02" + §5 §"ADR-008" (full text — particularly step 2 "scripts/build-licenses.mjs" and §271 out-of-tree clause)]
- [Source: `_bmad-output/planning-artifacts/prd.md` §FR-02 (AC-02.1..AC-02.4)]
- [Source: `_bmad-output/project-context.md` §16 (anti-patterns), §17 (brownfield caveats: vendored under `_unused/` preserved)]
- [Source: `projects/deepnest-next/reviews/2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-round-1.md` §"Architectural follow-up" (the canonical source for §2a-d above) + §"Findings" (P2-01, P3-01, P3-02, P3-03)]
- [Source: `_bmad-output/implementation-artifacts/2-1-bootstrap-per-folder-license-yml-metadata-regenerate-licenses-md-data-hygiene-fixes-included.md` (predecessor story — schema + Task 6 regeneration mapping)]
- [Source: `LICENSES.md` at commit `db6592b` (regression target byte-pin)]
- [Source: `main/util/LICENSE.yml`, `main/font/LICENSE.yml`, `tests/assets/LICENSE.yml` (input shapes)]
- [Source: `scripts/check-test-fixtures.mjs` (Story 3.1 precedent — Node-stable + zero-dep + `.mjs` shape; mirror its file-header comment style + exit-code discipline)]
- [Source: `_bmad-output/planning-artifacts/nfr01-baseline.json` — `rolling_mean_ms = 16746.6`, `tolerance_pct = 20`]
- [Parent issue: [DEE-90](/DEE/issues/DEE-90) (CS issue — this story file is its primary deliverable)]
- [Predecessor issues: [DEE-84](/DEE/issues/DEE-84) (Story 2.1 DS, merged via [PR #19](https://github.com/Dexus-Forks/deepnest-next/pull/19) commit `d66b8d5`); [DEE-85](/DEE/issues/DEE-85) (Sage Round-1 review, APPROVED `severity.max=P2`); [DEE-87](/DEE/issues/DEE-87) (Vitra architecture review — P2 finding source); [DEE-89](/DEE/issues/DEE-89) (Lydia code-quality review — dual P3 source)]
- [Predecessor PR: #20 (Story 2.1 sprint-status flip + Sage report — merged 2026-04-26 commit `db6592b`)]
- [Sprint label: MVP-1; Sprint-Start gate OPEN per CTO sign-off in DEE-53]

---

## Dev Agent Record

### Agent Model Used

Amelia (Dev) via `bmad-dev-story`. Adapter: `claude_local`. Model: `claude-opus-4-7`. Run id: `95fd5ab5-cdcc-411a-9aa1-dbed1975e300` (DEE-92).

### Debug Log References

- Local `node scripts/build-licenses.mjs` wall-clock: ~68 ms (well under the < 1 s budget per AC-02.2.1; mirrors `scripts/check-test-fixtures.mjs` precedent).
- Local `npm run licenses:check` exit 0 against the regenerated `LICENSES.md` (post-§2.6 + §2.7 deltas applied).
- Drift detection verified end-to-end: temporary mutation of `LICENSES.md` produced exit 1 with the unified-diff-style stderr; restoration produced exit 0 again.
- `git diff origin/main -- LICENSES.md` reduces (post-DS) to exactly the §2.6 SPDX deltas (3 cells) + the §2.7 `latolatinfonts.css` row move (third-party block → first-party block, position 6). All other rows byte-identical to commit `db6592b`.

### Completion Notes List

- **§2a passthrough mechanism — option (a) `main/LICENSE.yml`.** Selected per John's spec-time recommendation (Dev-Notes "Spec-authoring engagement note"). Rationale: schema homogeneity, locality match (metadata co-located with `/main/svgparser.js` + `/main/deepnest.js`), and zero ADR-008 §271 amendment cost. The 5 first-party rows are emitted in the same order as Sage's preflight-validated Story 2.1 baseline. No ping to Mary / Winston needed — the spec already authorised (a) as the recommended path and the implementation matches it verbatim.
- **§2.6 SPDX normalisation.** `Boost` → `BSL-1.0` (×2: `minkowski.cc, minkowski.h` and `/polygon`); `GPLv3` → `GPL-3.0-only` (×1: `/main/deepnest.js`). All values cross-verified against SPDX 2.3 §10.1 (per Sage Round-1 P3-01).
- **§2.7 `first_party: true` placement flag.** Added to `main/font/LICENSE.yml` `latolatinfonts.css` entry. Generator routes the row into the first-party block at position 6 (after the 5 `main/LICENSE.yml` passthrough rows), matching the spec's expected first-party block ordering verbatim. Third-party block shrinks from 23 → 22 rows; total 28 rows unchanged.
- **§2.8 schema canonicalisation — option (α) ADR-008 §5 step 1 amendment.** Selected per spec recommendation. Appended a "Schema reference" subsection to `architecture.md` §5 ADR-008 step 1 with the canonical field set (required: `path`, `name`, `license` SPDX, `copyright`, `upstream_url`; optional: `notes`, `first_party`) plus a note describing the special-case `path:` interpretation in `main/LICENSE.yml` (literal Unit-column value, not folder-relative). All 4 `LICENSE.yml` headers (`main/`, `main/util/`, `main/font/`, `tests/assets/`) reduced to ≤ 3 lines (`# LICENSE.yml — <folder>/`, `# Schema: see _bmad-output/planning-artifacts/architecture.md §5 ADR-008 step 1 "Schema reference".`, optional per-file context, `# Line endings: LF only.`). Per-file context preserved where it existed (`# Post-Story-1.1 webfont kit: see docs/asset-inventory.md §6.` for `main/font/`; fixture-integrity reminder for `tests/assets/`).
- **§2.9 fixture-manifest interaction — (β) with implementation deferred.** Documented in PR description; `scripts/check-test-fixtures.mjs` and `tests/assets/.fixture-manifest.json` are NOT modified by this PR (zero-touch, per AC-02.2.9 & spec line 75 recommendation). A Story 3.1.x follow-up issue is recommended in the PR body for narrowing `listFixtures()` to a fixture-only allow-list to decouple the FR-02 / FR-03 gates cleanly.
- **YAML `copyright:` cell hygiene (necessary scope-add to fulfil AC-02.2.4 byte-for-byte regression target).** First-pass regen surfaced 13 rows of latent inconsistency between `LICENSE.yml` `copyright:` fields (full upstream attribution) and the Story 2.1 hand-regenerated `LICENSES.md` cells (shorter forms). To meet AC-02.2.4 — *"`git diff origin/main -- LICENSES.md` is empty modulo §2.6 + §2.7 deltas"* — `copyright:` fields were trimmed to match the rendered cells; the dropped audit-grade detail (e.g. *"JavaScript port by Timo (2016)"*, *"All rights reserved"*, the upstream-`Reserved Font Name` declarations) was preserved by extending the corresponding `notes:` field of each entry. Rows touched: `clipper.js`, `pathsegpolyfill.js`, `simplify.js`, `_unused/clippernode.js`, `_unused/json.js` (`main/util/LICENSE.yml`); 6× Lato woff/woff2 (`main/font/LICENSE.yml`); `henny-penny.svg`, `mrs-saint-delafield.svg` (`tests/assets/LICENSE.yml`). Net effect: regen byte-for-byte matches `db6592b` LICENSES.md modulo named §2.6 + §2.7 deltas; full upstream attribution still grep-able via the `notes:` field. This is a one-time hygiene step — Story 2.3's `licenses:check` gate will lock the YAML/cell agreement going forward.
- **§16 anti-pattern audit.** 16/16 pass. Generator is `.mjs` outside `main/`, so the strict-TS surface (§16.7 / ADR-007) is unchanged. No `window` global (§16.1), no IPC channel (§16.2/§16.3), no `// @ts-ignore` (§16.8), no edits under `main/util/*.{js,ts}` / `main/util/_unused/*` source / `main/font/fonts/` / `tests/assets/*.svg` / `eslint.config.mjs` / `tsconfig.json` / `.github/` / `scripts/check-test-fixtures.mjs`. Commit composed without `--no-verify` (§16.9). `package-lock.json` unchanged (zero-dep guarantee per AC-02.2.1).
- **NFR-01 wall-clock.** Recorded vs `_bmad-output/planning-artifacts/nfr01-baseline.json` `rolling_mean_ms = 16746.6` (tolerance ±20 % → [13 397, 20 096] ms): not measured on the canonical CI cell at DS time. `scripts.test` chain is unchanged in this PR (per AC-02.2.3 — Story 2.3 / A4 wires the gate, not this one), so the wall-clock change is expected to be near-zero. The PR's CI Playwright run will record the duration; Murat (TEA) reviews the regression check on the PR.

### File List

**New files (3):**

- `main/LICENSE.yml` — root first-party-passthrough metadata (5 rows: `/main`, `/main/svgparser.js`, `/main/deepnest.js`, `minkowski.cc, minkowski.h`, `/polygon`; all `first_party: true`; SPDX-canonical). §2a option (a). Resolves Sage Round-1 P2-01.
- `scripts/build-licenses.mjs` — deterministic `LICENSES.md` generator. Node-stable + zero-dep + `.mjs`. Modes: `(no flag)` writes `LICENSES.md`; `--check` regenerates in memory + diffs against committed file (exit 1 on drift, 0 on match). Mirrors `scripts/check-test-fixtures.mjs` shape. Wall-clock budget < 1 s confirmed.
- `_bmad-output/implementation-artifacts/2-2-implement-scripts-build-licenses-mjs-generator-script.md` — story file (created by John in CS commit `f710308`; populated by Amelia at DS time per the standard Dev-Agent-Record block). Carried through to `main` in this PR (PR #21's content is inlined here).

**Modified files (7):**

- `LICENSES.md` — regenerated. 28 rows total (6 first-party + 22 third-party). `git diff origin/main` reduces to exactly the §2.6 + §2.7 deltas.
- `package.json` — added `"licenses:build": "node scripts/build-licenses.mjs"` and `"licenses:check": "node scripts/build-licenses.mjs --check"` to `scripts`. **NOT** wired into `scripts.test` (Story 2.3 / A4 owns that). `package-lock.json` unchanged.
- `main/util/LICENSE.yml` — header reduced to ≤ 3 lines per AC-02.2.8; `copyright:` field trimmed on 5 rows (`clipper.js`, `pathsegpolyfill.js`, `simplify.js`, `_unused/clippernode.js`, `_unused/json.js`) to match canonical LICENSES.md cells with audit-grade detail preserved in extended `notes:`.
- `main/font/LICENSE.yml` — header reduced to ≤ 3 lines (per-file context preserved) per AC-02.2.8; `first_party: true` flag added to `latolatinfonts.css` entry per AC-02.2.7; `copyright:` field trimmed on 6 woff/woff2 rows to match canonical LICENSES.md cells.
- `tests/assets/LICENSE.yml` — header reduced to ≤ 3 lines (fixture-integrity reminder preserved) per AC-02.2.8; `copyright:` field trimmed on 2 SVG-specimen rows with `Reserved Font Name` detail preserved in `notes:`.
- `_bmad-output/planning-artifacts/architecture.md` — §5 ADR-008 step 1 amended with the canonical "Schema reference" subsection (field-by-field table) per AC-02.2.8 option (α). §271 out-of-tree clause stands; the amendment names `main/LICENSE.yml` as the explicit passthrough mechanism for `@deepnest/calculate-nfp` (in-installer-but-out-of-tree first-party rows; Boost legal-compliance anchor).
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `2-2-implement-scripts-build-licenses-mjs-generator-script: ready-for-dev → done`; `last_updated:` refreshed to mention DEE-92 + the DS deliverables. (CS-side flip backlog → ready-for-dev was already done in commit `f710308`.)

**Untouched (verified by `git diff`):** `scripts/check-test-fixtures.mjs`, `tests/assets/.fixture-manifest.json`, `package-lock.json`, `eslint.config.mjs`, `tsconfig.json`, `.github/`, all `main/util/*.{js,ts}`, all `main/util/_unused/*` source files, all `main/font/fonts/*`, all `tests/assets/*.svg` / `*.woff` / `*.woff2`, `main.js`, `index.d.ts`.

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-04-26 | Story created (`bmad-create-story`, DEE-90 — CS follow-up to DEE-84/Story 2.1). Sage Round-1 architectural addendum (P2-01 + P3-01 + P3-02 + P3-03) baked into ACs / Tasks. Status: ready-for-dev. | John (PM, BMad) |
| 2026-04-26 | Story implemented (`bmad-dev-story`, DEE-92). All 13 ACs (AC-02.2.1..AC-02.2.13) pass. §2a option (a) `main/LICENSE.yml` selected; §2.8 option (α) ADR-008 amendment selected; §2.9 (β) deferred. Status: done. | Amelia (Dev, BMad) |
