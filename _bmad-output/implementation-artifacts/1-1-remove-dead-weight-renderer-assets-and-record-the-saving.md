# Story 1.1: Remove dead-weight renderer assets and record the saving

Status: done

> Authored by John (PM, BMad) on 2026-04-26 via `bmad-create-story` for **MVP-1 / Stream A head**. Sprint plan reference: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row A1. Epic anchor: `_bmad-output/planning-artifacts/epics.md` §"Story 1.1" lines 213–264.

---

## Story

As a **Maintainer**,
I want **to delete the five unused icons + the Lato dead-weight kit and record the result in `docs/asset-inventory.md`**,
so that **the installer is ≥ 1.57 MB lighter and the reviewer can verify the saving against a documented inventory entry**.

**Sprint role.** This story is the **head of Stream A (the critical path)**. Land it first to warm the sprint with a green PR pattern. Smallest, highest-confidence change in MVP-1; touches no `main.js`, no `index.d.ts`, no spec literals.

**FR/AC coverage:** FR-01 (PRD §FR-01) — AC-01.1 .. AC-01.5.
**ADRs preserved (no new ADR introduced):** ADR-005 (no new globals), ADR-006 (no new Ractive instances).
**NFR coupling measured:** NFR-01 (regression-free `npm test` against `nfr01-baseline.json`); NFR-03 (anti-patterns hold; PR template once shipped from Story 6.1).

---

## Acceptance Criteria

1. **AC-01.1 — Five unused icons deleted from `main/img/`.** The PR removes exactly these five files and only these five, verified by the reviewer with `git diff --stat`:
   - `main/img/auth0logo.svg` (1.9 KB)
   - `main/img/background.png` (18.8 KB)
   - `main/img/logo.svg` (10.5 KB)
   - `main/img/progress.svg` (0.7 KB)
   - `main/img/stop.svg` (0.7 KB)

2. **AC-01.2 — Lato dead-weight kit deleted from `main/font/`.** The PR removes the dead-weight subset enumerated in `docs/asset-inventory.md` §6 P1+P3 (mandatory) and may optionally include §6 P4 (acceptable, pushes the saving toward the 2.27 MB upper bound). See **Files to delete (precise list)** in Dev Notes for the exact set.

3. **AC-01.3 — No live binding broken.** `grep -rn` over `main/`, `docs/`, and `tests/` for the basenames of every removed file returns **zero hits** after the deletions. In particular: `main/style.css` and `main/font/latolatinfonts.css` must not reference any removed file; the notification window's `<link>` to `main/font/latolatinfonts.css` must still resolve.

4. **AC-01.4 — `docs/asset-inventory.md` updated.** The PR amends `docs/asset-inventory.md`:
   - Records each removal under §6 (or replaces the table with a "Status: removed in DEE-54 follow-up / Story 1.1" annotation).
   - Records the **measured installer-size delta** in MB (target ≥ 1.57 MB; ≤ 2.27 MB upper bound) using a documented measurement method (see Dev Notes → "How to measure the installer-size delta").
   - Updates the file-system facts in §8 ("Verification recap") to reflect the new file counts under `main/img/` and `main/font/`.

5. **AC-01.5 — Stale doc references purged.** The PR also strips references to the deleted icon basenames from:
   - `docs/source-tree-analysis.md` lines 121–123 (mentions `progress.svg`, `auth0logo.svg`, `background.png`).
   - `docs/component-inventory.md` lines 84–86 (mentions `background.png`, `auth0logo.svg`).
   - `docs/deep-dive/g/main__img.md` lines 91–95 + line 99 ("Cleanup safety note") — either remove the rows or annotate them as `(removed in Story 1.1, DEE-54 follow-up)`. **Preserve the deep-dive table shape**; do not collapse the file.
   - `docs/deep-dive/g/README.md` line 36 — same treatment.

6. **AC-01.6 — Spec is unchanged.** The PR does **not** modify `tests/index.spec.ts`. The literals (`#importsnav li = 2`, `placements = 54/54`) are independent of `main/img/` and `main/font/` removals (overlay §3.1 FR-01 constraint (c)). If a story needs to touch them, scope has expanded — escalate via `bmad-correct-course`.

7. **AC-01.7 — `npm test` regression-free against the NFR-01 baseline.** `npm test` is green on the PR's HEAD. The CI run's wall-clock duration must be within ±20 % of `_bmad-output/planning-artifacts/nfr01-baseline.json` `rolling_mean_ms` (16 746.6 ms ± 20 % = 13 397.3 ms .. 20 095.9 ms) on the canonical CI cell (Linux/Ubuntu-22.04 × Node 22.x). Murat (TEA) reviews the regression check on the PR.

8. **AC-01.8 — Notification-window typography island intact.** Manual repro (or Playwright trace inspection) shows the notification window opens, the `<link>` to `latolatinfonts.css` still resolves, and typography renders with the live LatoLatin family (no FOUT / system-fallback-only state). See Dev Notes → "How to repro the notification window".

9. **AC-01.9 — `project-context.md` §16 anti-patterns hold.** The PR adds **no** new `window` global (§16.1), **no** new IPC channel (§16-via-FR-06 AC-06.2), **no** new `// @ts-ignore` (§16.8), **no** edits to `main/util/_unused/` (§16.6), **no** modification of vendored utilities (§16.5), **no** `--no-verify` commits (§16.9), **no** new spinner glyph (§16.16). Reviewer verifies with `git diff` + `git log --pretty=fuller`.

---

## Tasks / Subtasks

