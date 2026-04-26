# Story 2.1: Bootstrap per-folder `LICENSE.yml` metadata + regenerate `LICENSES.md` (data-hygiene fixes included)

Status: ready-for-dev

> Authored by John (PM, BMad) on 2026-04-26 via `bmad-create-story` (DEE-83 batch-2) for **MVP-1 / Stream A continuation (A2)**. Sprint plan reference: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row A2. Epic anchor: `_bmad-output/planning-artifacts/epics.md` §"Story 2.1" lines 280–328.

---

## Story

As a **Maintainer**,
I want **per-folder `LICENSE.yml` metadata files under `main/util/`, `main/util/_unused/`, `main/font/`, and `tests/assets/` capturing every third-party / vendored item, with the five VP-found data-hygiene issues in the existing `LICENSES.md` resolved as part of the bootstrap commit**,
so that **the next story's generator script (Story 2.2) has a complete, canonical source of truth and the bootstrap commit produces a `LICENSES.md` with no carry-over compliance gaps**.

**Sprint role.** This story is **A2 — Stream A's second item** (after Story 1.1 / Stream-A head, now `done`). It establishes the metadata schema before Story 2.2's generator script consumes it. Largest reviewer surface in Epic 2 (~25–30 metadata entries + 5 data-hygiene fixes + a regenerated `LICENSES.md`).

**FR/AC coverage:** FR-02 (PRD §FR-02 expanded scope) — AC-02.1 .. AC-02.4 + the VP-found data-hygiene set (`prd-validation-report.md` §Open Q2).
**ADR binding:** **ADR-008** (full epic) — `LICENSES.md` is generated, not hand-edited; per-folder `LICENSE.yml` is the single source of truth; CI verifies generated == committed (Story 2.3 wires the gate); generator lives outside the packaged installer (Story 2.2). Cross-references: **ADR-003** (out-of-tree `@deepnest/*` packages — generator does **not** emit attribution for those); **ADR-007** (strict TS only on `main/**/*.ts` — `LICENSE.yml` is YAML, outside that surface).
**NFR coupling measured:** NFR-03 (anti-patterns); NFR-08 (docs-freshness — `LICENSES.md` is the canonical surface and stays in sync via the gate, fully wired in Story 2.3).

---

## Acceptance Criteria

1. **AC-02.1.1 — `main/util/LICENSE.yml` enumerates every vendored library under `main/util/`** (live + `_unused/`) with `path`, `name`, `license` (SPDX-style), `copyright`, `upstream_url`, optional `notes`. The audit must include at minimum:
   - `main/util/clipper.js`
   - `main/util/_unused/clippernode.js` (note: file lives under `_unused/`, not at `main/util/clippernode.js` as the existing `LICENSES.md` claims — see AC-02.5 for the data-hygiene fix)
   - `main/util/_unused/filesaver.js` (note: file lives under `_unused/`, not at `main/uitil/filesaver.js` as the existing `LICENSES.md` claims — typo + path)
   - `main/util/geometryutil.js`
   - `main/util/HullPolygon.ts` (TS-typed vendored utility)
   - `main/util/_unused/hull.js`
   - `main/util/_unused/json.js`
   - `main/util/interact.js`
   - `main/util/parallel.js`
   - `main/util/pathsegpolyfill.js`
   - `main/util/_unused/placementworker.js`
   - `main/util/ractive.js`
   - `main/util/simplify.js`
   - `main/util/svgpanzoom.js`
   - Any other file present under `main/util/` or `main/util/_unused/` that is not first-party (verify by `ls` at story time and audit each `*.js` / `*.ts` for a header copyright).

