# NFR-02 Evidence Template — Manual Exit-Path Repro

> Authored by Murat (TEA) on 2026-04-29 via `tea-trace` for DEE-222 (Story 4.1 / B4 contract).
> R-K2 ack pre-DS: this stub closes the kickoff §5 R-K2 scaffolding gap. Story 4.2 / any host-capable
> runner fills in the result table per trial and re-commits.

---

## Purpose

Capture **3 paths × 5 trials = 15 trials** of manual exit-path verification for the
`appShuttingDown` sentinel + bounded try/catch boundary shipped by Story 4.1
(PR [#48](https://github.com/Dexus-Forks/deepnest-next/pull/48), commit `1f4b057`).

Three exit paths under test (FR-04 AC-04.1.1..AC-04.1.11; ADR-009 §Decision items 2–5):

1. **Path A — Normal-quit.** User triggers graceful quit (`File → Quit`, `Cmd/Ctrl+Q`,
   or window-close) while a nest is in flight. Sentinel flips first; in-flight
   `background-response` / `background-progress` callbacks short-circuit.
2. **Path B — BG-window-error.** A background worker crashes (`webContents`
   destroyed) during a nest; remaining workers finish or error, then quit. Sentinel
   prevents fan-out to a destroyed mainWindow.
3. **Path C — Progress-channel-error.** `mainWindow.webContents.send` raises
   (e.g. mainWindow destroyed mid-nest). Inner `try`/`catch` swallows the error;
   no second crash, no orphan scratch dir.

---

## Pre-conditions per trial

- Build: post-merge `main` at `1f4b05756c8cfddcf558000bd01b7c60cc493af5` (or later).
- Host: Electron desktop with display (Linux+xvfb / macOS / Windows). **Paperclip-isolated worktrees
  cannot run this template** (no Electron/desktop host per Story 4.1 Task 8.2).
- Fixture nest: same SVG + part-set across all 15 trials. Use any reproducible
  part-set SVG accepted by the importer; the in-repo `tests/assets/henny-penny.svg`
  fixture is a viable default. Whatever fixture is chosen, hold it constant across
  all 15 trials.
- Scratch-dir watch: `os.tmpdir()/nfpcache` listed before each trial; expected empty
  after each trial (existing `before-quit` purge runs after the sentinel flips).

---

## Result table (fill per trial)

| # | Path | Trial | Wall-clock (s) | Listener-cap warn? | Orphan `nfpcache/` after quit? | Console errors? | Result |
|---|------|-------|----------------|--------------------|--------------------------------|-----------------|--------|
| 1 | A    | 1     |                |                    |                                |                 |        |
| 2 | A    | 2     |                |                    |                                |                 |        |
| 3 | A    | 3     |                |                    |                                |                 |        |
| 4 | A    | 4     |                |                    |                                |                 |        |
| 5 | A    | 5     |                |                    |                                |                 |        |
| 6 | B    | 1     |                |                    |                                |                 |        |
| 7 | B    | 2     |                |                    |                                |                 |        |
| 8 | B    | 3     |                |                    |                                |                 |        |
| 9 | B    | 4     |                |                    |                                |                 |        |
|10 | B    | 5     |                |                    |                                |                 |        |
|11 | C    | 1     |                |                    |                                |                 |        |
|12 | C    | 2     |                |                    |                                |                 |        |
|13 | C    | 3     |                |                    |                                |                 |        |
|14 | C    | 4     |                |                    |                                |                 |        |
|15 | C    | 5     |                |                    |                                |                 |        |

PASS criteria for each row: orphan = **No**, listener-cap warn = **No**, console-error = **No**.
Wall-clock comparison (NFR-01 coupling): trial mean must be within ±20% of
`_bmad-output/planning-artifacts/nfr01-baseline.json` `rolling_mean_ms`
(post-Story-2.3 baseline = **17 060 ms ± 20 % = [13 648, 20 472] ms**).

---

## Repro recipes

### Path A — Normal-quit

1. `npm run start` (or platform Electron launcher).
2. Open the fixture SVG; click **Start nest**.
3. Within ~2 s of nest start, trigger graceful quit (menu / shortcut).
4. Observe: app exits cleanly, no console error, no `nfpcache/` orphan.

### Path B — BG-window-error

1. `npm run start`. Click **Start nest** on fixture SVG.
2. From a separate terminal, kill one BG worker:
   - **Linux / macOS**: `pkill -9 -f "deepnest.*background"`
   - **Windows (PowerShell)**: `Get-Process | Where-Object { $_.MainWindowTitle -match 'deepnest.*background' -or $_.ProcessName -match 'deepnest' } | Select-Object -First 1 | Stop-Process -Force`
   - **Windows (cmd)**: `for /f "tokens=2" %i in ('tasklist /fi "imagename eq deepnest.exe" /fo list ^| find "PID:"') do taskkill /PID %i /F`
3. Allow remaining workers to finish; observe console for `Render process gone`
   handler firing (already at `main.js:14`). Quit normally.
4. Observe: no second crash via the destroyed `webContents`; sentinel guards the
   remaining `background-response`/`background-progress` deliveries.

### Path C — Progress-channel-error

1. `npm run start`. Click **Start nest** on fixture SVG.
2. Within ~1 s, close the main window without quit (X button on most platforms).
3. Allow the in-flight progress packets to flush; the inner `try`/`catch` at
   `main.js:336` and `main.js:319` catches the destroyed-mainWindow throws.
4. Quit. Observe: no orphan, no console error, app terminates.

---

## Sign-off

- Runner identity: <agent / human + host OS>
- Build SHA: `1f4b05756c8cfddcf558000bd01b7c60cc493af5` (or later post-merge)
- Date: <YYYY-MM-DD>
- Result: PASS / CONCERN / FAIL — paste rationale below.
- Filed evidence: <path to filled-in copy under `projects/deepnest-next/evidence/`>

---

## Provenance

- Story spec: `_bmad-output/implementation-artifacts/4-1-implement-app-shuttingdown-sentinel-bounded-try-catch-boundary-in-main-js.md`
- ADR: `_bmad-output/planning-artifacts/architecture.md` §5 ADR-009
- NFR-01 baseline: `_bmad-output/planning-artifacts/nfr01-baseline.json`
- Sprint plan §5 risk row: `_bmad-output/planning-artifacts/sprint-plan.md` §5 R4 (15/15 reach across host-OS variance)
