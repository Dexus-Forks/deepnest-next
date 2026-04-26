# Story 1.1: Remove dead-weight renderer assets and record the saving

Status: ready-for-dev

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

- [ ] **Task 1 — Pre-delete grep audit (AC: #3, #9)**
  - [ ] 1.1 Run `git grep -nE "auth0logo|background\.png|^logo\.svg|/logo\.svg|progress\.svg|stop\.svg"` over `main/`, `tests/`, `docs/` (excluding `_bmad-output/`). Capture the output for the PR description.
  - [ ] 1.2 Run `git grep -nE "LatoLatin-BoldItalic|lato-hai-webfont|lato-lig-webfont|lato-hai-demo|lato-lig-demo|stylesheet\.css|specimen_files|generator_config"` over the same set. Capture the output.
  - [ ] 1.3 Confirm every hit is **either** (a) a `docs/` line that AC-01.5 already targets, or (b) a self-referential demo-page link inside the dead-weight kit itself (which is also being removed). If any other live-binding hit exists, **STOP** and escalate via `bmad-correct-course` — scope expansion.

- [ ] **Task 2 — Capture pre-delete installer-size baseline (AC: #4)**
  - [ ] 2.1 On a clean checkout of `main` at `c5ab36a` (post-DEE-53 PR #4 merge), run `du -sb main/img main/font` and record the byte counts.
  - [ ] 2.2 Optionally: run `npx electron-builder --dir` (or `npm run dist` on a Windows runner) to measure the actual unpacked installer size pre-delete. **Optional** because the `du -sb` saving is a tight upper bound on installer reduction (electron-builder includes everything under `main/` per `docs/asset-inventory.md` §5). If the local environment cannot run `electron-builder --dir` (Linux without Wine, or missing `libboost-dev`), the `du -sb` measurement is sufficient — flag this in the PR description.

- [ ] **Task 3 — Delete the five unused icons (AC: #1, #3)**
  - [ ] 3.1 `git rm main/img/auth0logo.svg main/img/background.png main/img/logo.svg main/img/progress.svg main/img/stop.svg`.
  - [ ] 3.2 Re-run the icon-side grep from 1.1 — must return **zero hits** outside `docs/asset-inventory.md`, `docs/source-tree-analysis.md`, `docs/component-inventory.md`, `docs/deep-dive/g/main__img.md`, `docs/deep-dive/g/README.md` (these are addressed in Task 6).

- [ ] **Task 4 — Delete the Lato dead-weight kit (AC: #2, #3)**
  - [ ] 4.1 Delete the **mandatory** P1 + P3 subset (per `docs/asset-inventory.md` §6):
    - P1: `main/font/LatoLatin-BoldItalic.eot`, `LatoLatin-BoldItalic.ttf`, `LatoLatin-BoldItalic.woff`, `LatoLatin-BoldItalic.woff2` (≈336 KB; zero `@font-face` binding — verified in `main/font/latolatinfonts.css`).
    - P3: `main/font/lato-hai-webfont.{eot,svg,ttf,woff}`, `main/font/lato-lig-webfont.{eot,svg,ttf,woff}`, `main/font/lato-hai-demo.html`, `main/font/lato-lig-demo.html`, `main/font/stylesheet.css`, `main/font/specimen_files/` (recursive), `main/font/generator_config.txt` (≈1.2 MB total).
  - [ ] 4.2 **Optional** P4 (decide based on saving target):
    - P4: `.eot` + `.ttf` files for the three live weights (`LatoLatin-Bold.{eot,ttf}`, `LatoLatin-Regular.{eot,ttf}`, `LatoLatin-Light.{eot,ttf}`) — ≈700 KB. **Safe on Electron / Chromium** (only `woff` / `woff2` are referenced in `latolatinfonts.css`). If included: AC-01.4 saving target shifts toward the 2.27 MB upper bound and Task 5 must update `latolatinfonts.css` if (and only if) any `.eot`/`.ttf` `src:` URL still points to a removed file. **Verify before deciding** by reading `main/font/latolatinfonts.css` end-to-end.
    - **Recommendation:** include P4 unless Task 5 finds an `.eot` / `.ttf` `src:` URL in `latolatinfonts.css` that points to a live weight — in which case skip P4 to keep the change scope tight for this Stream-A-head PR.
  - [ ] 4.3 Verify `main/font/fonts/` (the subdirectory listed in §1 of `asset-inventory.md`) is **untouched** by this story. P1/P3/P4 scope is the top level of `main/font/` only.
  - [ ] 4.4 Re-run the font-side grep from 1.2 — must return **zero hits** outside the docs files in Task 6.

- [ ] **Task 5 — Verify `latolatinfonts.css` integrity (AC: #3, #8)**
  - [ ] 5.1 Read `main/font/latolatinfonts.css` end-to-end. Confirm that every `@font-face { src: url(...) }` URL still resolves to a file that exists post-Task-4.
  - [ ] 5.2 Confirm `main/style.css` line 29 / line 72 (the live binding sites per `docs/asset-inventory.md` §5) still reference the live LatoLatin / LatoLatinWebLight families correctly.
  - [ ] 5.3 If P4 was included in Task 4.2 and any `.eot`/`.ttf` URL in `latolatinfonts.css` now points to a removed file, **either** (a) remove the broken `src:` line (Chromium picks the next-highest-priority `format()`), **or** (b) revert P4 from this PR and document the deferral.

- [ ] **Task 6 — Update documentation (AC: #4, #5)**
  - [ ] 6.1 Edit `docs/asset-inventory.md`:
    - Update §1 file-system table: new counts for `main/img/` (was 35, now 30) and `main/font/` (was 32, new count after Task 4).
    - Update §3.1 / §3.2 inventories: mark removed files as `(removed in DEE-54 follow-up / Story 1.1)` or strip the rows.
    - Update §4 "Total dead weight" — remove the "5 unused" callout (or annotate as resolved).
    - Update §6 "Cleanup roadmap" table: mark P1 + P2 + P3 (and P4 if included) as `Status: removed in Story 1.1 (DEE-54 follow-up)`. **Preserve the table shape** so reviewers can still see the priority lattice.
    - Add a new subsection or top-of-§6 note: **"Measured installer-size delta (Story 1.1, DEE-54 follow-up): X.XX MB"** with the value from Task 2.
    - Update §8 "Verification recap" file-system facts to the new counts. Add a 2026-04-XX line for this story's re-verification.
  - [ ] 6.2 Edit `docs/source-tree-analysis.md` lines 121–123: remove or strike-through the lines that mention `progress.svg`, `auth0logo.svg`, `background.png`.
  - [ ] 6.3 Edit `docs/component-inventory.md` lines 84–86: remove or rewrite to drop the references to `background.png` and `auth0logo.svg`. **Preserve the §"Static assets" structure** — only the dead-asset references are stripped.
  - [ ] 6.4 Edit `docs/deep-dive/g/main__img.md` lines 91–95 (per-file table rows for the five icons) and line 99 ("Cleanup safety note"): annotate as `(removed in Story 1.1, DEE-54 follow-up)` rather than deleting the rows — preserves the historical inventory for future audits. Update the §"Total unused payload: ~32 KB" line accordingly.
  - [ ] 6.5 Edit `docs/deep-dive/g/README.md` line 36: same treatment as 6.4.

- [ ] **Task 7 — Run pre-commit hook in full + record evidence (AC: #7, #9)**
  - [ ] 7.1 Stage all changes (`git add -A` is acceptable here — no risk of staging secrets).
  - [ ] 7.2 `git commit -m "..."`. The pre-commit hook (`husky` → `lint-staged` → `prettier --write && eslint --fix && playwright test`) must run in full. **Never `--no-verify`** (anti-pattern §16.9).
  - [ ] 7.3 Record the wall-clock duration of the Playwright run from the hook output (or from the post-commit CI run on the canonical CI cell — Linux × Node 22.x). Compare against `nfr01-baseline.json` `rolling_mean_ms`. Both must be within ±20 %.
  - [ ] 7.4 If the hook's Playwright run flakes once, retry once. If it flakes again, **STOP** — investigate before pushing (the new dead-asset removal is the most-likely-culprit hypothesis to disprove; a P4-related broken `src:` URL is the second most likely).

- [ ] **Task 8 — Manual notification-window repro (AC: #8)**
  - [ ] 8.1 Run `npm run start` locally. **Or** if the runner cannot run Electron headed, inspect the Playwright run's video / trace artefacts for the notification-window frames; their typography must visually match the pre-removal baseline (record a screenshot in the PR description).
  - [ ] 8.2 If a notification is not naturally triggered by the spec, set `notification-service.js` to short-circuit the 30-minute poll for the local repro (revert before commit; alternatively, manually open `main/notification.html` from devtools).
  - [ ] 8.3 Confirm visually that the notification-window text renders with Lato (not Arial fallback). If Arial fallback shows, **STOP** — Task 5 missed a binding. Iterate.

- [ ] **Task 9 — PR composition (AC: all)**
  - [ ] 9.1 Open the PR against `main`. Title pattern: `feat(asset): Story 1.1 — remove dead-weight renderer assets (DEE-54 / FR-01)`.
  - [ ] 9.2 PR description must include:
    - The six "given/when/then" AC blocks transposed to checkboxes.
    - The pre-delete and post-delete grep outputs from Tasks 1.1, 1.2, 3.2, 4.4 (in collapsed `<details>` blocks).
    - The measured installer-size delta in MB (Task 2).
    - The Playwright run wall-clock vs. NFR-01 baseline comparison (Task 7.3).
    - The notification-window screenshot / trace evidence (Task 8.1).
    - **The §16 anti-pattern checklist** — explicit one-line "✅ §16.X — not violated" or "N/A — story does not touch this surface" for every item 1..16. (When Story 6.1 ships, the PR template will pre-populate this; until then, embed it inline per Stream-C-head PR-template intent.)
    - A reference link to this story file: `_bmad-output/implementation-artifacts/1-1-remove-dead-weight-renderer-assets-and-record-the-saving.md`.
    - A reference link to the parent issue: DEE-54 (the bmad-create-story follow-up to DEE-53).
  - [ ] 9.3 Request review from the CTO (per BMad agent contract, Sign-off owner for MVP epics).

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
# Option A — clear the seen-notifications cache and start the app:
rm -f $(npx electron --userData)/seen-notifications.json   # path varies by OS
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

_To be filled by Amelia (Dev) on `bmad-dev-story` execution._

### Debug Log References

_To be filled during implementation._

### Completion Notes List

_To be filled at PR-ready time._

### File List

_To be filled at PR-ready time. Expected shape: 5 deletions under `main/img/`, 14–24 deletions under `main/font/` (depending on P4 inclusion), 5 doc edits under `docs/`._
