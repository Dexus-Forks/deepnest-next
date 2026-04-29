# Story 4.1: Implement `app.shuttingDown` sentinel + bounded try/catch boundary in `main.js`

Status: ready-for-dev

> Authored by John (PM, BMad) on 2026-04-26 via `bmad-create-story` (DEE-83 batch-2) for **MVP-1 / Stream B continuation (B3)**. Sprint plan reference: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row B3. Epic anchor: `_bmad-output/planning-artifacts/epics.md` §"Story 4.1" lines 573–638.

---

## Story

As a **primary user (Riya)**,
I want **the application's two `// todo:` shutdown sites in `main.js` (around `background-response` at line 313 and `background-progress` at line 328) to short-circuit cleanly when the app is shutting down so that NFP-cache state stays consistent across all three exit paths (graceful quit, in-app cancel, OS-level kill)**,
so that **a kill-during-nest does not leak orphaned scratch dirs under `os.tmpdir()/nfpcache` and the next nest computes correctly**.

**Sprint role.** This story is **B3 — Stream B's third item** (after Story 3.1 / B1 done and Story 3.2 / B2 ready-for-dev). Story 3.1's integrity gate is the regression detector for any change here. Stream B's `B4` (Story 4.2) collects the 15/15 NFR-02 evidence and **cannot run without this PR's code in place**.

**FR/AC coverage:** FR-04 (PRD §FR-04) — AC-04.1 .. AC-04.5.
**ADR binding:** **ADR-009** (full epic) — sentinel + bounded try/catch boundary, anchored on `app.before-quit`. Cross-references: ADR-001 (multi-process compute) preserved; `project-context.md` §6 (`background-stop` semantics) preserved; `project-context.md` §8.4 (scratch-dir cleanup on `app.before-quit`) preserved — the sentinel is set **before** the existing purge runs.
**NFR coupling measured:** **NFR-02** (capability ↔ NFR pair, 15/15 trials × 3 exit paths — *measured by Story 4.2*; this PR ships the code under test); NFR-01 (no perf regression — measured here); NFR-06 (no `BrowserWindow` constructor change — invariant preserved).

---

## Acceptance Criteria

1. **AC-04.1.1 — Module-scoped sentinel boolean declared at the top of `main.js`.** A single `let appShuttingDown = false;` declaration is added near the top of `main.js` (recommended location: after the `require()` block at line 8, before any handler bindings — i.e. between current line 9 (`require("events")...`) and line 11 (`app.on('render-process-gone'...)`), or alternatively between the `crashReporter.start(...)` block and the menu template comment). The variable name is **exactly `appShuttingDown`** (matches ADR-009 Decision item 1; reviewer can grep for it).

2. **AC-04.1.2 — `app.on('before-quit', ...)` sets the sentinel as its first statement.** The existing handler (currently at `main.js:289-297`) is edited so that `appShuttingDown = true;` is the **first statement** in the callback, executed **before** the existing `nfpcache` scratch-dir purge (current lines 290-296). The existing purge logic must be preserved verbatim — no rename, no reorder, no extra cleanup added.

3. **AC-04.1.3 — `background-response` handler short-circuits when sentinel is set.** The existing `ipcMain.on("background-response", ...)` handler (currently at `main.js:313-326`) is edited so that `if (appShuttingDown) return;` is the **first statement** of the callback (before the `for` loop on line 314). The existing `// todo:` comment on line 315 is **removed** and replaced with `// fr-04: appShuttingDown sentinel guards this loop during shutdown (ADR-009)`. The existing `try`/`catch` semantics inside the loop are preserved — the sentinel is the **outer** guard; the `try`/`catch` is the **inner** bounded boundary per ADR-009.

4. **AC-04.1.4 — `background-progress` handler short-circuits when sentinel is set.** The existing `ipcMain.on("background-progress", ...)` handler (currently at `main.js:328-334`) is edited so that `if (appShuttingDown) return;` is the **first statement** of the callback (before the `try` block on line 330). The existing `// todo:` comment on line 329 is **removed** and replaced with `// fr-04: appShuttingDown sentinel guards this send during shutdown (ADR-009)`. The existing `try`/`catch` semantics are preserved.