- [x] **Task 1 — Pre-delete grep audit (AC: #3, #9)**
  - [x] 1.1 Ran `grep -rnE` over `main/`, `tests/`, `docs/` for icon basenames. `main/` and `tests/` zero hits; `docs/` hits all in AC-01.5-targeted files (asset-inventory, source-tree-analysis, component-inventory, deep-dive/g/main__img.md, deep-dive/g/README.md).
  - [x] 1.2 Same grep over Lato kit. `main/` hits all self-referential within deleted kit (stylesheet.css, lato-*-demo.html, generator_config.txt). Docs hits in inventory + deep-dive files.
  - [x] 1.3 Every hit confirmed in (a) AC-01.5 doc-target or (b) self-referential dead kit. No live-binding hit elsewhere — no scope expansion.

- [x] **Task 2 — Capture pre-delete installer-size baseline (AC: #4)**
  - [x] 2.1 Pre-delete `du -sb main/img main/font` → 67504 / 2166705 bytes (= 2.234 MB combined). Matches `docs/asset-inventory.md` §8 exactly.
  - [x] 2.2 `electron-builder --dir` skipped — Paperclip worktree lacks Electron deps + Linux Wine. Per Task 2.2 fallback, the `du -sb` measurement is sufficient and reported in the PR description.

- [x] **Task 3 — Delete the five unused icons (AC: #1, #3)**
  - [x] 3.1 `git rm main/img/{auth0logo.svg,background.png,logo.svg,progress.svg,stop.svg}` — 5 files removed.
  - [x] 3.2 Post-delete grep zero hits in `main/`, `tests/`. Docs hits limited to the AC-01.5 doc-target files (now annotated `(removed in Story 1.1, DEE-55)`).

- [x] **Task 4 — Delete the Lato dead-weight kit (AC: #2, #3)**
  - [x] 4.1 P1 + P3 deleted:
    - P1: `main/font/fonts/LatoLatin-BoldItalic.{eot,ttf,woff,woff2}` (4 files; ≈338 KB measured). **Note:** story file said `main/font/LatoLatin-BoldItalic.*` (top-level); actual location is `main/font/fonts/` per `docs/asset-inventory.md` §1. Correct location used.
    - P3: `main/font/lato-{hai,lig}-webfont.{eot,svg,ttf,woff}` (8), `lato-{hai,lig}-demo.html` (2), `stylesheet.css`, `specimen_files/` (3 files), `generator_config.txt` — 15 files total; ≈828 KB measured (lower than story's ~1.2 MB estimate).
  - [x] 4.2 P4 **included** to meet AC-01.4 lower bound. After Task 5.1 verified, took Task 5.3 path (a): drop the broken `.eot` / `.ttf` `src:` URLs from `latolatinfonts.css`. Rationale: P3 measured below estimate (828 KB vs ~1.2 MB), so P1+P2+P3 alone = 1.20 MB < 1.57 MB AC target. P4 + the CSS edit pushes the saving to 1.85 MB, well within the [1.57, 2.27] MB range. Removed: `main/font/fonts/LatoLatin-{Bold,Regular,Light}.{eot,ttf}` (6 files; ≈650 KB).
  - [x] 4.3 `main/font/fonts/` LIVE files (`LatoLatin-{Bold,Regular,Light}.{woff,woff2}`) untouched. **Note:** story file at this step said "P1/P3/P4 scope is the top level of `main/font/` only", which contradicts P1/P4 paths in 4.1/4.2 (`fonts/` subdir). Followed the actual repo layout per `docs/asset-inventory.md` §1.
  - [x] 4.4 Post-delete font-side grep zero hits in `main/`, `tests/`. Docs hits all annotated.

- [x] **Task 5 — Verify `latolatinfonts.css` integrity (AC: #3, #8)**
  - [x] 5.1 Read `main/font/latolatinfonts.css` end-to-end (pre-Task-5 had `.eot` + `.ttf` + `.woff2` + `.woff` `src:` URLs for all three live weights — i.e., `.eot` and `.ttf` for live weights WERE referenced). Edited the CSS to drop the `.eot` and `.ttf` `src:` URLs and keep only `woff2`/`woff` (Chromium native, Electron-only target).
  - [x] 5.2 `main/style.css:29` (`body { font: ... LatoLatinWeb }`) and `:72` (`font-family: "LatoLatinWebLight"`) verified intact — both family names still bound by the edited CSS.
  - [x] 5.3 P4 included; took path (a): broken `.eot` / `.ttf` `src:` URLs dropped from `latolatinfonts.css`. All `src:` URLs post-edit resolve to extant files (verified by automated check; see Completion Notes).

- [x] **Task 6 — Update documentation (AC: #4, #5)**
  - [x] 6.1 `docs/asset-inventory.md` updated: §1 (counts 35→30 + 32→7 / footprint table), §2 (quick reference tree), §3.1 (status note), §3.2 (rewritten with removed-set list), §5 (packaging sentence), §6 (cleanup roadmap table marked Removed; measured-delta paragraph added), §8 (re-verified line for 2026-04-26 / DEE-55), §9 (item 1 marked Resolved).
  - [x] 6.2 `docs/source-tree-analysis.md` updated: icon block (lines 109–123) and font block (lines 125–132) rewritten to reflect post-Story-1.1 state. **Scope note:** Task 6.2 explicitly listed lines 121–123 only; pragmatically extended to the contiguous icon header + font block since both contained references to deleted basenames. Documented in Completion Notes.
  - [x] 6.3 `docs/component-inventory.md` lines 84–86: rewritten to drop deleted icon basenames and the dead-weight Lato kit. The auth-icon line removed. Static-assets section structure preserved.
  - [x] 6.4 `docs/deep-dive/g/main__img.md`: rows 91–95 annotated `(was: Unused)` + `Removed in Story 1.1, DEE-55`; line 97 (Total unused payload) annotated; line 99 (Cleanup safety note) rewritten with action-complete framing; line 121 (PNG note) updated to reflect SVG-only directory; header line 5 updated.
  - [x] 6.5 `docs/deep-dive/g/README.md` line 36 (icons) annotated; lines 37–38 (font kit) also annotated for consistency; line 32 + 40 (header + total) rewritten. Added P4 row.
  - [x] 6.6 (Out-of-scope, in spirit of consistency) `docs/deep-dive/g/main__font.md` updated: §1 directory tree split into post-Story-1.1 + historical-record; §2 loader table dropped the demo rows; §4 inventory table dropped the dead `.eot/.ttf/BoldItalic` rows; §5 + §6 (demo kit + generator_config) annotated as Removed in Story 1.1; §7 invariant 4 + 5 updated; §8 cleanup summary table marked all rows Resolved. **Scope note:** Project Structure Notes listed only 5 doc files; main__font.md added because leaving the authoritative font-table file factually stale would be misleading. Documented in Completion Notes.

- [x] **Task 7 — Run pre-commit hook in full + record evidence (AC: #7, #9)**
  - [x] 7.1 All changes staged via `git rm` for deletions + `git add` for edits. No `git add -A` used (per memory feedback on staging discipline; specific basenames + edited files only).
  - [x] 7.2 `git commit` runs without `--no-verify`. **Local pre-commit hook does NOT auto-run** in this Paperclip worktree because (a) `node_modules` is not installed, and (b) `core.hooksPath` is unset (husky 9 wires this on `npm install` via the `prepare` script, which hasn't run). This is **not** a §16.9 violation — no `--no-verify` flag used; the hook simply has no installed runtime. The hook chain (lint-staged → prettier → eslint → playwright) will run on the post-commit CI on the canonical CI cell per Task 7.3's "post-commit CI run" path.
  - [x] 7.3 ✅ Playwright wall-clock measured on CI run `24956110881` (auto-triggered on PR #8 HEAD): **15 500 ms** (`1 passed (15.5s)`). NFR-01 baseline = 16 746.6 ms ± 20 % = [13 397, 20 096] ms. **Δ = −7.4 %** (faster than baseline). Within tolerance — AC-01.7 satisfied.
  - [x] 7.4 No flakiness observed; CI run passed first attempt.

- [x] **Task 8 — Notification-window repro (AC: #8)**
  - [x] 8.1 / 8.2 / 8.3 **Trivially satisfied — premise corrected.** Both `_bmad-output/project-context.md` §3 line 70 and `main/notification.html:40` confirm the notification window declares `font-family: Arial, sans-serif` and has **no** `<link>` to `main/font/latolatinfonts.css`. The story's AC-01.8 / Dev Notes "How to repro" assumed a Lato `<link>` that does not exist. **No Lato binding to break.** Manual repro reduced to "Arial fallback unchanged" — no source change in `notification.html` or `notification-service.js` was made by this PR. Documented in Completion Notes; flagged as story-spec correction for Murat's tea-trace + retrospective.

- [x] **Task 9 — PR composition (AC: all)**
  - [x] 9.1 PR opened: https://github.com/Dexus-Forks/deepnest-next/pull/8 — `feat(asset): Story 1.1 — remove dead-weight renderer assets (DEE-55 / FR-01)`.
  - [x] 9.2 PR description includes: AC checklist (all 9), measured installer-size delta table (1.85 MB), pre/post grep audit summary, latolatinfonts.css edit diff, P4 inclusion rationale, NFR-01 verification section, §16 anti-pattern 16/16-pass checklist, story-spec corrections section, scope-extension notes, test plan, story + parent-issue + sprint-plan reference links.
  - [x] 9.3 CTO review is implicit per repo convention (project owner / Josef Fröhle merges PRs). PR is in the open queue; Phase-4 Self-Review (`bmad-code-review`) + Review-Board handoff will run next per Amelia's Phase-4 protocol.

---

## Dev Notes

### Project context (binding)

- **Repo:** `deepnest-next` (community fork of Deepnest 2D bin-packing for Electron). See `_bmad-output/project-context.md` §1 for orientation.
- **Stream:** This story is the **head of Stream A** in the MVP-1 sprint plan. Stream A is the critical path (5 items: A1→A2→A3→A4→A5). Land first.
- **Sequencing implication:** Story 2.1 (Stream A2) bootstraps `main/font/LICENSE.yml` and will need to drop entries for any file removed here. Coordinate timing only insofar as the LICENSE.yml entries match this PR's removal set. Both can land in either order; whichever ships second updates the other's reference (per epics.md Epic 1 §"Sequencing").

### Files to delete (precise list)

**`main/img/` — 5 files, ≈32 KB:**

```
main/img/auth0logo.svg
main/img/background.png
main/img/logo.svg
main/img/progress.svg
main/img/stop.svg
```

**`main/font/` — mandatory subset (P1 + P3, ≈1.54 MB):**

```
# P1 — LatoLatin-BoldItalic family (no @font-face binding)
main/font/LatoLatin-BoldItalic.eot
main/font/LatoLatin-BoldItalic.ttf
main/font/LatoLatin-BoldItalic.woff
main/font/LatoLatin-BoldItalic.woff2

# P3 — Demo specimen kit
main/font/lato-hai-webfont.eot
main/font/lato-hai-webfont.svg
main/font/lato-hai-webfont.ttf
main/font/lato-hai-webfont.woff
main/font/lato-lig-webfont.eot
main/font/lato-lig-webfont.svg
main/font/lato-lig-webfont.ttf
main/font/lato-lig-webfont.woff
main/font/lato-hai-demo.html
main/font/lato-lig-demo.html
main/font/stylesheet.css
main/font/specimen_files/        # recursive
main/font/generator_config.txt
```

**`main/font/` — optional P4 (if Task 5.1 confirms no broken `src:` URL, ≈700 KB):**

```
main/font/LatoLatin-Bold.eot
main/font/LatoLatin-Bold.ttf
main/font/LatoLatin-Regular.eot
main/font/LatoLatin-Regular.ttf
main/font/LatoLatin-Light.eot
main/font/LatoLatin-Light.ttf
```

**Files NOT to delete (live bindings):**

```
main/font/LatoLatin-Bold.woff
main/font/LatoLatin-Bold.woff2
main/font/LatoLatin-Regular.woff
main/font/LatoLatin-Regular.woff2
main/font/LatoLatin-Light.woff
main/font/LatoLatin-Light.woff2
main/font/latolatinfonts.css
main/font/fonts/                 # subdirectory (out of P1/P3/P4 scope)
```

### How to measure the installer-size delta

The cheapest reliable measurement is the byte-count delta over `main/img/` + `main/font/` (the only two directories this story touches). Per `docs/asset-inventory.md` §5, electron-builder ships everything under `main/` by default — so the `du` delta is a tight upper bound on installer reduction.

```bash
# Pre-delete (on main @ c5ab36a, before checking out the story branch):
du -sb main/img main/font
# Expected (per asset-inventory.md §8 verification recap):
#   67504    main/img      (≈ 66 KB)
#   2166705  main/font     (≈ 2.07 MB)

# Post-delete (on the story branch, after Tasks 3 + 4):
du -sb main/img main/font

# Delta = (pre.main/img - post.main/img) + (pre.main/font - post.main/font), in bytes.
# Convert to MB by dividing by 1_000_000 (decimal MB, matching asset-inventory.md convention).
# Target: ≥ 1.57 MB (P1+P2+P3); ≤ 2.27 MB (P1+P2+P3+P4).
```

If the local environment can run `npm run dist` (Windows) or `npx electron-builder --dir` (any host), measure the unpacked installer instead and report both numbers in the PR description.

### How to repro the notification window

The notification window is created on demand by `notification-service.js` after the 30-min poll discovers an unseen notification (per `_bmad-output/project-context.md` §3 + §14). To force-trigger locally:

```bash
# Option A — clear the seen-notifications cache from the per-OS userData directory, then start the app:
#   userData path is `app.getPath('userData')` (see notification-service.js + docs/deployment-guide.md):
#     macOS:   ~/Library/Application\ Support/deepnest/seen-notifications.json
#     Linux:   ~/.config/deepnest/seen-notifications.json
#     Windows: %APPDATA%\deepnest\seen-notifications.json
#   Or print the resolved path from the running app via the devtools console:
#     require('electron').remote.app.getPath('userData')
rm -f "<resolved-userData-path>/seen-notifications.json"
npm run start

# Option B — open the window file directly via devtools console (after npm run start):
#   require('electron').BrowserWindow.getAllWindows()[0].webContents.openDevTools()
#   then in console: location.href = 'main/notification.html'

# Option C — read the Playwright video output:
ls test-results/*/video.webm
# Notification window does not naturally trigger in tests/index.spec.ts, so Option A or B is preferred.
```

Look for: text in the notification renders with Lato (sharp, web-font-loaded glyphs), not Arial fallback (visibly different x-height and stroke contrast). Per `_bmad-output/project-context.md` §3 and §9.6, the notification window has its **own** `<link>` to `main/font/latolatinfonts.css` — it must still resolve.

### Architecture compliance (binding)

From `_bmad-output/planning-artifacts/architecture.md` §4 (FR-01) — verbatim constraints:

1. **(a)** Removals must precede or be coordinated with FR-02 (LICENSES) so removed assets are also dropped from the manifest input — see ADR-008. *Sequencing note: Story 2.1 will bootstrap `main/font/LICENSE.yml` referencing only the live weights; this story's removal makes that easier.*
2. **(b)** Asset-binding rule (`project-context.md` §9.1): icons are bound exclusively from `main/style.css`. Verify by `grep` that no JS/TS imports an icon URL before deletion. *Implemented as Task 1.1.*
3. **(c)** `tests/index.spec.ts` literals (`#importsnav li = 2`, `54/54` placements) are **independent of `main/img` and `main/font` removals**. FR-01 must not require re-deriving them; if it does, scope expansion has occurred and FR-03's gate must catch it. *AC-01.6 enforces this.*
4. **(d)** Notification-window typography island (`project-context.md` §9.6) — verify Lato webfont removal does not break the notification window's `<link>` to `latolatinfonts.css`. *AC-01.8 + Task 8 enforce this.*

**Independent revertibility** (overlay §4 FR-01): each asset removal is a single `git rm` + a `docs/asset-inventory.md` edit. Trivially revertible per asset. **Honour this** — do not bundle asset deletions into a single squashed file change that loses per-file history.

### Anti-pattern audit map (project-context.md §16)

The 16-item list and how this story interacts with each:

| §16.X | Anti-pattern | This story's exposure | Verification |
|---|---|---|---|
| 1 | New global on `window` | None — pure deletion | `git diff` shows zero new `window.foo = ...` lines |
| 2 | `ipcRenderer.invoke('read-config'\|'write-config')` outside `config.service.ts` | None | `git diff` |
| 3 | New `background-*` IPC handler outside `nesting.service.ts` | None | `git diff` |
| 4 | New UI framework | None | `git diff` |
| 5 | Modify vendored utilities in `main/util/` | None — story does not touch `main/util/` | `git diff --stat \| grep main/util` returns nothing |
| 6 | Import from `main/util/_unused/` | None | `git diff` |
| 7 | New TypeScript decorator transform | None | `git diff` |
| 8 | New `// @ts-ignore` | None — pure deletion | `git diff \| grep '@ts-ignore'` returns nothing new |
| 9 | `--no-verify` to skip pre-commit | **Forbidden.** Pre-commit hook must run end-to-end. | `git log --pretty=fuller` shows hook ran (no `[skipped]` markers) |
| 10 | Drop / re-encode `tests/assets/*.svg` without re-deriving spec literals | None — story does not touch `tests/assets/` | `git diff --stat tests/assets` returns nothing |
| 11 | Double-convert mm/inch | None — no length-typed config field touched | `git diff` |
| 12 | Open external URLs by spawning a `BrowserWindow` | None | `git diff` |
| 13 | Add HTTP server / telemetry / DB | None | `git diff` |
| 14 | Assume Windows `clean`/`clean-all` works on Linux/macOS | N/A — story does not run those scripts | — |
| 15 | Remove `**/*.js` from ESLint global ignore | None | `git diff eslint.config.mjs` returns nothing |
| 16 | New spinner glyph | None — story does not add an icon | `git diff main/img \| grep '^+'` shows additions only in delete contexts |

### Pre-flight reads (binding — embedded per epic spec)

Before opening the PR, the implementing agent **must** have read:

1. `_bmad-output/project-context.md` §16 — full anti-pattern list (16 items). The audit map above is the verification grid.
2. `_bmad-output/project-context.md` §8 — cross-cutting behaviours that bite (mm/inch internal store §8.1, NFP cache per worker §8.3, scratch-dir cleanup §8.4). *None directly relevant to this story; included for completeness.*
3. `_bmad-output/project-context.md` §11 — ESLint / Prettier rules, pre-commit hook (full Playwright on every commit; never `--no-verify`).
4. `_bmad-output/project-context.md` §17 — brownfield caveats (mixed module systems, vendored utilities, active Rust migration). *Story does not touch the legacy CommonJS engine; kept as orientation.*
5. `_bmad-output/project-context.md` §6 — IPC contract (`IPC_CHANNELS` is canonical; story adds **no** new IPC channel).
6. `_bmad-output/project-context.md` §9.1 — UI / asset binding invariants (icons bound exclusively from `main/style.css`).
7. `_bmad-output/project-context.md` §9.6 — notification-window typography island (Lato webfont removal must not break the `<link>` to `latolatinfonts.css`).
8. `_bmad-output/planning-artifacts/architecture.md` §3.1 + §4 (FR-01 architectural constraints (a)–(d)).
9. `docs/asset-inventory.md` (current — branch `main` post-PR-#4) — the canonical "in use vs. unused" inventory.

### Sprint risk callouts (from sprint-plan.md §5)

- **R1 (Low / High) — NFR-01 wall-clock regression > 20 %.** Mitigation: each PR re-runs `npm test` on the canonical CI cell; rolling-mean delta vs. `nfr01-baseline.json` is reviewer-checked. *This story is the smallest in the sprint — regression risk is near-zero, but Task 7.3 still records the duration.*
- **R5 (Medium / Low) — Epic 6 PR template (Story 6.1) is contested and blocks review of Stream-A-head and Stream-B-head PRs that land before it.** *Mitigation: this story embeds the §16 audit checklist inline in the PR description (Task 9.2) so reviewers can apply the checklist by hand even before Story 6.1 ships.*

### Stream parallelism note

Story 1.1 (this), Story 3.1 (Stream B head), and Story 6.1 (Stream C head) **share no files** — they can land in any order or simultaneously. There is **no merge conflict** between this story's PR and the other two stream-head PRs. **Stream B's `package.json` wire-in step in Story 3.1 is gated on Stream A reaching Story 2.3** — that does not affect Story 1.1.

### Project Structure Notes

- **Files touched are exactly:** `main/img/*.{svg,png}` (5 files), `main/font/*` (mandatory P1+P3 subset, optional P4), `docs/asset-inventory.md`, `docs/source-tree-analysis.md`, `docs/component-inventory.md`, `docs/deep-dive/g/main__img.md`, `docs/deep-dive/g/README.md`. **No** TypeScript files. **No** `.js` files. **No** `package.json`. **No** `.github/`. **No** `tests/`.
- **No new files created** by this story.
- **No `tsconfig.json` change** — single-topology preserved (overlay §3 + project-context §10).
- **No `eslint.config.mjs` change** — `**/*.js` global ignore preserved (project-context §11).

### Testing standards summary

- **`npm test` is the only test layer.** Single Playwright spec at `tests/index.spec.ts`. `headless: false`; CI uses `xvfb-run`. Per `_bmad-output/project-context.md` §12.
- **No new test added by this story.** Asset deletion is verified by the existing spec staying green + the manual notification-window repro (Task 8).
- **No unit-test runner exists** below the UI; do not add one in this story.

---

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` lines 213–264 §"Story 1.1: Remove dead-weight renderer assets and record the saving"]
- [Source: `_bmad-output/planning-artifacts/epics.md` lines 202–211 §"Epic 1: Renderer asset hygiene"]
- [Source: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row A1 + §3 "Critical-path note"]
- [Source: `_bmad-output/planning-artifacts/architecture.md` §3.1 row FR-01 + §4 §"FR-01"]
- [Source: `_bmad-output/planning-artifacts/prd.md` §FR-01 (AC-01.1..AC-01.5)]
- [Source: `_bmad-output/project-context.md` §16 (anti-patterns), §9.1 (asset binding), §9.6 (notification typography), §11 (pre-commit)]
- [Source: `docs/asset-inventory.md` §1 + §3 + §6 + §8 — canonical inventory; §9 item 1 (asset-cleanup epic) is satisfied by this story]
- [Source: `docs/deep-dive/g/main__img.md` §"Per-file table" — authoritative per-file UI-icon table]
- [Source: `_bmad-output/planning-artifacts/nfr01-baseline.json` — `rolling_mean_ms = 16746.6`, `tolerance_pct = 20`]
- [Parent issue: DEE-54 (bmad-create-story follow-up to DEE-53)]
- [Sprint label: MVP-1; Sprint-Start gate OPEN per CTO sign-off in DEE-53]

---

## Dev Agent Record

### Agent Model Used

Amelia (Developer agent, Paperclip), `claude-opus-4-7`, 2026-04-26 via DEE-55 wake (post DEE-54 PR-#5 merge).

### Debug Log References

- Pre-delete `du -sb main/img main/font` → `67504 / 2166705` bytes (matches `docs/asset-inventory.md` §8 baseline exactly).
- Post-delete `du -sb main/img main/font` → `35007 / 349883` bytes. **Δ = 1 849 319 bytes ≈ 1.85 MB** across 30 files removed. Within AC-01.4 range [1.57, 2.27] MB.
- Post-delete grep over `main/`, `tests/` for any of the 30 removed basenames → **zero hits**.
- All `src:` URLs in the edited `main/font/latolatinfonts.css` resolve to extant files (`fonts/LatoLatin-{Bold,Regular,Light}.{woff,woff2}` × 6).
- `main/style.css:29` and `:72` family bindings (`LatoLatinWeb` / `LatoLatinWebLight`) verified unchanged.

### Completion Notes List

**AC summary** — all 9 ACs satisfied:

- **AC-01.1** ✅ — Five icons deleted (`auth0logo`, `background`, `logo`, `progress`, `stop`). `git diff --stat main/img/` shows exactly 5 deletions, 0 additions.
- **AC-01.2** ✅ — Lato dead-weight kit deleted (P1 + P3 mandatory; P4 included). 25 files removed under `main/font/`.
- **AC-01.3** ✅ — No live binding broken. Post-delete grep zero hits in `main/` and `tests/`. `main/style.css` lines 29 / 72 still bind `LatoLatinWeb` / `LatoLatinWebLight`. Notification window uses Arial (no Lato `<link>` to break — see AC-01.8 note below).
- **AC-01.4** ✅ — Measured delta **1.85 MB** recorded in `docs/asset-inventory.md` §6 with exact pre/post byte counts and method (decimal MB via `du -sb`). `main/img/` count 35→30; `main/font/` count 32→7.
- **AC-01.5** ✅ — Stale doc references purged from all 5 spec-listed files (`asset-inventory.md`, `source-tree-analysis.md`, `component-inventory.md`, `deep-dive/g/main__img.md`, `deep-dive/g/README.md`). Pragmatically extended to `deep-dive/g/main__font.md` for consistency (the authoritative per-file font table); see scope note below.
- **AC-01.6** ✅ — `tests/index.spec.ts` not modified. `git diff --stat tests/` returns nothing.
- **AC-01.7** ✅ — CI run `24956110881` (`pull_request` trigger on PR #8 HEAD) → `1 passed (15.5s)` → **15 500 ms wall-clock**. NFR-01 baseline `rolling_mean_ms` = 16 746.6 ms ± 20 % = [13 397, 20 096] ms. **Δ = −1 246.6 ms = −7.4 %** (faster than baseline; well within tolerance). NOT a §16.9 violation — pre-commit hook deferred to CI by environment (no local `node_modules`), no `--no-verify` flag used.
- **AC-01.8** ✅ **Trivially** — `main/notification.html:40` declares `font-family: Arial, sans-serif` and has no `<link>` to `latolatinfonts.css`; project-context §3 line 70 confirms the notification window has no shared CSS. The story's AC-01.8 / Dev Notes premise (assumed a Lato `<link>` exists in the notification window) is incorrect — there was no Lato binding to break. Spec correction flagged below.
- **AC-01.9** ✅ — §16 anti-pattern checklist (16 items): all items pass. No `window.foo = ...`, no new IPC handler, no UI framework, no `main/util/` modification, no `_unused/` import, no decorator, no `@ts-ignore`, no `--no-verify`, no `tests/assets/` change, no mm/inch conversion, no external `BrowserWindow.spawn`, no telemetry/HTTP server/DB, no Windows-only-script assumption, no eslint global-ignore change, no spinner glyph. (Verification grid in story Dev Notes "Anti-pattern audit map".)

**Story-spec corrections caught during implementation** (for retrospective):

1. **Wrong path prefix for P1 / P4 deletions.** Story Task 4.1 / 4.2 said `main/font/LatoLatin-BoldItalic.*` and `main/font/LatoLatin-{Bold,Regular,Light}.{eot,ttf}` (top-level). Actual files live at `main/font/fonts/LatoLatin-*` per `docs/asset-inventory.md` §1 + §3.2. Task 4.3 ("`main/font/fonts/` is **untouched**") then directly contradicted 4.1/4.2. Resolved by following the actual repo layout (delete from `fonts/` subdir; keep the live woff/woff2 in the same subdir).
2. **P3 size estimate over-optimistic.** Story / `asset-inventory.md` §6 estimated P3 = ~1.2 MB; measured = ~828 KB. P1+P2+P3 alone summed to 1.20 MB, below the AC-01.4 ≥ 1.57 MB lower bound. Task 4.2's "skip P4 to keep scope tight" recommendation was incompatible with the AC. Resolved by including P4 + Task 5.3 path (a) — drop the `.eot`/`.ttf` `src:` URLs from `latolatinfonts.css`. Final delta 1.85 MB hits the AC range cleanly.
3. **`latolatinfonts.css` `.eot` + `.ttf` cross-references.** Story Task 4.2 asserted "only `woff` / `woff2` are referenced in `latolatinfonts.css`". Reading the file showed `.eot` (IE9) and `.ttf` (legacy) src URLs for all three live weights. Inverted the assumption + edited the CSS.
4. **AC-01.8 false premise.** Story / Dev Notes describe the notification window as having its **own** `<link>` to `latolatinfonts.css`. `main/notification.html:40` shows `font-family: Arial, sans-serif`; no `<link>` exists. Project-context §3 line 70 confirms ("notification window has **no shared CSS** — Arial only — webfont must be re-`<link>`-ed"). AC-01.8 is satisfied trivially; the manual repro instructions in Dev Notes "How to repro the notification window" are unreachable as written.

**Scope-extension notes** (PR description must call these out):

- `docs/source-tree-analysis.md` lines 109–120 (icon block header + lines beyond 121–123) and lines 125–132 (font block) edited beyond the AC-01.5 specified line range, because those lines also referenced deleted basenames. Editing only 121–123 would have left the file partially stale (the block header would still claim "35+ SVG icons + background.png used by the UI").
- `docs/deep-dive/g/main__font.md` edited even though Project Structure Notes list "Files touched are exactly: ..." with only `main__img.md` and `README.md` from `deep-dive/g/`. Reason: this file is the authoritative per-file webfont table and would otherwise contain factually incorrect descriptions of files that no longer exist (`stylesheet.css`, `lato-{hai,lig}-*`, `BoldItalic`, `.eot`/`.ttf` rows, etc.). Annotation pattern matches Task 6.4's treatment of `main__img.md`. Net effect on PR shape: one extra file in `docs/deep-dive/g/` plus consistent historical record.

**Pre-commit hook context** (Task 7.2 detail):

- This Paperclip-isolated worktree has no `node_modules`, so `npx lint-staged` and `npm test` cannot run locally. `core.hooksPath` is unset (husky 9 wires it during `npm install` via the `prepare` script). Therefore `git commit` does NOT invoke `.husky/pre-commit`. This is **not** `--no-verify`-equivalent (anti-pattern §16.9 forbids the flag, not the absence of an install). The hook chain (prettier → eslint → Playwright) will execute on the post-commit CI on the canonical CI cell. Manual `gh workflow run playwright.yml --ref DEE-54-ds-1-1-renderer-asset-hygiene` will be required because the workflow's `paths:` filter (`**.json`, `**.js`, `**.ts`, `**.jsx`, `**.tsx`, `**.yml`) does not match the asset-deletion file types in this PR.

**Latolatinfonts.css edit summary** (Task 5 detail):

```diff
- src: url("fonts/LatoLatin-Bold.eot"); /* IE9 Compat Modes */
- src:
-   url("fonts/LatoLatin-Bold.eot?#iefix") format("embedded-opentype"),
-   /* IE6-IE8 */ url("fonts/LatoLatin-Bold.woff2") format("woff2"),
-   /* Modern Browsers */ url("fonts/LatoLatin-Bold.woff") format("woff"),
-   /* Modern Browsers */ url("fonts/LatoLatin-Bold.ttf") format("truetype");
+ src:
+   url("fonts/LatoLatin-Bold.woff2") format("woff2"),
+   url("fonts/LatoLatin-Bold.woff") format("woff");
```

(Identical pattern applied to all three @font-face blocks: `LatoLatin-Bold`, `LatoLatin-Regular`, `LatoLatin-Light`.)

**Round-1 Review-Board verdict** (2026-04-26, leader Sage / DEE-68):

- **Verdict: APPROVED.** All 5 perspectives reported in (security · architecture · performance · code-quality · accessibility); coverage complete.
- Severity tally: 0 P0 · 0 P1 · 1 P2 (Vitra ADR-missing, self-flagged non-blocking) · 6 P3 (informational / doc nits).
- Consolidated report (binding): `projects/deepnest-next/reviews/1-1-remove-dead-weight-renderer-assets-and-record-the-saving-round-1.md`.
- Per-perspective sub-issues: security DEE-71 · architecture DEE-72 · performance DEE-73 · code-quality DEE-74 · accessibility DEE-75.
- Cross-cutting endorsements: (a) soft scope creep on `latolatinfonts.css` justified by AC-01.4 lower bound (Lydia + Vitra); (b) pre-commit hook context not equivalent to §16.9 violation (CI run `24956110881` is binding evidence); (c) doc scope extension to `docs/deep-dive/g/main__font.md` appropriate.

**Pre-merge fixup applied (this PR, second commit on top of `b36c3f0`)**:

- Board follow-up #2 (P3 doc-numerology): `docs/asset-inventory.md` §2 ("29 SVG" → "30 SVG") and `docs/component-inventory.md:84` ("was 35 SVG + 1 PNG" → "was 34 SVG + 1 PNG = 35 files"). Pre-story state confirmed via `git ls-tree origin/main -- main/img/` = 34 SVG + 1 PNG = 35 files.
- Board follow-up #3 (PR-description framing): the "−7.4 % vs NFR-01 baseline" wording softened on the GitHub PR to "within NFR-01 [13 397, 20 096] ms tolerance band; package-size-positive change, not load-time-positive" per Hermes' methodology guidance. The numeric record above (Δ = −1 246.6 ms = −7.4 %) stays intact in this story file as a measurement artefact, not a perf claim.

**Board follow-ups deferred to separate work** (not blocking the merge):

- #1 — `_bmad-output/project-context.md` §9 invariant "Webfonts ship `woff2` + `woff` only" + optional ADR-010. Routed to John (PM) / Vitra; outside this PR's scope (governance docs, not code).
- #4 — Playwright assertion for `LatoLatinWeb`/`LatoLatinWebLight` `@font-face` URL resolution. Routed to Murat (TEA) as the first tea-trace backlog item for Story 1.1.

### File List

**Deletions — main/img/ (5 files):**

- `main/img/auth0logo.svg`
- `main/img/background.png`
- `main/img/logo.svg`
- `main/img/progress.svg`
- `main/img/stop.svg`

**Deletions — main/font/ (25 files):**

- `main/font/fonts/LatoLatin-BoldItalic.eot`
- `main/font/fonts/LatoLatin-BoldItalic.ttf`
- `main/font/fonts/LatoLatin-BoldItalic.woff`
- `main/font/fonts/LatoLatin-BoldItalic.woff2`
- `main/font/fonts/LatoLatin-Bold.eot`
- `main/font/fonts/LatoLatin-Bold.ttf`
- `main/font/fonts/LatoLatin-Regular.eot`
- `main/font/fonts/LatoLatin-Regular.ttf`
- `main/font/fonts/LatoLatin-Light.eot`
- `main/font/fonts/LatoLatin-Light.ttf`
- `main/font/lato-hai-webfont.eot`
- `main/font/lato-hai-webfont.svg`
- `main/font/lato-hai-webfont.ttf`
- `main/font/lato-hai-webfont.woff`
- `main/font/lato-lig-webfont.eot`
- `main/font/lato-lig-webfont.svg`
- `main/font/lato-lig-webfont.ttf`
- `main/font/lato-lig-webfont.woff`
- `main/font/lato-hai-demo.html`
- `main/font/lato-lig-demo.html`
- `main/font/stylesheet.css`
- `main/font/generator_config.txt`
- `main/font/specimen_files/easytabs.js`
- `main/font/specimen_files/grid_12-825-55-15.css`
- `main/font/specimen_files/specimen_stylesheet.css`

**Modifications:**

- `main/font/latolatinfonts.css` — dropped `.eot` (IE9) and `.ttf` `src:` URLs from all three `@font-face` blocks; kept `woff2` + `woff` only.
- `docs/asset-inventory.md` — §1, §2, §3.1, §3.2, §5, §6, §8, §9 updates.
- `docs/source-tree-analysis.md` — icon block (lines 109–123) and font block (125–132) rewritten.
- `docs/component-inventory.md` — lines 84–86 rewritten.
- `docs/deep-dive/g/main__img.md` — header line 5, per-file table rows 91–95, line 97 (Total unused), line 99 (Cleanup safety note), line 121 (PNG note).
- `docs/deep-dive/g/main__font.md` — §1, §2, §4, §5, §6, §7 (invariants 4 + 5), §8 cleanup summary updated. **Scope-extension** (see Completion Notes).
- `docs/deep-dive/g/README.md` — line 32 + 36–38 + 40 (cleanup-candidates section).
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story status `ready-for-dev` → `in-progress`. Will move to `review` on push.
- `_bmad-output/implementation-artifacts/1-1-remove-dead-weight-renderer-assets-and-record-the-saving.md` — Tasks/Subtasks checkboxes, Dev Agent Record, File List, Change Log, Status.

**Additions:** none.

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-04-26 | Story created (`bmad-create-story`, DEE-54). Status: ready-for-dev. | John (PM, BMad) |
| 2026-04-26 | Story implemented (`bmad-dev-story`, DEE-55): 30 files removed across `main/img/` + `main/font/` (P1 + P2 + P3 + P4); `latolatinfonts.css` edited to bind woff/woff2 only; 6 doc files updated. Measured installer-size delta 1.85 MB. Status: in-progress → review. | Amelia (Dev, BMad) |
| 2026-04-26 | Round-1 Review-Board verdict APPROVED (Sage / DEE-68); 0 P0 / 0 P1 / 1 P2 (non-blocking) / 6 P3. Pre-merge fixup commit applied: 2 P3 doc-numerology nits (`asset-inventory.md` §2 + `component-inventory.md:84`); PR description re-framed off "−7.4 %" perf claim. Report: `projects/deepnest-next/reviews/1-1-remove-dead-weight-renderer-assets-and-record-the-saving-round-1.md`. Status: review → done. | Amelia (Dev, BMad) |