2. **AC-02.1.2 — `main/font/LICENSE.yml` enumerates the post-Story-1.1 live Lato webfont kit** plus the two `@font-face` stylesheet files, with SIL OFL 1.1 attribution. Required entries:
   - `main/font/fonts/LatoLatin-Bold.woff` + `.woff2`
   - `main/font/fonts/LatoLatin-Regular.woff` + `.woff2`
   - `main/font/fonts/LatoLatin-Light.woff` + `.woff2`
   - `main/font/latolatinfonts.css` (the `@font-face` declaration file)
   - **Do NOT enumerate** files removed by Story 1.1 (BoldItalic kit, lato-{hai,lig}-* demo kit, *.eot/*.ttf for live weights, `stylesheet.css`, `specimen_files/`, `generator_config.txt`). Cross-check against `docs/asset-inventory.md` §6 ("Status: removed in DEE-55 / Story 1.1") to avoid re-introducing dead-weight entries.

3. **AC-02.1.3 — `tests/assets/LICENSE.yml` enumerates every fixture SVG with provenance.** Current contents (verified 2026-04-26):
   - `tests/assets/henny-penny.svg`
   - `tests/assets/mrs-saint-delafield.svg`
   Each entry names the upstream font family (Henny Penny by Brownfox; Mrs Saint Delafield by Astigmatic AMT) + license (SIL OFL 1.1) + project URL (Google Fonts source, https://fonts.google.com/). Coordination point: per Epic 3 architectural constraint (d), the FR-02 LICENSE.yml is the **canonical** provenance surface; if Story 3.2 (later) needs a `tests/assets/README.md` stub, it cross-references this file rather than duplicating attribution.

4. **AC-02.1.4 — Empty / not-applicable folders explicitly handled.** Folders containing no third-party items must not have a `LICENSE.yml`. If the audit finds a candidate folder is empty (e.g. `main/img/` post-Story-1.1 contains only first-party DeepNest icons), the PR description must list each "considered and skipped" folder with a one-line reason. This makes the audit completeness verifiable from the PR alone.

5. **AC-02.5 — Data-hygiene fixes (the five VP-found issues) are resolved in the bootstrap `LICENSES.md`:**
   - **a.** Path typo `/main/uitil/filesaver.js` → corrected to `/main/util/_unused/filesaver.js` (file moved to `_unused/`; verify by `ls main/util/_unused/`).
   - **b.** Wrong path `/main/util/clipper` → corrected to `/main/util/clipper.js` (the live file).
   - **c.** Wrong path `/main/util/clippernode.js` → corrected to `/main/util/_unused/clippernode.js` (file moved to `_unused/`).
   - **d.** Stale entry `/main/svgnest.js` → **removed** (file does not exist; verify by `ls main/`).
   - **e.** Three `?` copyright placeholders (the `/main/svgnest.js` row already removed by (d), plus `/main/svgparser.js` and `/main/deepnest.js` rows) → either (i) replaced with concrete attributions sourced from upstream Deepnest history or file-headers (preferred), OR (ii) removed if no attribution can be sourced and the file is first-party DeepNest (justify per-row in the PR description). **Do not** ship `?` placeholders into the bootstrap.

6. **AC-02.1.5 — Bootstrap `LICENSES.md` matches the convention.** The regenerated file:
   - Preserves the existing top-of-file header sentence ("This software contains different units with different licenses, copyrights and authors.").
   - Uses the existing markdown table shape (`| Unit | License | Copyright |`).
   - Has one row per third-party / vendored item discovered by the audit (i.e. **every** entry from the per-folder `LICENSE.yml` files appears, plus first-party rows preserved verbatim from the current `LICENSES.md`).
   - Sort order: alphabetical by `Unit` column (path-sorted), with the first-party rows (`/main`, `/polygon`, `minkowski.cc`) grouped first (matching the existing convention).
   - Hand-regenerated for THIS story (no script yet — Story 2.2 ships the script). The hand-regenerated file becomes Story 2.2's regression target (byte-for-byte).

7. **AC-02.1.6 — No fixture / asset file is renamed or re-encoded as a side-effect of this story** (per FR-02 AC-02.4 — avoids triggering FR-03's gate pre-emptively). The PR touches only metadata files (`LICENSE.yml` × N + `LICENSES.md`); no `*.svg`, `*.woff`, `*.woff2`, `*.css`, `*.js`, `*.ts` file under `tests/assets/`, `main/font/`, `main/util/` is renamed, re-encoded, or content-changed. Verified by `git diff --stat` excluding `*.yml` + `LICENSES.md`.

8. **AC-02.1.7 — `npm test` is green on the PR.** Same NFR-01 wall-clock check as Story 1.1: CI run wall-clock within ±20 % of `_bmad-output/planning-artifacts/nfr01-baseline.json` `rolling_mean_ms` (16 746.6 ms ± 20 % = [13 397, 20 096] ms) on the canonical CI cell (Linux/Ubuntu-22.04 × Node 22.x). Murat (TEA) reviews the regression check on the PR.

9. **AC-02.1.8 — `project-context.md` §16 anti-patterns hold.** The PR adds **no** new `window` global (§16.1), **no** new IPC channel (§16.2/§16.3), **no** new `// @ts-ignore` (§16.8), **no** edits to `main/util/_unused/` source files (§16.6 — only the metadata files under it / referencing it; do **not** modify `clippernode.js`, `filesaver.js`, `hull.js`, `json.js`, `placementworker.js` themselves), **no** modification of vendored utilities (§16.5), **no** `--no-verify` commits (§16.9). Reviewer verifies with `git diff` + `git log --pretty=fuller`.

10. **AC-02.1.9 — Generator-script delivery is left to Story 2.2.** This bootstrap is hand-authored. The PR description must state explicitly: *"The bootstrap `LICENSES.md` is the regression target Story 2.2's `scripts/build-licenses.mjs` will reproduce byte-for-byte. No script is shipped in this PR."* This forecloses reviewer requests to add the generator inline.

---

## Tasks / Subtasks

- [ ] **Task 1 — Per-folder audit (AC: #1, #2, #3, #4)**
  - [ ] 1.1 `ls main/util/` + `ls main/util/_unused/`. For every `*.js` and `*.ts` file: open, read the top-of-file copyright header (if present), grep upstream-name + version. Build the candidate entry list for `main/util/LICENSE.yml`.
  - [ ] 1.2 `ls main/font/`. Confirm post-Story-1.1 state (`fonts/` with 6 woff/woff2 + `latolatinfonts.css` only — verify against `docs/asset-inventory.md` §6 "Status: removed in DEE-55 / Story 1.1"). Build entries for `main/font/LICENSE.yml`.
  - [ ] 1.3 `ls tests/assets/`. Build entries for `tests/assets/LICENSE.yml`. Source the upstream font-family attribution from existing `tests/assets/README.md` (if present) or by web-grep for the family names.
  - [ ] 1.4 Audit any other folder for vendored items (e.g. `main/svgparser.js`, `main/deepnest.js`, `main/svgnest.js` if it exists). Confirm `main/svgnest.js` is **gone** (per AC-02.5 (d)). For first-party files that stay in `LICENSES.md`, no `LICENSE.yml` is needed (only third-party gets metadata).
  - [ ] 1.5 Compile the "considered and skipped" list (per AC-02.1.4) — folders that have no third-party content (e.g. `main/img/`, `main/ui/`, `tests/`).

- [ ] **Task 2 — Decide on `LICENSE.yml` schema (AC: #1, future-script alignment with Story 2.2)**
  - [ ] 2.1 Pick the field set: at minimum `path`, `name`, `license` (SPDX ID), `copyright`, `upstream_url`. Optional: `notes`, `version`, `attribution_required` (bool).
  - [ ] 2.2 Pick the YAML shape: top-level array of entry maps (recommended), OR top-level map keyed by `path`. **Document the decision in a top-of-file comment** in each `LICENSE.yml`. Story 2.2's parser will match this shape.
  - [ ] 2.3 Verify SPDX IDs against https://spdx.org/licenses/ (e.g. `MIT`, `BSL-1.0` for Boost-licensed Clipper, `OFL-1.1` for Lato, `GPL-3.0-only` for `main/deepnest.js`).
  - [ ] 2.4 Pick line-ending policy: LF only (matches the rest of the repo; ADR-008 generator is Linux-only-CI).

- [ ] **Task 3 — Author `main/util/LICENSE.yml` (AC: #1, #5)**
  - [ ] 3.1 Create `main/util/LICENSE.yml` with one entry per audited file from Task 1.1.
  - [ ] 3.2 Resolve AC-02.5 path corrections inline (i.e. the `LICENSE.yml` entries use the **correct** paths, then Task 6's `LICENSES.md` regeneration picks them up).
  - [ ] 3.3 For files in `main/util/_unused/`: include `notes: "vendored utility — no live import; preserved per ADR-007 §revertibility"` so reviewers know why they're catalogued.

- [ ] **Task 4 — Author `main/font/LICENSE.yml` (AC: #2)**
  - [ ] 4.1 Create `main/font/LICENSE.yml` with the 6 webfont entries + the `.css` file.
  - [ ] 4.2 SIL OFL 1.1 attribution per the Lato upstream (https://fonts.google.com/specimen/Lato — Łukasz Dziedzic / Adam Twardoch / tyPoland Sp. z o.o.).
  - [ ] 4.3 Cross-verify against `docs/asset-inventory.md` §1 + §6 — no entry for any file marked "Removed in Story 1.1".

- [ ] **Task 5 — Author `tests/assets/LICENSE.yml` (AC: #3)**
  - [ ] 5.1 Create `tests/assets/LICENSE.yml` with 2 entries (`henny-penny.svg`, `mrs-saint-delafield.svg`).
  - [ ] 5.2 Each entry: `license: OFL-1.1`, `upstream_url: https://fonts.google.com/specimen/<Family>`, `copyright: <upstream font foundry per Google Fonts metadata>`, `notes: derived SVG specimen used as test fixture; do NOT rename or re-encode (FR-03 manifest covers integrity)`.

- [ ] **Task 6 — Hand-regenerate `LICENSES.md` (AC: #5, #6)**
  - [ ] 6.1 Open the current `LICENSES.md` (15 rows including header + first-party rows). Preserve the header sentence + table-row format.
  - [ ] 6.2 For every entry across the new `LICENSE.yml` files, append (or replace) a row in `LICENSES.md` matching the existing column shape (`| Unit | License | Copyright |`).
  - [ ] 6.3 Apply AC-02.5 fixes:
    - (a) `/main/uitil/filesaver.js` → `/main/util/_unused/filesaver.js`
    - (b) `/main/util/clipper` → `/main/util/clipper.js`
    - (c) `/main/util/clippernode.js` → `/main/util/_unused/clippernode.js`
    - (d) `/main/svgnest.js` row → **removed**
    - (e) `?` placeholders → concrete attribution (or row removed with PR-description justification)
  - [ ] 6.4 Sort: first-party rows first (`/main`, `/polygon`, `minkowski.cc`); third-party alphabetical by path.
  - [ ] 6.5 Manual byte-count: this file is the regression target for Story 2.2's generator. Save as LF-only, no trailing whitespace.

- [ ] **Task 7 — Pre-flight scope-creep check (AC: #7, #9)**
  - [ ] 7.1 `git diff --stat` — touched files MUST be only: `LICENSES.md` + the new `LICENSE.yml` files + (optionally) the story file itself. **Zero** code-file deletions. **Zero** asset re-encodes.
  - [ ] 7.2 `git diff main/util/_unused/` MUST return empty (anti-pattern §16.6 guard).
  - [ ] 7.3 `git diff tests/assets/*.svg` MUST return empty (FR-03 invariant guard, AC-02.1.6).
  - [ ] 7.4 `git diff main/font/fonts/` MUST return empty (only metadata changes).

- [ ] **Task 8 — Pre-commit + CI run (AC: #8)**
  - [ ] 8.1 `git commit` without `--no-verify`. If local pre-commit hook is not wired (Paperclip worktree without `node_modules`), this is acceptable per Story 1.1 precedent (Round-1 Board APPROVED ruling: hook absence ≠ §16.9 violation; CI is binding).
  - [ ] 8.2 Push the PR; verify CI Playwright run is green; record wall-clock vs NFR-01 baseline (target: within [13 397, 20 096] ms).
  - [ ] 8.3 If CI's `paths:` filter excludes pure-yaml + markdown changes, manually `gh workflow run playwright.yml --ref <branch>` to force a run (see Story 1.1 Completion Notes for the precedent).

- [ ] **Task 9 — PR composition (AC: all)**
  - [ ] 9.1 Open PR titled `feat(licenses): Story 2.1 — bootstrap per-folder LICENSE.yml + regenerate LICENSES.md (DEE-?? / FR-02 ADR-008)` (replace `DEE-??` with the issue number assigned to this story).
  - [ ] 9.2 PR description includes: AC checklist (all 10), per-folder audit summary table, "considered and skipped" list, AC-02.5 fix-table (5 rows), §16 anti-pattern 16/16-pass checklist, NFR-01 verification section, **explicit statement** that the generator script is Story 2.2 (per AC-02.1.9), pre-flight reads list.
  - [ ] 9.3 Self-Review (Amelia's `bmad-code-review`) → Review-Board handoff per the standard Phase-4 protocol (`projects/deepnest-next/reviews/<story-id>-round-1.md`).

---

## Dev Notes

### Project context (binding)

- **Repo:** `deepnest-next` (community fork of Deepnest 2D bin-packing for Electron). See `_bmad-output/project-context.md` §1 for orientation.
- **Stream:** This story is **A2 — Stream A's second item** (after Story 1.1 / DEE-55, now done). Stream A is the critical path (5 items: A1→A2→A3→A4→A5). A2 establishes the metadata schema; A3 (Story 2.2) ships the generator that consumes it; A4 (Story 2.3) wires the CI gate.
- **Sequencing implication:** Story 2.2 (A3) **depends** on this PR being merged first — its generator regenerates *this* PR's `LICENSES.md` byte-for-byte as the regression target. Story 2.3 (A4) then wires `licenses:check` into `npm test`. **Do not start Task 6's hand-regeneration before the per-folder audit (Tasks 1–5) is complete** — the regression target must reflect the full audit set.

### Current `LICENSES.md` state (input — verbatim, 15 rows)

```
This software contains different units with different licenses, copyrights and authors.

| Unit | License | Copyright|
| - | - | - |
| /main | MIT | Copyright (c) 2015 Jack Qiao |
| /main/svgnest.js | MIT  | ? |
| /main/svgparser.js | MIT | ? |
| /main/deepnest.js | GPLv3 | ? |
| /main/uitil/filesaver.js | MIT |  By Eli Grey, http://eligrey.com |
| /main/util/interact.js | MIT | Copyright (c) 2012-2015 Taye Adeyemi |
| /main/util/clipper | Boost | Copyright :  Angus Johnson 2010-2014 |
| /main/util/clippernode.js | Boost | Copyright :  Angus Johnson 2010-2014 |
| minkowski.cc, minkowski.h | Boost | Copyright 2010 Intel Corporation</br>Copyright 2015 Jack Qiao |
| /polygon | Boost |  Copyright 2018 Glen Joseph Fernandes |
```

(13 data rows including the table header / separator rows. The five data-hygiene issues from `_bmad-output/planning-artifacts/prd-validation-report.md` §Open Q2 Table 3 are all visible above.)

### Folder layout snapshot (verified 2026-04-26 post Story 1.1 + Story 3.1)

```
main/util/
  HullPolygon.ts        clipper.js          domparser.ts        eval.ts
  geometryutil.js       interact.js         matrix.ts           parallel.js
  pathsegpolyfill.js    point.ts            ractive.js          simplify.js
  svgpanzoom.js         vector.ts           _unused/

main/util/_unused/
  clippernode.js        filesaver.js        hull.js
  json.js               placementworker.js

main/font/
  fonts/                latolatinfonts.css

main/font/fonts/
  LatoLatin-Bold.woff       LatoLatin-Bold.woff2
  LatoLatin-Light.woff      LatoLatin-Light.woff2
  LatoLatin-Regular.woff    LatoLatin-Regular.woff2

tests/assets/
  henny-penny.svg       mrs-saint-delafield.svg
```

**First-party DeepNest files** (need no `LICENSE.yml`, but their rows in `LICENSES.md` stay):
- `main/svgparser.js` — DeepNest first-party
- `main/deepnest.js` — DeepNest first-party (GPLv3)
- All `*.ts` files under `main/util/` (`HullPolygon.ts`, `domparser.ts`, `eval.ts`, `matrix.ts`, `point.ts`, `vector.ts`) — first-party migrations per ADR-007. Verify each top-of-file copyright header before deciding.

**Audit needed** (verify each top-of-file header during Task 1):
- `main/util/HullPolygon.ts` — title says "HullPolygon"; could be vendored Hull.js port. Read header.
- `main/util/domparser.ts`, `eval.ts`, `matrix.ts`, `point.ts`, `vector.ts` — likely first-party migrations but **verify** before classifying.

### LICENSE.yml schema recommendation (Task 2.2)

```yaml
# Top-level array of entries. Story 2.2's `scripts/build-licenses.mjs` parses this shape.
# Required fields: path, name, license (SPDX), copyright, upstream_url.
# Optional fields: notes, version, attribution_required.
- path: clipper.js                        # relative to LICENSE.yml's folder
  name: Clipper Library
  license: BSL-1.0                        # SPDX
  copyright: "Copyright 2010-2014 Angus Johnson"
  upstream_url: https://sourceforge.net/projects/polyclipping/
  notes: "Boost Software License — attribution preserved in source header"
- path: interact.js
  name: interact.js
  license: MIT
  copyright: "Copyright (c) 2012-2015 Taye Adeyemi"
  upstream_url: https://interactjs.io/
```

(The above is a recommended starting shape; finalise during Task 2.)

### How `LICENSES.md` regeneration maps from `LICENSE.yml`

For Story 2.1's hand-regeneration (and Story 2.2's script later):

1. Walk roots: `main/`, `main/util/`, `main/util/_unused/`, `main/font/`, `tests/assets/`.
2. For each `LICENSE.yml` found, parse to entries.
3. Emit table rows: `| <yml-folder>/<entry.path> | <entry.license> | <entry.copyright> |`.
4. Preserve first-party rows from the existing `LICENSES.md` verbatim (`/main`, `/polygon`, `minkowski.cc`, `/main/svgparser.js`, `/main/deepnest.js`).
5. Sort: first-party block first; third-party block sorted alphabetically by path.
6. Write LF-only, single newline at EOF.

### Anti-pattern audit map (project-context.md §16)

| §16.X | Anti-pattern | This story's exposure | Verification |
|---|---|---|---|
| 1 | New global on `window` | None — pure metadata | `git diff` shows zero `window.foo = ...` |
| 2 | `ipcRenderer.invoke('read-config'\|'write-config')` outside `config.service.ts` | None | `git diff` |
| 3 | New `background-*` IPC handler outside `nesting.service.ts` | None | `git diff` |
| 4 | New UI framework | None | `git diff` |
| 5 | Modify vendored utilities in `main/util/` | **Forbidden** — only `LICENSE.yml` metadata, no `*.js` content edit | `git diff main/util/*.js main/util/*.ts` returns empty |
| 6 | Import from `main/util/_unused/` | None — story catalogues but does not import | `git diff` |
| 7 | New TypeScript decorator transform | None | `git diff` |
| 8 | New `// @ts-ignore` | None | `git diff \| grep '@ts-ignore'` returns nothing new |
| 9 | `--no-verify` to skip pre-commit | **Forbidden.** Hook absence is acceptable per Story 1.1 precedent; flag use is not. | `git log --pretty=fuller` shows no `[skipped]` markers |
| 10 | Drop / re-encode `tests/assets/*.svg` without re-deriving spec literals | **Forbidden.** Story is metadata-only. | `git diff --stat tests/assets` returns only `LICENSE.yml` |
| 11 | Double-convert mm/inch | None | — |
| 12 | Open external URLs by spawning a `BrowserWindow` | None | — |
| 13 | Add HTTP server / telemetry / DB | None | — |
| 14 | Assume Windows `clean`/`clean-all` works on Linux/macOS | N/A | — |
| 15 | Remove `**/*.js` from ESLint global ignore | None | `git diff eslint.config.mjs` returns empty |
| 16 | New spinner glyph | None | — |

### Pre-flight reads (binding)

Before authoring the per-folder `LICENSE.yml` files, the implementing agent **must** have read:

1. `_bmad-output/project-context.md` §16 — full anti-pattern list (16 items).
2. `_bmad-output/project-context.md` §8 — cross-cutting behaviours (none directly relevant; orientation only).
3. `_bmad-output/project-context.md` §11 — pre-commit hook / no-`--no-verify` rule.
4. `_bmad-output/project-context.md` §17 — brownfield caveats (vendored utilities under `main/util/_unused/` are preserved, not deleted).
5. `_bmad-output/project-context.md` §6 — IPC contract (no new IPC channel introduced — sanity).
6. `_bmad-output/planning-artifacts/architecture.md` **§5 ADR-008** (full text — context, decision, alternatives, consequences, revertibility).
7. `_bmad-output/planning-artifacts/architecture.md` §6 Open Q3 — the suggested 4-story split (this story is S1 of that split).
8. `_bmad-output/planning-artifacts/architecture.md` §3.1 + §4 (FR-02 architectural constraints).
9. `_bmad-output/planning-artifacts/prd-validation-report.md` §Open Q2 Table 3 — the five data-hygiene issues.
10. Existing `LICENSES.md` (15-line current state — input for the data-hygiene fixes).
11. `docs/asset-inventory.md` §1 + §6 — post-Story-1.1 font kit state (do not re-introduce dead-weight entries).

### Sprint risk callouts (from sprint-plan.md §5)

- **R1 (Low / High) — NFR-01 wall-clock regression > 20 %.** Mitigation: each PR re-runs `npm test` on the canonical CI cell. Pure-metadata story; regression risk near-zero. Task 8.2 still records the duration.
- **R2 (Medium / Medium) — `licenses:check` flakes on platform-dependent line endings.** Story 2.1 itself is not a check, but the line-ending policy decided in Task 2.4 (LF only) is what Story 2.3's gate will verify.
- **R6 (Medium / Medium) — story is unexpectedly larger than its IR sizing claims.** Realistic risk here: the audit may find more `main/util/_unused/` items than expected, or surface a vendored file with no upstream attribution. Mitigation: if a third-party file is found whose license cannot be determined, the bootstrap may ship with `license: UNKNOWN` + `notes: "TODO — see DEE-?? for follow-up"` rather than blocking the PR. Document any such row prominently in the PR description.

### Project Structure Notes

- **Files touched are exactly:** `LICENSES.md` (regenerated) + 3 (or 4) new `LICENSE.yml` files + (optionally) `tests/assets/README.md` if the team prefers a per-folder provenance pointer (per AC-02.3 — coordinate with Story 3.2 to avoid double-write). **No** `package.json` edit (Story 2.2 + 2.3 own the script wiring). **No** `tsconfig.json` edit. **No** `.github/` edit. **No** code file edit.
- **No new files created outside the `LICENSE.yml` set.**

### Testing standards summary

- **`npm test` is the only test layer.** Single Playwright spec at `tests/index.spec.ts`. `headless: false`; CI uses `xvfb-run`. Per `_bmad-output/project-context.md` §12.
- **No new test added by this story** — pure metadata. Verification is structural (file exists; entries enumerate the audit set; bootstrap `LICENSES.md` matches the convention) + CI green.
- **Story 2.3 (A4) ships the actual `licenses:check` gate** that exercises the regeneration determinism. This story is the input for that gate.

---

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` lines 280–328 §"Story 2.1: Bootstrap per-folder LICENSE.yml metadata + regenerate LICENSES.md (data-hygiene fixes included)"]
- [Source: `_bmad-output/planning-artifacts/epics.md` lines 267–278 §"Epic 2: LICENSES.md generator + per-folder metadata"]
- [Source: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row A2]
- [Source: `_bmad-output/planning-artifacts/architecture.md` §3.1 row FR-02 + §4 §"FR-02" + §5 §"ADR-008"]
- [Source: `_bmad-output/planning-artifacts/prd.md` §FR-02 (AC-02.1..AC-02.4)]
- [Source: `_bmad-output/planning-artifacts/prd-validation-report.md` §Open Q2 Table 3 — five data-hygiene issues]
- [Source: `_bmad-output/project-context.md` §16 (anti-patterns), §17 (brownfield caveats: vendored under `_unused/` preserved)]
- [Source: `docs/asset-inventory.md` §1 + §6 — post-Story-1.1 font kit state]
- [Source: `_bmad-output/planning-artifacts/nfr01-baseline.json` — `rolling_mean_ms = 16746.6`, `tolerance_pct = 20`]
- [Parent issue: DEE-83 (CS batch-2 follow-up to DEE-82 standup)]
- [Sprint label: MVP-1; Sprint-Start gate OPEN per CTO sign-off in DEE-53]
- [Predecessor PRs: #6 (Story 6.1), #7 (Story 3.1), #8 (Story 1.1) — all merged, Board-APPROVED]

---

## Dev Agent Record

### Agent Model Used

_(Populated by the implementing Dev agent at story execution time.)_

### Debug Log References

_(Populated by the implementing Dev agent.)_

### Completion Notes List

_(Populated by the implementing Dev agent.)_

### File List

_(Populated by the implementing Dev agent.)_

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-04-26 | Story created (`bmad-create-story` batch-2, DEE-83). Status: ready-for-dev. | John (PM, BMad) |