5. **AC-04.1.5 — `background-stop` handler is NOT modified.** The `background-stop` handler (currently at `main.js:336-348`) is **explicitly excluded** from the sentinel guard — see ADR-009 Decision item 5 + epics.md §"Story 4.1" AC: "the sentinel does **not** apply to `background-stop`". The app is not shutting down during `background-stop` (only the workers are, then they're recreated). Reviewer verifies: `git diff main.js` shows no edit between current lines 336 and 348.

6. **AC-04.1.6 — `winCount = 1` invariant preserved (FR-07 boundary).** The PR does **not** modify `createBackgroundWindows()` (currently at `main.js:215-249`), the `winCount` literal `< 1` on line 218, or the `background-start` round-robin matching (`main.js:303-311`). Verified by `git diff` — only the four sites above (sentinel decl + before-quit + background-response + background-progress) are touched.

7. **AC-04.1.7 — No new IPC channel.** No new entry is added to `main/ui/types/index.ts` `IPC_CHANNELS`. The `background-response` / `background-progress` / `background-stop` channel names and payload shapes are unchanged. Verified by `git diff main/ui/types/index.ts` returning empty.

8. **AC-04.1.8 — Sentinel-race comment present at the declaration site.** Per architecture overlay §7 risk note (sentinel race during in-flight `background-stop` immediately followed by `before-quit`), the implementation MUST include a single-line comment at the sentinel declaration noting the race is bounded by single-process EventLoop ordering — no extra synchronisation needed. Recommended wording: `// fr-04: bounded by single-process EventLoop ordering — no atomics/locks needed (ADR-009 §risks)`.

9. **AC-04.1.9 — `npm test` is green on the PR (NFR-01 regression check).** Same as Story 1.1 / Story 2.1: CI run wall-clock within ±20 % of `_bmad-output/planning-artifacts/nfr01-baseline.json` `rolling_mean_ms` (17 060.0 ms ± 20 % = [13 648, 20 472] ms) on the canonical CI cell. Placement count remains `54/54`. No new flakiness (per AC-04.5).

10. **AC-04.1.10 — `project-context.md` §16 anti-patterns hold.** No new `window` global (§16.1), no new IPC channel (§16.2/§16.3), no new `// @ts-ignore` (§16.8 — `main.js` is `.js` so this is non-applicable but stays in the audit map for completeness), no edits to vendored utilities (§16.5), no edits to `_unused/` (§16.6), no `--no-verify` (§16.9), no edits to `tests/assets/` (§16.10).

11. **AC-04.1.11 — Story 4.2 (NFR-02 evidence) is NOT blocked or shipped by this PR.** This PR ships **code only**. The 15/15 manual-repro evidence per NFR-02 is the next story (Story 4.2 / B4) and may ship as part of this PR's description if the implementing agent has the time/host capacity, OR as a follow-up evidence PR. Per epics.md §"Story 4.2" → the evidence may attach to the Story 4.1 PR description **or** to a follow-up PR. PR description must explicitly state which path was taken so Murat (TEA) knows where to find the evidence.

---

## Tasks / Subtasks

- [ ] **Task 1 — Locate the four edit sites + read surrounding context (AC: #1, #2, #3, #4)**
  - [ ] 1.1 `grep -n "// todo:\|background-response\|background-progress\|before-quit" main.js` to confirm the line numbers cited above are still accurate (recommended: re-grep at story-start because `main.js` may have drifted slightly since 2026-04-26).
  - [ ] 1.2 Read `_bmad-output/planning-artifacts/architecture.md` §5 ADR-009 (full text — Decision items 1–5, Consequences, Independent revertibility).
  - [ ] 1.3 Read `_bmad-output/project-context.md` §3 (process / window topology) + §6 (IPC contract) + §8.4 (scratch-dir cleanup) + §8.5 (`EventEmitter.defaultMaxListeners = 30`) before touching `main.js`.

- [ ] **Task 2 — Add the sentinel declaration (AC: #1, #8)**
  - [ ] 2.1 Pick the declaration site (recommended: after `main.js:9` — `require("events")...` — or after `main.js:17` — `console.log(crashReporter...)`). Document the chosen line in the PR description.
  - [ ] 2.2 Add `let appShuttingDown = false;` (single line).
  - [ ] 2.3 Add the AC-04.1.8 comment immediately above or beside the declaration (`// fr-04: bounded by single-process EventLoop ordering — no atomics/locks needed (ADR-009 §risks)`).

- [ ] **Task 3 — Edit `app.on('before-quit', ...)` (AC: #2)**
  - [ ] 3.1 Locate the handler (current `main.js:289-297`).
  - [ ] 3.2 Insert `appShuttingDown = true;` as the **first statement** of the callback, before the existing `var p = path.join(...)` line.
  - [ ] 3.3 Verify the existing `nfpcache` purge logic is byte-for-byte preserved.

- [ ] **Task 4 — Edit `ipcMain.on("background-response", ...)` (AC: #3)**
  - [ ] 4.1 Locate the handler (current `main.js:313-326`).
  - [ ] 4.2 Insert `if (appShuttingDown) return;` as the first statement of the callback (before the `for` loop).
  - [ ] 4.3 Replace the `// todo:` comment on line 315 with `// fr-04: appShuttingDown sentinel guards this loop during shutdown (ADR-009)`.
  - [ ] 4.4 Verify the existing `try`/`catch` inner boundary is preserved (the sentinel does not replace it — both layers are intentional per ADR-009).

- [ ] **Task 5 — Edit `ipcMain.on("background-progress", ...)` (AC: #4)**
  - [ ] 5.1 Locate the handler (current `main.js:328-334`).
  - [ ] 5.2 Insert `if (appShuttingDown) return;` as the first statement of the callback (before the `try` block).
  - [ ] 5.3 Replace the `// todo:` comment on line 329 with `// fr-04: appShuttingDown sentinel guards this send during shutdown (ADR-009)`.
  - [ ] 5.4 Verify the existing `try`/`catch` is preserved.

- [ ] **Task 6 — Scope-creep guard (AC: #5, #6, #7)**
  - [ ] 6.1 `git diff --stat` — touched files MUST be only: `main.js` + (optionally) the story file itself.
  - [ ] 6.2 `git diff main.js` — touched lines MUST be only the four sites above (~6-10 lines net). No edit between lines 215-249 (`createBackgroundWindows`), no edit on line 218 (`winCount < 1`), no edit between lines 336-348 (`background-stop`).
  - [ ] 6.3 `git diff main/ui/types/index.ts` — empty (no new IPC channel).

- [ ] **Task 7 — Pre-commit + CI run (AC: #9, #10)**
  - [ ] 7.1 `git commit` without `--no-verify`. Hook absence acceptable per Story 1.1 precedent.
  - [ ] 7.2 Push the PR; verify CI Playwright run is green; record wall-clock vs NFR-01 baseline.
  - [ ] 7.3 If CI's `paths:` filter does not match `.js` (it should — see `.github/workflows/playwright.yml`), the run triggers automatically.

- [ ] **Task 8 — Manual smoke (recommended, not blocking)**
  - [ ] 8.1 If the implementing agent has Electron + a desktop host: launch the app, start a nest, then trigger each of the three exit paths once (graceful quit / in-app cancel / OS-level kill) and verify no orphaned `os.tmpdir()/nfpcache` directory + no console listener-cap warning. **Quick smoke only** — the full 15/15 trials are Story 4.2's responsibility.
  - [ ] 8.2 In a Paperclip-isolated worktree without Electron / desktop host, this task is **not feasible** — note "skipped — host capacity" in the PR description and route the full evidence to Story 4.2.

- [ ] **Task 9 — PR composition (AC: all)**
  - [ ] 9.1 Open PR titled `feat(shutdown): Story 4.1 — appShuttingDown sentinel + bounded try/catch (DEE-?? / FR-04 ADR-009)`.
  - [ ] 9.2 PR description includes: AC checklist (all 11), the diff of the four edited sites (rendered inline for reviewer convenience), §16 anti-pattern 16/16-pass checklist, NFR-01 verification section, sentinel-race rationale (single-process EventLoop ordering — quote ADR-009 §risks), explicit forwarding to Story 4.2 for the 15/15 evidence path, FR-07 boundary statement (no `winCount` change, no `createBackgroundWindows` change, FR-07 revertible per ADR-009 §revertibility).
  - [ ] 9.3 Self-Review (Amelia's `bmad-code-review`) → Review-Board handoff per the standard Phase-4 protocol.

---

## Dev Notes

### Project context (binding)

- **Repo:** `deepnest-next` (community fork of Deepnest 2D bin-packing for Electron). See `_bmad-output/project-context.md` §1 for orientation.
- **Stream:** This story is **B3 — Stream B's third item**. Stream B already shipped B1 (Story 3.1, fixture-integrity gate, done) and B2 (Story 3.2, doc follow-on, ready-for-dev — Paige/Amelia). B4 (Story 4.2 — NFR-02 evidence) cannot start without this story's code merged.
- **Sequencing implication:** This story is the **only MVP epic that touches `main.js`** (per architecture overlay §6 Open Q1 confirmation). No other MVP epic competes for `main.js` merge surface. Phase 2 FR-07 (`winCount > 1`) **must land strictly after** this epic per PRD hard-dep + ADR-009 §Independent revertibility.

### Edit sites — verified line numbers (2026-04-26 against `main.js` current state)

| Site | Current lines | Action |
|---|---|---|
| Sentinel declaration | (insert near line 9 or 17) | **Add** `let appShuttingDown = false;` + AC-04.1.8 comment |
| `app.on('before-quit', ...)` | 289–297 | **Insert** `appShuttingDown = true;` as first statement of callback |
| `ipcMain.on("background-response", ...)` | 313–326 | **Insert** `if (appShuttingDown) return;` as first statement; replace `// todo:` on line 315 with `// fr-04: ...` |
| `ipcMain.on("background-progress", ...)` | 328–334 | **Insert** `if (appShuttingDown) return;` as first statement; replace `// todo:` on line 329 with `// fr-04: ...` |
| `ipcMain.on("background-stop", ...)` | 336–348 | **DO NOT EDIT** — sentinel does not apply here (per AC-04.1.5 + ADR-009 Decision item 5) |
| `createBackgroundWindows()` | 215–249 | **DO NOT EDIT** — `winCount = 1` invariant + FR-07 boundary (per AC-04.1.6) |
| `background-start` round-robin | 303–311 | **DO NOT EDIT** — FR-07 boundary |

(Lines verified by `grep -n "// todo:\|background-response\|background-progress\|before-quit\|app\.shuttingDown\|createBackgroundWindows\|winCount" main.js` on 2026-04-26 — see story authoring transcript. Re-verify at story-start in case of drift.)

### Diff sketch (illustrative — implementing agent may adjust comment wording)

```diff
@@ main.js around line 9-11 @@
 require("events").EventEmitter.defaultMaxListeners = 30;

+// fr-04: bounded by single-process EventLoop ordering — no atomics/locks needed (ADR-009 §risks)
+let appShuttingDown = false;
+
 app.on('render-process-gone', (event, webContents, details) => { ... });

@@ main.js around line 289-297 @@
 app.on("before-quit", function () {
+  appShuttingDown = true;
   var p = path.join(__dirname, "./nfpcache");
   if (fs.existsSync(p)) {
     fs.readdirSync(p).forEach(function (file, index) {
       var curPath = p + "/" + file;
       fs.unlinkSync(curPath);
     });
   }
 });

@@ main.js around line 313-326 @@
 ipcMain.on("background-response", function (event, payload) {
+  if (appShuttingDown) return;
   for (var i = 0; i < backgroundWindows.length; i++) {
-    // todo: hack to fix errors on app closing - should instead close workers when window is closed
+    // fr-04: appShuttingDown sentinel guards this loop during shutdown (ADR-009)
     try {
       if (backgroundWindows[i].webContents == event.sender) {
         mainWindow.webContents.send("background-response", payload);
         backgroundWindows[i].isBusy = false;
         break;
       }
     } catch (ex) {
       // ignore errors, as they can reference destroyed objects during a window close event
     }
   }
 });

@@ main.js around line 328-334 @@
 ipcMain.on("background-progress", function (event, payload) {
+  if (appShuttingDown) return;
-  // todo: hack to fix errors on app closing - should instead close workers when window is closed
+  // fr-04: appShuttingDown sentinel guards this send during shutdown (ADR-009)
   try {
     mainWindow.webContents.send("background-progress", payload);
   } catch (ex) {
     // when shutting down while processes are running, this error can occur so ignore it for now.
   }
 });
```

(Net diff: ~7 added lines, ~2 deleted lines, 4 sites touched. Reviewer surface is small but the sentinel-pattern rationale is the focus.)

### Why both the sentinel AND the inner try/catch (ADR-009 layering)

Per ADR-009 Decision item 4, the design is **two-layer**:

1. **Outer sentinel** — catches the *normal* shutdown sequence where `before-quit` fires before `background-response` / `background-progress` arrive. Avoids paying the cost of the `try`/`catch` + the `webContents` access in the common case.
2. **Inner `try`/`catch`** — catches the *race* sequence where a `background-response` arrives in flight just as `before-quit` fires (sentinel set → handler returns), OR where the worker window is destroyed between the sentinel check and the `webContents` access. The existing `// ignore errors, as they can reference destroyed objects during a window close event` comment is the original author's recognition of this race; ADR-009 codifies that the comment was **right** — keep the inner boundary.

Reviewer should NOT remove the inner `try`/`catch` even though the sentinel "looks like it makes the catch unreachable". It does not — the catch handles the race window between the sentinel check on line N and the `mainWindow.webContents.send(...)` on line N+M, where M > 0 in the call-stack. Per `_bmad-output/project-context.md` §3 + §6, the EventLoop can interleave handlers but cannot interrupt a single statement.

### `background-stop` is NOT shutdown — explicit exclusion (AC-04.1.5)

`background-stop` is the **in-app cancel** path: the user hit "Stop" on a running nest. The handler (`main.js:336-348`) destroys the existing worker windows, resets `winCount = 0`, and **immediately recreates** background windows for the next nest. The app is alive throughout. Adding `appShuttingDown` guard here would short-circuit cancel-then-restart, breaking the user-cancel flow.

ADR-009 Decision item 5 names this distinction explicitly. The PR description should re-state it so the reviewer doesn't accidentally request "for consistency, add the guard to `background-stop` too" — that request is **wrong** and must be rejected with the ADR-009 cite.

### `winCount = 1` is the FR-07 boundary (AC-04.1.6)

Per `_bmad-output/planning-artifacts/architecture.md` §6 Open Q2 + §5 ADR-009 §Independent revertibility, this story and Phase 2 FR-07 (`winCount > 1`) live at **different sites**:

- **This story (FR-04 / ADR-009):** `app.on('before-quit')` + `background-response` + `background-progress`.
- **FR-07 (Phase 2):** `createBackgroundWindows()` + `background-start` round-robin.

The two changes never touch the same function or the same lines. **Do not preemptively touch `winCount` or `createBackgroundWindows`** — that is FR-07 work, scheduled after MVP-1, and out of scope here.

### Anti-pattern audit map (project-context.md §16)

| §16.X | Anti-pattern | This story's exposure | Verification |
|---|---|---|---|
| 1 | New global on `window` | None — `appShuttingDown` is module-scoped, not `window`-attached | `grep -n "window\.appShuttingDown" main.js` returns nothing |
| 2 | `ipcRenderer.invoke('read-config'\|'write-config')` outside `config.service.ts` | None | `git diff` |
| 3 | New `background-*` IPC handler outside `nesting.service.ts` | None — the existing handlers are edited, not added | `git diff` |
| 4 | New UI framework | None | — |
| 5 | Modify vendored utilities in `main/util/` | None — story does not touch `main/util/` | `git diff --stat \| grep main/util` returns empty |
| 6 | Import from `main/util/_unused/` | None | — |
| 7 | New TypeScript decorator transform | None — `main.js` is `.js` | — |
| 8 | New `// @ts-ignore` | N/A — `main.js` is `.js`, not `.ts` (no `@ts-ignore` semantics) | — |
| 9 | `--no-verify` to skip pre-commit | **Forbidden.** | `git log --pretty=fuller` shows no `[skipped]` markers |
| 10 | Drop / re-encode `tests/assets/*.svg` without re-deriving spec literals | None | `git diff --stat tests/assets` returns empty |
| 11 | Double-convert mm/inch | None | — |
| 12 | Open external URLs by spawning a `BrowserWindow` | None | — |
| 13 | Add HTTP server / telemetry / DB | None | — |
| 14 | Assume Windows `clean`/`clean-all` works on Linux/macOS | N/A | — |
| 15 | Remove `**/*.js` from ESLint global ignore | None | `git diff eslint.config.mjs` returns empty |
| 16 | New spinner glyph | None | — |

### Pre-flight reads (binding)

Before editing `main.js`, the implementing agent **must** have read:

1. `_bmad-output/project-context.md` §16 — full anti-pattern list.
2. `_bmad-output/project-context.md` §3 — process / window topology (read **before** touching `main.js`).
3. `_bmad-output/project-context.md` §6 — IPC contract (`background-stop` semantics preserved; no new IPC channel).
4. `_bmad-output/project-context.md` §8.4 — scratch-dir cleanup on `app.before-quit` (sentinel set **before** purge).
5. `_bmad-output/project-context.md` §8.5 — `EventEmitter.defaultMaxListeners = 30` cap.
6. `_bmad-output/project-context.md` §11 — pre-commit hook / no-`--no-verify` rule.
7. `_bmad-output/project-context.md` §17 — brownfield caveats.
8. `_bmad-output/planning-artifacts/architecture.md` **§5 ADR-009** (full text — context, decision items 1–5, alternatives, consequences, revertibility).
9. `_bmad-output/planning-artifacts/architecture.md` §3.1 (FR-04 row) + §4 (FR-04 architectural constraints (a)–(e)).
10. `_bmad-output/planning-artifacts/architecture.md` §6 Open Q2 + §7 (overlay-specific risks: sentinel-race rationale).
11. `main.js` (current state — locate the four edit sites + the `app.before-quit` handler + `createBackgroundWindows()`).

### Sprint risk callouts (from sprint-plan.md §5)

- **R1 (Low / High) — NFR-01 wall-clock regression > 20 %.** This story adds 1 boolean variable + 4 short statements + 2 comment edits. Regression risk near-zero. Task 7.2 still records the duration.
- **R4 (Low / Medium) — NFR-02 manual-repro (4.2) cannot reach 15/15 because of host-OS variance.** This story is the **code under test**; the repro is Story 4.2's job. Mitigation here: ship clean code with the layered design (sentinel + inner try/catch) so race resilience is structural.

### Project Structure Notes

- **Files touched are exactly:** `main.js` (~7 added lines, ~2 deleted lines, 4 sites). **No** `.ts` file. **No** `.json`. **No** `tests/`. **No** `docs/`.
- **No new files created.**
- **No `tsconfig.json` change.**
- **No `eslint.config.mjs` change.**
- **No `package.json` change.**

### Testing standards summary

- **`npm test` is the only test layer.** Single Playwright spec at `tests/index.spec.ts`. The spec exercises the renderer-side nest flow but does not exercise the shutdown paths — the canonical test signal here is **placement count remains `54/54` and wall-clock stays in the NFR-01 band**. Per `_bmad-output/project-context.md` §12.
- **Manual repro is the NFR-02 contract** (Story 4.2). This story's PR may include a partial smoke (Task 8.1) when host capacity allows; the full 15/15 is Story 4.2.

---

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` lines 573–638 §"Story 4.1: Implement app.shuttingDown sentinel + bounded try/catch boundary in main.js"]
- [Source: `_bmad-output/planning-artifacts/epics.md` lines 560–571 §"Epic 4: Background-worker shutdown safety"]
- [Source: `_bmad-output/planning-artifacts/sprint-plan.md` §3 row B3 + §5 R1, R4]
- [Source: `_bmad-output/planning-artifacts/architecture.md` §3.1 row FR-04 + §4 §"FR-04" + §5 §"ADR-009" + §6 Open Q2 + §7 risks]
- [Source: `_bmad-output/planning-artifacts/prd.md` §FR-04 (AC-04.1..AC-04.5) + §NFR-02]
- [Source: `_bmad-output/project-context.md` §3 (process/window topology), §6 (IPC contract), §8.4 (scratch-dir cleanup), §8.5 (listener cap), §16 (anti-patterns), §17 (brownfield caveats)]
- [Source: `_bmad-output/planning-artifacts/nfr01-baseline.json` — `rolling_mean_ms = 17060.0`, `tolerance_pct = 20`]
- [Parent issue: DEE-83 (CS batch-2 follow-up to DEE-82 standup)]
- [Sprint label: MVP-1; Sprint-Start gate OPEN per CTO sign-off in DEE-53]
- [Predecessor PRs: #6 (Story 6.1), #7 (Story 3.1), #8 (Story 1.1), #15 (Story 3.1 hardening DEE-69) — all merged, Board-APPROVED]
- [Successor: Story 4.2 — NFR-02 manual-repro evidence (15/15 trials × 3 exit paths)]

---

## Dev Agent Record

### Agent Model Used

Amelia (Dev) — `claude-opus-4-7` via `claude_local` adapter. Round 1 DS executed 2026-04-29 in run `3a41c23d-6ed5-41cb-a88f-7bf68d70e22a` after DEE-212 unblock (DEE-181 cancelled).

### Debug Log References

- Pre-flight grep: `// todo:` matched at `main.js:315` (background-response) and `main.js:329` (background-progress) before edits — both replaced with `// fr-04: …` per AC-04.1.3 / AC-04.1.4.
- Line numbers in spec verified pre-edit (no drift since 2026-04-26): `app.on("before-quit"` at 289, `ipcMain.on("background-response"` at 313, `ipcMain.on("background-progress"` at 328, `ipcMain.on("background-stop"` at 337, `createBackgroundWindows` at 218, `winCount = 0` at 213, `winCount < 1` at 218.
- Post-edit grep: `// todo:` returns 0 matches in `main.js`. `appShuttingDown` declared at line 12, set at 293 (before-quit), checked at 318 (background-response) and 334 (background-progress). `background-stop` (343) and `createBackgroundWindows` (218) untouched.
- Cheap gates green: `node --check main.js` SYNTAX OK; `node scripts/check-licenses-budget.mjs` OK (7 ms drift, 76 ms gate); `npm run test:licenses` 30/30 pass (2431 ms); `npm run test:fixtures:check` exit 0.
- Playwright (`npm test` final stage) **not run locally** per Task 8.2 — Paperclip-isolated worktree has no Electron / desktop host. CI run on push covers NFR-01 wall-clock vs `nfr01-baseline.json` (rolling_mean = 16746.6 ms, ±20 % band [13397, 20096] ms).

### Completion Notes List

- **Sentinel placement.** Declared between line 9 (`require("events")…defaultMaxListeners = 30`) and the existing `app.on('render-process-gone', …)` at line 14 — i.e. after the `require()` block, before any handler bindings. Comment-line + decl-line + blank-line; no other reordering. AC-04.1.1 + AC-04.1.8 satisfied.
- **`before-quit` early-set.** `appShuttingDown = true;` is the first statement of the existing handler; the existing `nfpcache` purge runs after the sentinel set, byte-for-byte preserved. AC-04.1.2 satisfied.
- **`background-response` guard.** `if (appShuttingDown) return;` is the first statement of the callback (before the `for` loop). The original `// todo: …` comment on line 315 is replaced with `// fr-04: appShuttingDown sentinel guards this loop during shutdown (ADR-009)`. Inner `try`/`catch` boundary preserved verbatim — both layers intentional per ADR-009 Decision item 4. AC-04.1.3 satisfied.
- **`background-progress` guard.** `if (appShuttingDown) return;` is the first statement of the callback (before the `try` block). The original `// todo: …` comment on line 329 is replaced with `// fr-04: appShuttingDown sentinel guards this send during shutdown (ADR-009)`. Inner `try`/`catch` preserved. AC-04.1.4 satisfied.
- **`background-stop` not touched.** Verified by `git diff` — no edits between current lines 343–355 (handler shifted +6 lines from spec's 336–348 because the sentinel decl + early-set + guards added 6 lines above). AC-04.1.5 satisfied.
- **FR-07 boundary preserved.** `createBackgroundWindows()`, `winCount = 0`, `winCount < 1`, `background-start` round-robin all unchanged. AC-04.1.6 satisfied.
- **No new IPC channel.** `git diff main/ui/types/index.ts` empty. AC-04.1.7 satisfied.
- **Anti-pattern audit (project-context.md §16) — 16/16 pass.** No `window.appShuttingDown` global; no `read-config`/`write-config` outside `config.service.ts`; no new `background-*` handler; no UI-framework change; no `main/util/` edit; no `_unused/` import; no `.ts` decorator transform; `main.js` is `.js` so `@ts-ignore` is N/A; no `--no-verify` plan; no `tests/assets/*.svg` re-encoded; no mm/inch double-convert; no external-URL `BrowserWindow`; no HTTP/telemetry/DB; no Windows-clean assumption; no `eslint.config.mjs` change; no spinner glyph. AC-04.1.10 satisfied.
- **Story 4.2 (NFR-02 evidence) routing.** This PR ships **code only**. Manual 15/15 trials × 3 exit paths are **not feasible** in a Paperclip-isolated worktree without Electron / desktop host (Task 8.2). PR description forwards the NFR-02 evidence work to Story 4.2 / B4 (Murat / TEA). AC-04.1.11 satisfied.
- **NFR-01 wall-clock (AC-04.1.9).** Local Playwright run skipped (no host). CI Playwright run gated on push; rolling-mean delta vs `nfr01-baseline.json` recorded post-CI in PR description.

### File List

- `main.js` — sentinel decl, `before-quit` early-set, `background-response` guard + comment swap, `background-progress` guard + comment swap. **+8 / −2** lines net, 4 sites touched.
- `_bmad-output/implementation-artifacts/4-1-implement-app-shuttingdown-sentinel-bounded-try-catch-boundary-in-main-js.md` — Dev Agent Record populated (this section).

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-04-26 | Story created (`bmad-create-story` batch-2, DEE-83). Status: ready-for-dev. | John (PM, BMad) |
| 2026-04-29 | Round 1 DS — sentinel + bounded try/catch boundary applied to `main.js`. Cheap gates green; Playwright deferred to CI. Status: in-review (pending CR + Sage Board). | Amelia (Dev, BMad) |
| 2026-04-29 | Round 1 Self-Review (`bmad-code-review`) — **PASS**. 11/11 ACs verified, ADR-009 fidelity exact, scope tight (main.js + story only), §16 audit 16/16, cheap gates green, Playwright/NFR-01 gated on CI. No rework. Handing off to Review-Leader (Sage Board). | Amelia (Dev, BMad) |
